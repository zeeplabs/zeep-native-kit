# zeep-ai — Spec

## Overview
Local AI integration layer. Detects and runs AI CLIs already present on the user's machine (claude, codex, ollama, etc.) — no API keys, no token cost.

Equivalent to: CortexAI (Swift).

---

## Requirements

### DET · CLI Detection

| ID | Requirement |
|----|-------------|
| DET-01 | On first use, detect which AI CLIs are available in PATH: `claude`, `codex`, `ollama`, `llm` |
| DET-02 | Detection result is cached in PrefsStore under key `zeep_ai.detected_providers` |
| DET-03 | `AIProvider::detect()` returns `Vec<DetectedProvider>` — never errors; unavailable = empty vec |
| DET-04 | `DetectedProvider` contains: `name: String`, `binary_path: String`, `version: Option<String>` |
| DET-05 | Tauri command `ai_detect_providers` triggers detection and returns the list |
| DET-06 | Version is obtained by running `<binary> --version` and capturing first line |

### RUN · AI Runner

| ID | Requirement |
|----|-------------|
| RUN-01 | `AIRunner::run(provider, prompt, opts?)` spawns the CLI and returns the full response |
| RUN-02 | `AIRunner::run_stream(provider, prompt, opts?)` emits Tauri event `ai:chunk` per output line |
| RUN-03 | `opts` supports: `model: Option<String>`, `max_tokens: Option<u32>`, `system: Option<String>` |
| RUN-04 | Provider-specific flag mapping: `claude -p`, `codex -i`, `ollama run <model>` |
| RUN-05 | Each provider has a `ProviderAdapter` trait implementation |
| RUN-06 | Tauri commands exposed: `ai_run`, `ai_run_stream`, `ai_cancel` |
| RUN-07 | `ai_cancel` sends SIGTERM to the running child process |
| RUN-08 | Concurrent runs allowed; each run returns a `run_id` used by `ai_cancel` |

### TXT · AIText Utilities (TypeScript)

| ID | Requirement |
|----|-------------|
| TXT-01 | `stripFences(text)` removes leading/trailing markdown code fences |
| TXT-02 | `firstLine(text)` returns first non-empty line |
| TXT-03 | `truncate(text, maxChars)` truncates at word boundary with `…` suffix |
| TXT-04 | `extractJson(text)` tries to parse JSON from a response that may contain surrounding prose |
| TXT-05 | All utilities are pure functions; exported from `@zeeptech/ai/utils` |

### UI · AI Components (React)

| ID | Requirement |
|----|-------------|
| UI-01 | `<AIProviderStatus>` shows detected providers with status dots |
| UI-02 | `<AIPromptInput>` is a styled textarea with send button and streaming indicator |
| UI-03 | `<AIResponseStream>` renders streaming text token-by-token with a cursor blink |
| UI-04 | `<AIProviderPicker>` dropdown to select active provider when multiple detected |

---

## Security

- SEC-01: Prompts passed to CLIs as stdin or `--` argument; never interpolated into shell string
- SEC-02: API keys are never handled by zeep-ai; the CLI manages its own auth
- SEC-03: Output is treated as untrusted text — rendered via `MarkdownRenderer` (sanitized)

---

## Out of Scope (zeep-ai v1)

- OpenAI / Anthropic direct HTTP API calls
- Function calling / tool use orchestration
- Embeddings or vector search
- Fine-tuning or model management

---

## Testing

- Unit: `ProviderAdapter` flag mapping for each provider
- Unit: AIText utility functions (pure, easy to test)
- Integration: spawn real `claude --version` in CI if binary present; skip otherwise
- Mock: `MockAIRunner` for UI component tests
