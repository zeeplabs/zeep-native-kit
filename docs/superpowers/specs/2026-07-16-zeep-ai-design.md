# zeep-ai: Local AI Integration Crate — Design

Status: draft
Date: 2026-07-16
Related: M4 (roadmap), D15 (shell_run_stream decision)

## Problem

M4 (per ROADMAP.md) requires a `zeep-ai` crate providing local AI CLI detection, a streaming AI runner with process-group cancellation, AIText utilities, and React AI components. Today there is zero code for it. D15 resolved Q05: AI streaming should extend `zeep-core::ShellRunner`'s pattern, but a separate `AIRunner` with `libc::killpg` is preferred for clean subprocess cancellation.

### CLIs to support

| CLI | Binary | Detected via | Flag for prompt |
|-----|--------|-------------|-----------------|
| Claude (Anthropic) | `claude` | `which claude` | `-p` (or stdin) |
| Codex / OpenCodex | `codex` | `which codex` | `-i` (stdin) |
| Ollama | `ollama` | `which ollama` | `run <model>` |
| LLM (SimonW) | `llm` | `which llm` | `-t` (stdin) |
| OpenCode | `opencode` | `which opencode` | `-p` (stdin) |

## Goals

- CLI detection: scan PATH for the 5 binaries, cache results in PrefsStore, expose `ai_detect_providers` command.
- AI Runner: spawn CLIs with process group isolation, support streaming (per-line Tauri events) and blocking (full response) modes, support cancel via SIGTERM → SIGKILL with timeout.
- ProviderAdapter trait: per-CLI flag mapping so the runner is provider-agnostic.
- `@zeep/ai` npm package: AIText utilities (pure TS functions) + 4 React components (AIProviderStatus, AIPromptInput, AIResponseStream, AIProviderPicker) + `useAI()` hook.
- Tauri commands: `ai_detect_providers`, `ai_run`, `ai_run_stream`, `ai_cancel`.
- Demo app: AI section in UIGallery with provider picker, prompt input, and streaming response display.

## Non-goals

- OpenAI / Anthropic direct HTTP API calls — CLIs only, no API keys.
- Function calling / tool use orchestration.
- Embeddings or vector search.
- Fine-tuning or model management.
- Bundled WASM AI model.

## Design

### Crate structure

New crate `src-tauri/crates/zeep-ai/`, workspace member alongside `zeep-core`/`zeep-kit`/`zeep-logger`/`zeep-updater`:

```toml
[package]
name = "zeep-ai"
description = "Local AI CLI integration for zeep-native-kit Tauri apps"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
authors.workspace = true

[dependencies]
tauri.workspace = true
zeep-core = { path = "../zeep-core", features = ["prefs"] }
serde.workspace = true
serde_json.workspace = true
tokio = { workspace = true, features = ["process"] }
libc = "0.2"
```

### CLI Detection (`detector.rs`)

```rust
const CANDIDATES: &[&str] = &["claude", "codex", "ollama", "llm", "opencode"];

#[derive(Debug, Clone, Serialize)]
pub struct DetectedProvider {
    pub name: String,
    pub binary: String,
    pub version: Option<String>,
}

pub fn detect() -> Vec<DetectedProvider> {
    CANDIDATES.iter().filter_map(|name| {
        let binary = std::process::Command::new("which")
            .arg(name)
            .output().ok()
            .filter(|o| o.status.success())
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_string())?;

        let version = std::process::Command::new(&binary)
            .arg("--version")
            .output().ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.lines().next().unwrap_or("").to_string())
            .filter(|s| !s.is_empty());

        Some(DetectedProvider { name: name.to_string(), binary, version })
    }).collect()
}
```

Detection runs on first call (not cached at app boot). Results cached in PrefsStore under key `zeep_ai.detected_providers` as JSON array.

### ProviderAdapter (`adapter.rs`)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunOpts {
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub system: Option<String>,
}

All CLIs accept prompts via stdin. This avoids shell interpolation and command-line length limits (SEC-01). The adapter sets up args/flags and writes the prompt to stdin.

```rust
pub trait ProviderAdapter: Send + Sync {
    fn name(&self) -> &'static str;
    /// Returns (command, args). Prompt is piped via stdin.
    fn build_command(&self, binary: &str, opts: &RunOpts) -> (String, Vec<String>);
}

pub struct ClaudeAdapter;
impl ProviderAdapter for ClaudeAdapter {
    fn build_command(&self, binary: &str, opts: &RunOpts) -> (String, Vec<String>) {
        let mut args = vec!["-p".into()];
        if let Some(system) = &opts.system {
            args.extend(["--system".into(), system.clone()]);
        }
        (binary.into(), args)
    }
}

pub struct OllamaAdapter;
impl ProviderAdapter for OllamaAdapter {
    fn build_command(&self, binary: &str, opts: &RunOpts) -> (String, Vec<String>) {
        let mut args = vec!["run".into(), opts.model.as_deref().unwrap_or("llama3.2").into()];
        (binary.into(), args)
    }
}
// ... CodexAdapter (−i), LlmAdapter (−t), OpencodeAdapter (−p)
```

Adapters registered in a `HashMap<&'static str, Box<dyn ProviderAdapter>>` inside the runner.

### AI Runner (`runner.rs`)

```rust
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tokio::process::Command;

type RunId = u64;

struct RunState {
    child: tokio::process::Child,
    pgid: i32,  // process group ID (negative of PGID for killpg)
}

pub struct AIRunner {
    next_id: AtomicU64,
    runs: Arc<Mutex<HashMap<RunId, RunState>>>,
}
```

#### Spawning (with process group)

```rust
impl AIRunner {
    pub async fn run_stream(
        &self,
        adapter: &dyn ProviderAdapter,
        binary: &str,
        prompt: &str,
        opts: &RunOpts,
        app_handle: AppHandle,
    ) -> Result<RunId, String> {
        let mut cmd = adapter.build_command(binary, prompt, opts);
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        // SAFETY: we set the process group before exec
        unsafe {
            cmd.pre_exec(|| {
                libc::setsid();
                Ok(())
            });
        }

        let mut child = cmd.spawn().map_err(|e| e.to_string())?;
        let pgid = child.id().try_into().unwrap_or(0); // child PID == PGID after setsid
        let run_id = self.next_id.fetch_add(1, Ordering::Relaxed);

        let stdout = child.stdout.take().unwrap();
        let run_id_clone = run_id;

        // Store child for cancellation
        self.runs.lock().unwrap().insert(run_id, RunState { child, pgid });

        // Spawn reader task
        tokio::spawn(async move {
            use tokio::io::AsyncBufReadExt;
            let reader = tokio::io::BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_handle.emit("ai:chunk", serde_json::json!({
                    "runId": run_id_clone,
                    "text": line,
                }));
            }
            let _ = app_handle.emit("ai:done", serde_json::json!({
                "runId": run_id_clone,
            }));
        });

        Ok(run_id)
    }

    pub fn cancel(&self, run_id: RunId) -> Result<(), String> {
        let state = self.runs.lock().unwrap().remove(&run_id)
            .ok_or("run not found")?;

        // Kill entire process group (children included)
        let result = unsafe { libc::killpg(state.pgid, libc::SIGTERM) };
        if result != 0 {
            return Err("failed to kill process group".into());
        }

        // Force kill after 2s timeout
        let pgid = state.pgid;
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            unsafe { libc::killpg(pgid, libc::SIGKILL); }
        });

        Ok(())
    }
}
```

Key design points:
- `setsid()` creates a new session with the child as session leader → all children of the CLI inherit the same PGID
- `killpg(-pgid, SIGTERM)` sends SIGTERM to the entire process group
- After 2s timeout, SIGKILL ensures cleanup
- Stdout lines emitted as `ai:chunk` events for streaming
- Blocking mode (`ai_run`) collects all lines and returns at once

### Tauri plugin

`zeep-ai` registers as a Tauri plugin named `"zeep-ai"` with:

```rust
PluginBuilder::<R>::new("zeep-ai")
    .setup(move |app, _api| {
        let runner = Arc::new(AIRunner::new());
        app.manage(runner);
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        ai_detect_providers,
        ai_run,
        ai_run_stream,
        ai_cancel,
    ])
    .build()
```

Commands:
- `ai_detect_providers()` → `Vec<DetectedProvider>` (reads/writes PrefsStore)
- `ai_run(provider, prompt, opts?)` → `String` (full response)
- `ai_run_stream(provider, prompt, opts?)` → `RunId` (emits events)
- `ai_cancel(run_id)` → `()`

### AIText Utilities (`@zeep/ai/utils`)

Pure TypeScript functions in `packages/@zeep/ai/src/utils.ts`:

```typescript
export function stripFences(text: string): string — remove leading/trailing ```
export function firstLine(text: string): string — first non-empty line
export function truncate(text: string, maxChars: number): string — word-boundary truncation with …
export function extractJson(text: string): unknown — try to parse JSON from prose-surrounded text
```

### React Components (`@zeep/ai`)

| Component | Purpose |
|-----------|---------|
| `AIProviderStatus` | Shows detected providers with StatusDot (online/offline) |
| `AIPromptInput` | Styled textarea with send button, loading spinner during stream |
| `AIResponseStream` | Renders streaming text word-by-word with cursor blink |
| `AIProviderPicker` | Dropdown to select active provider when multiple detected |

### `useAI()` Hook

```typescript
function useAI() {
  const [providers, setProviders] = useState<DetectedProvider[]>([]);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<'idle'|'running'|'error'>('idle');
  const [error, setError] = useState<string|null>(null);
  const currentRunId = useRef<number|null>(null);

  async function detect(): Promise<void> — invoke ai_detect_providers
  async function run(provider: string, prompt: string): Promise<void> — invoke ai_run_stream, listen ai:chunk/ai:done
  function cancel(): void — invoke ai_cancel(currentRunId)

  return { providers, output, status, error, detect, run, cancel };
}
```

### Error handling

- Detection never errors — unavailable CLIs = empty Vec, not a crash
- Runner errors surfaced via `ai:error` event and command `Result`
- Prompt passed as CLI argument or stdin, NEVER shell-interpolated (SEC-01)
- Output rendered via MarkdownRenderer (sanitized, SEC-03)

### Testing

- Unit: `ProviderAdapter::build_command` for each provider
- Unit: AIText utility functions (pure)
- Unit: Runner cancel synchronization (mock child)
- Integration: spawn real `claude --version` in CI if binary present; skip otherwise
- React: component smoke tests (render without crashing, essential behavior)

## Open follow-ups (not in this change)

- AIPromptInput multi-turn conversation history — deferred until a consumer needs it.
- Token counting / cost estimation — depends on CLI, not universal.
- Provider priority/auto-select — pick first detected for now.
