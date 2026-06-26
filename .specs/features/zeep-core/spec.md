# zeep-core — Spec

## Overview
Rust-side plumbing exposed as Tauri v2 commands. No UI. Apps consume via `invoke()` from the React side or directly from other Rust crates.

Equivalent to: CortexInfra (Swift).

---

## Requirements

### PRF · PrefsStore

| ID | Requirement |
|----|-------------|
| PRF-01 | PrefsStore reads and writes typed values to a namespaced JSON file under Tauri's `app_data_dir()` |
| PRF-02 | Namespace is set once at `configure()` time; all keys are prefixed automatically |
| PRF-03 | Supported value types: `String`, `bool`, `i64`, `f64`, `Vec<String>`, `serde_json::Value` |
| PRF-04 | `get(key)` returns `Option<T>` — never panics on missing key |
| PRF-05 | `set(key, value)` writes immediately (no deferred flush in v1) |
| PRF-06 | `delete(key)` removes a key; `clear()` wipes the namespace |
| PRF-07 | `get_all()` returns the full namespace as `HashMap<String, Value>` |
| PRF-08 | Tauri commands exposed: `prefs_get`, `prefs_set`, `prefs_delete`, `prefs_get_all` |
| PRF-09 | File is stored at `{app_data_dir}/{namespace}/prefs.json` |
| PRF-10 | Concurrent access is safe (RwLock-wrapped store in AppState) |

### KCH · Keychain

| ID | Requirement |
|----|-------------|
| KCH-01 | Keychain stores and retrieves secrets by `(service, key)` pair |
| KCH-02 | Uses `keyring` crate (macOS Keychain, Windows Credential Manager, Linux Secret Service) |
| KCH-03 | Service name is set at `configure()` time and cannot be changed per-operation |
| KCH-04 | `set_secret(key, value)` stores a UTF-8 string secret |
| KCH-05 | `get_secret(key)` returns `Option<String>` — returns `None` if not found |
| KCH-06 | `delete_secret(key)` removes the entry; no-op if absent |
| KCH-07 | Secrets never appear in logs (log the key name only) |
| KCH-08 | Tauri commands exposed: `keychain_set`, `keychain_get`, `keychain_delete` |
| KCH-09 | `keychain_get` returns `null` (not error) when key is absent — frontend can distinguish missing vs error |

### SHL · ShellRunner

| ID | Requirement |
|----|-------------|
| SHL-01 | ShellRunner executes a program by name, resolving it from a standard PATH list |
| SHL-02 | PATH resolution order: env `PATH`, then hardcoded fallbacks `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin` |
| SHL-03 | Supports both fire-and-forget (`run`) and streaming output (`run_stream`) |
| SHL-04 | `run(program, args, cwd?)` returns `{ stdout, stderr, exit_code }` |
| SHL-05 | `run_stream(program, args, cwd?)` emits Tauri events `shell:stdout` and `shell:stderr` line by line |
| SHL-06 | Execution timeout configurable; default 30 s for `run`, no timeout for `run_stream` |
| SHL-07 | Working directory defaults to `app_data_dir()` if `cwd` is omitted |
| SHL-08 | Tauri commands exposed: `shell_run`, `shell_run_stream`, `shell_which` |
| SHL-09 | `shell_which(program)` returns the resolved binary path or `null` |
| SHL-10 | Environment variables are inherited from the process; caller may pass additional `env` overrides |
| SHL-11 | Command injection is prevented: args are passed as array, never concatenated into a shell string |

---

## Out of Scope (zeep-core v1)

- PTY / interactive terminal sessions
- File-system watcher
- Network requests (use `reqwest` directly in consuming apps)

---

## Testing

- Unit tests for PrefsStore: roundtrip get/set, namespace isolation, missing key returns None
- Unit tests for Keychain: set/get/delete cycle, absent key returns None (may require mock on CI)
- Unit tests for ShellRunner: PATH resolution, timeout, argument array safety
- Integration test: Tauri command invocation via test harness (separate `tests/` crate)
