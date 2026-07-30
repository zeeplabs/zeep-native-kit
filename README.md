# zeep-native-kit

**Desenvolvimento desktop-first para apps Tauri v2 + React + Rust.**

zeep-native-kit dá a qualquer app Tauri um baseline polished em uma chamada — design system premium, comandos Rust prontos (keychain, prefs, shell), logger estruturado, auto-updater, e integração com AI local (sem API key).

```rust
// main.rs — app Tauri completo com zeep-native-kit
fn main() {
    zeep_kit::Builder::new()
        .namespace("dev.myapp")
        .log_dev()
        .updater("your-public-key-hex")
        .install(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

```tsx
// App.tsx — frontend com design system + todos os módulos
import { ZeepProvider, Button, LogViewer, useUpdater } from '@zeep/kit';

function App() {
  return (
    <ZeepProvider>
      <Button variant="primary">Hello zeep</Button>
    </ZeepProvider>
  );
}
```

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | Tauri v2 |
| Frontend | React 18+ / TypeScript |
| Styling | CSS custom properties (`--zeep-*`) |
| Bundler | Vite 5+ |
| Rust | Stable 1.80+ |
| Package manager | pnpm (monorepo) |
| Testing (UI) | Vitest + Testing Library |
| Testing (Rust) | `cargo test` |
| Release | Changesets + GitHub Actions |

## Quick Start

### From scratch

```bash
pnpm add @zeep/kit
```

Add to your `Cargo.toml`:
```toml
[dependencies]
zeep-kit = "1.0"
```

Wire it up:
```rust
zeep_kit::Builder::new()
    .namespace("dev.myapp")
    .install(tauri::Builder::default())
    .run(tauri::generate_context!())
    .expect("error running app");
```

### With logger + updater + AI

```rust
zeep_kit::Builder::new()
    .namespace("dev.myapp")
    .log_dev()                        // dev: stdout + webview, Debug level
    // .log_prod()                    // prod: file rotation, Info level
    .updater("your-public-key-hex")   // enable auto-updates
    .install(tauri::Builder::default())
    .run(tauri::generate_context!())
    .expect("error running app");
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                  apps/demo                   │
│          (Tauri app + React gallery)         │
└──────┬──────┬──────┬──────┬──────┬──────────┘
       │      │      │      │      │
┌──────▼┐ ┌──▼──┐ ┌─▼───┐ ┌─▼───┐ ┌─▼───────┐
│@zeep/ │ │@zeep│ │@zeep│ │@zeep│ │@zeep/   │
│core   │ │/ui  │ │/log │ │/upd │ │ai       │
│(invoke│ │     │ │ger  │ │ater │ │(useAI,  │
│wraps) │ │     │ │     │ │     │ │comps)   │
└───────┘ └─────┘ └─────┘ └─────┘ └─────────┘
       ┌─────────────────────────────────────┐
       │          @zeep/kit (barrel)          │
       │   re-exporta todos os packages       │
       └─────────────────────────────────────┘

┌──────────┐┌──────────┐┌──────────┐┌────────┐
│zeep-core  ││zeep-log  ││zeep-upd  ││zeep-ai │
│(Prefs,   ││ger       ││ater      ││(detect,│
│Keychain, ││(struct   ││(semver   ││runner, │
│Shell)    ││logs,     ││gate,     ││adapters)│
│          ││rotation) ││commands) ││        │
└──────────┘└──────────┘└──────────┘└────────┘
       ┌─────────────────────────────────────┐
       │        zeep-kit (umbrella crate)     │
       │   Builder + install() API            │
       └─────────────────────────────────────┘
```

### Rust Crates

| Crate | Description |
|-------|-------------|
| `zeep-core` | `PrefsStore` (JSON), `Keychain` (macOS/Windows/Linux), `ShellRunner` (PATH-resolved, streaming) |
| `zeep-kit` | Umbrella `Builder`. `.namespace()` / `.log_dev()` / `.updater()` / `.install()` |
| `zeep-logger` | Structured JSON logging via `fern`. Ring buffer (1000 entries), file rotation, `logger_set_level`/`logger_get_entries` |
| `zeep-updater` | Wraps `tauri-plugin-updater` with semver gate (stable-only, strictly newer). `check`/`download`/`install`/`download_and_install` |
| `zeep-ai` | CLI detection (claude/codex/ollama/llm/opencode), `AIRunner` with process group kill (`libc::setsid`/`killpg`), streaming via Tauri events |

### npm Packages

| Package | Description |
|---------|-------------|
| `@zeep/kit` | Barrel — re-exports all packages below |
| `@zeep/core` | TypeScript wrappers for Tauri commands (`prefsGet`, `keychainSet`, `shellRun`, etc.) |
| `@zeep/ui` | Design system: `ZeepProvider`, `Button`, `GlassCard`, `AnimatedBackground`, `MarkdownRenderer`, etc. |
| `@zeep/logger` | `LogViewer` (virtualized, filter, export JSON), `LogLevelSelector`, `useLogEvents` |
| `@zeep/updater` | `UpdateBanner`, `UpdateProgress`, `UpdateReadyDialog`, `useUpdater` |
| `@zeep/ai` | `useAI` hook, `AIProviderStatus`, `AIPromptInput`, `AIResponseStream`, `AIProviderPicker`, AIText utilities |

## Modules

### Prefs (`zeep-core`)

Namespace-scoped JSON preferences stored at `{app_data_dir}/{namespace}.json`.

```rust
use zeep_core::prefs::PrefsStore;

let store = PrefsStore::new("myapp", app_data_dir);
store.set("theme".into(), serde_json::json!("dark"));
let theme: Option<serde_json::Value> = store.get("theme");
store.delete("theme");
let all = store.get_all();
```

**Frontend:**
```typescript
import { prefsGet, prefsSet } from '@zeep/kit';

await prefsSet('theme', 'dark');
const theme = await prefsGet('theme');
```

### Keychain (`zeep-core`)

Secure credential storage via `keyring` crate (macOS Keychain, Windows Credential Manager, Linux Secret Service).

```rust
use zeep_core::keychain::Keychain;

let kc = Keychain::new("dev.zeep.myapp");
kc.set("api-token", "sk-xxx")?;
let token: Option<String> = kc.get("api-token")?;
kc.delete("api-token")?;
```

### Shell (`zeep-core`)

PATH-resolved command execution with streaming support. Resolves binaries manually (Tauri sandbox doesn't inherit full PATH on macOS).

```rust
use zeep_core::shell::ShellRunner;

let runner = ShellRunner::new("/my/cwd");
let output = runner.run("node", &["--version"], None, None).await?;
// ShellOutput { stdout, stderr, exitCode }

runner.run_stream("node", &["script.js"], None, None).await?;
// Emits Tauri events shell:stdout / shell:stderr / shell:done
```

### Logger (`zeep-logger`)

Structured JSON-per-line logging via `fern`. File rotation, ring buffer for live UI.

```rust
zeep_logger::Builder::development()   // stdout + webview, Debug
    .build::<Wry>()                   // or production()

// Or via zeep_kit:
zeep_kit::Builder::new()
    .log_dev()
    // .log_prod()
    .install(tauri::Builder::default());
```

Commands: `logger_set_level(level: u8)` — change log level at runtime. `logger_get_entries()` — pull recent 1000 entries.

**Frontend:**
```tsx
import { LogViewer, LogLevelSelector, useLogEvents } from '@zeep/kit';

function DevPanel() {
  const logEvents = useLogEvents();
  return (
    <>
      <LogLevelSelector />
      <LogViewer logEvents={logEvents} maxHeight={400} />
    </>
  );
}
```

### Updater (`zeep-updater`)

Auto-update integration via `tauri-plugin-updater` with semver gate (only stable releases, strictly newer).

```rust
zeep_updater::Builder::new()
    .pubkey("hex-public-key")
    .build::<Wry>()
```

Commands: `check`, `download_and_install`, `download`, `install` (exposed by `tauri-plugin-updater`).

**Frontend:**
```tsx
import { useUpdater, UpdateBanner, UpdateProgress, UpdateReadyDialog } from '@zeep/kit';

function UpdateManager() {
  const updater = useUpdater();

  return (
    <>
      <Button onClick={updater.check}>Check for Updates</Button>
      {updater.state.status === 'available' && (
        <UpdateBanner
          version={updater.state.updateInfo!.version}
          notes={updater.state.updateInfo!.body}
          onInstall={updater.install}
          onDismiss={updater.dismiss}
        />
      )}
      {updater.state.status === 'downloading' && (
        <UpdateProgress
          downloaded={updater.state.downloaded}
          contentLength={updater.state.contentLength}
        />
      )}
      {updater.state.status === 'ready' && (
        <UpdateReadyDialog
          onRestart={updater.restart}
          onDismiss={updater.dismiss}
        />
      )}
    </>
  );
}
```

### AI (`zeep-ai`)

Local AI CLI integration. Detects CLIs in PATH, runs them with process group isolation for clean cancellation.

```rust
zeep_ai::Builder::build()
```

Commands: `ai_detect_providers` → `Vec<DetectedProvider>`, `ai_run`/`ai_run_stream`/`ai_cancel`.

**Frontend:**
```tsx
import { useAI, AIProviderPicker, AIPromptInput, AIResponseStream } from '@zeep/kit';

function AIPanel() {
  const ai = useAI();

  return (
    <>
      <Button onClick={ai.detect}>Detect AI CLIs</Button>
      {ai.providers.length > 0 && (
        <>
          <AIProviderPicker
            providers={ai.providers}
            value={selected}
            onChange={setSelected}
          />
          <AIPromptInput onSend={(p) => ai.run(selected, p)} />
          <AIResponseStream text={ai.output} isStreaming={ai.status === 'running'} />
          <Button onClick={ai.cancel}>Cancel</Button>
        </>
      )}
    </>
  );
}
```

### UI (`@zeep/ui`)

9 components + design token system with 5 accent themes (violet, ocean, sunset, forest, graphite).

```tsx
import { ZeepProvider, Button, GlassCard, AnimatedBackground,
         ShimmerText, StatusDot, ToastProvider, useToast,
         Skeleton, MarkdownRenderer, SearchHighlight } from '@zeep/kit';

function App() {
  return (
    <ZeepProvider>
      <ToastProvider>
        <GlassCard>
          <ShimmerText>Welcome</ShimmerText>
          <Button variant="primary">Get Started</Button>
        </GlassCard>
      </ToastProvider>
    </ZeepProvider>
  );
}
```

## Migration Guide: Raw Tauri → zeep-native-kit

### Step 1: Add dependencies

**Before (raw Tauri):**
```toml
# Cargo.toml
[dependencies]
tauri = "2"
serde = "1"
serde_json = "1"
```

```json
// package.json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "react": "^18"
  }
}
```

**After (with zeep-native-kit):**
```toml
# Cargo.toml
[dependencies]
zeep-kit = "1.0"
tauri = "2"
```

```json
// package.json
{
  "dependencies": {
    "@zeep/kit": "^1.0",
    "@tauri-apps/api": "^2",
    "react": "^18"
  }
}
```

### Step 2: Replace manual wiring

**Before — manually wiring prefs, keychain, shell, logger, updater:**
```rust
// main.rs — ~35 lines of manual wiring
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([Target::new(TargetKind::Stdout)])
            .build())
        .setup(|app| {
            let prefs = Arc::new(RwLock::new(PrefsStore::new("myapp", ...)));
            app.manage(prefs);
            // ... keychain, shell, etc.
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            prefs_get, prefs_set, ...
        ])
        .run(tauri::generate_context!())
        .expect("error");
}
```

**After — one call:**
```rust
// main.rs — 6 lines
fn main() {
    zeep_kit::Builder::new()
        .namespace("dev.myapp")
        .log_dev()
        .install(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

### Step 3: Replace capabilities

**Before — manual capability declarations per command:**
```json
{
  "permissions": [
    "core:default",
    "allow-prefs-get",
    "allow-prefs-set",
    "allow-keychain-get",
    "allow-shell-which",
    ...
  ]
}
```

**After — plugin permissions auto-declared:**
```json
{
  "permissions": [
    "core:default",
    "zeep-kit:default"
  ]
}
```

### Step 4: Replace UI boilerplate

**Before — hand-rolled dark mode toggle, CSS variables, toast system:**
```tsx
// ~200 lines of boilerplate
const [theme, setTheme] = useState('dark');
useEffect(() => {
  document.documentElement.style.setProperty('--bg', '#0d0d0f');
  // ...
}, []);
```

**After — one provider:**
```tsx
import { ZeepProvider, useZeep } from '@zeep/kit';

function App() {
  return (
    <ZeepProvider>
      <MyApp />
    </ZeepProvider>
  );
}

function MyApp() {
  const { theme, setTheme } = useZeep();
  return <Button onClick={() => setTheme('light')}>Light mode</Button>;
}
```

### Step 5: Add optional modules

| Module | Cargo.toml | Package.json | Rust | Frontend |
|--------|-----------|-------------|------|----------|
| Logger | `zeep-kit` → `.log_dev()` | `@zeep/kit` | auto | `LogViewer`, `LogLevelSelector` |
| Updater | `zeep-kit` → `.updater(pk)` | `@zeep/kit` | auto | `UpdateBanner`, `useUpdater` |
| AI | `zeep-kit` → auto-enabled | `@zeep/kit` | auto | `AIPromptInput`, `useAI` |

## Release Flow

1. Create changeset:
   ```bash
   pnpm changeset
   ```
2. Commit and push PR to `main`
3. After merge, bump versions and generate changelogs:
   ```bash
   pnpm version-packages
   git add . && git commit -m "chore: bump versions"
   ```
4. Tag and push:
   ```bash
   git tag v0.1.0
   git push --tags
   ```
5. GitHub Actions publishes to npm.

## Development

```bash
pnpm install
pnpm -r test          # Vitest (5 packages with tests, 46 tests)
cargo test --workspace # Rust tests (55 tests + 1 doctest)
cargo check            # workspace
```

### Adding a new crate

```bash
mkdir -p src-tauri/crates/zeep-xyz/src
# Add to src-tauri/Cargo.toml [workspace.dependencies]
# Add build.rs + permissions/default.toml
```

### Adding a new package

```bash
mkdir -p packages/@zeep/xyz/src
# Copy package.json, tsconfig.json, vitest.config.ts from @zeep/logger
# Add workspace dep to apps/demo/package.json
```

## Project Structure

```
zeep-native-kit/
├── .github/workflows/      # CI + Release
├── .changeset/             # Changesets config
├── .specs/                 # Specs, roadmap, state
│   ├── project/            # PROJECT.md, ROADMAP.md, STATE.md
│   └── features/           # Feature specs per module
├── src-tauri/
│   ├── Cargo.toml          # Rust workspace root
│   └── crates/
│       ├── zeep-core/      # Prefs, Keychain, Shell
│       ├── zeep-kit/       # Umbrella Builder
│       ├── zeep-logger/    # Structured logging
│       ├── zeep-updater/   # Auto-update
│       └── zeep-ai/        # AI CLI integration
├── packages/
│   └── @zeep/
│       ├── core/           # TS command wrappers
│       ├── ui/             # React design system
│       ├── logger/         # LogViewer + controls
│       ├── updater/        # Update components
│       ├── ai/             # AI components + utils
│       └── kit/            # Barrel re-exports
├── apps/
│   └── demo/               # Tauri demo app
└── docs/
    └── superpowers/        # Design docs + plans
```

## License

MIT OR Apache-2.0
