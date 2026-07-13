# zeep-kit Builder — Design

Status: approved
Date: 2026-07-13
Related: D12, M1 (roadmap), STATE.md "NEXT: zeep-kit Builder"

## Problem

`zeep-kit::Builder` today only has `namespace()` — no `.build()`, no Tauri plugin
integration. Consumers (e.g. `apps/demo`) wire `zeep-core` manually: `app.manage()`
for each of the three states (prefs/keychain/shell) plus a hand-written
`tauri::generate_handler![...]` listing all 10 commands. Tauri v2 requires
capabilities/permissions declared per plugin — today `capabilities/default.json`
only has `core:default`, no permissions for the zeep-core commands. D12 says this
must become a real `tauri::plugin::Plugin` so permissions are declared and
consumers get a one-line setup.

## Goals

- `zeep_kit::Builder::new().namespace("app").build()` returns a `TauriPlugin<R>`
  ready for `.plugin(...)` on `tauri::Builder`.
- Registers prefs + keychain + shell together (no per-module opt-in yet — deferred
  to when zeep-logger/zeep-ai land).
- Declares real Tauri v2 permissions (`zeep-kit:default`) via `build.rs` +
  `permissions/default.toml`, so consuming apps must explicitly allow it in their
  capabilities file (matches D12 intent).
- `apps/demo` migrates to the plugin, dropping manual `app.manage()` /
  `generate_handler!` wiring.

## Non-goals

- Per-module opt-in builder methods (`.with_prefs()` etc.) — not needed until a
  fourth module (logger/ai) exists.
- Backward-compat keychain service naming — dev-only today, no production data to
  preserve.

## Design

### Plugin construction

```rust
pub struct Builder {
    namespace: Option<String>,
    shell_cwd: Option<PathBuf>,
}

impl Builder {
    pub fn new() -> Self { Self { namespace: None, shell_cwd: None } }
    pub fn namespace(mut self, ns: impl Into<String>) -> Self { self.namespace = Some(ns.into()); self }
    pub fn shell_cwd(mut self, cwd: PathBuf) -> Self { self.shell_cwd = Some(cwd); self }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R> {
        let namespace = self.namespace.unwrap_or_else(|| "zeep-app".into());
        let keychain_service = resolve_keychain_service(&namespace);
        let shell_cwd = self.shell_cwd;

        tauri::plugin::Builder::new("zeep-kit")
            .setup(move |app, _api| {
                let app_data_dir = app.path().app_data_dir()?;
                app.manage::<PrefsState>(Arc::new(RwLock::new(
                    PrefsStore::new(&namespace, app_data_dir),
                )));
                app.manage::<KeychainState>(Arc::new(RwLock::new(
                    Keychain::new(&keychain_service),
                )));
                let cwd = shell_cwd.unwrap_or_else(|| {
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                });
                app.manage::<ShellState>(Arc::new(RwLock::new(ShellRunner::new(cwd))));
                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                zeep_core::prefs::prefs_get,
                zeep_core::prefs::prefs_set,
                zeep_core::prefs::prefs_delete,
                zeep_core::prefs::prefs_get_all,
                zeep_core::keychain::keychain_get,
                zeep_core::keychain::keychain_set,
                zeep_core::keychain::keychain_delete,
                zeep_core::shell::shell_which,
                zeep_core::shell::shell_run,
                zeep_core::shell::shell_run_stream,
            ])
            .build()
    }
}

fn resolve_keychain_service(namespace: &str) -> String {
    format!("dev.zeep.{namespace}")
}
```

- `namespace` defaults to `"zeep-app"` — `build()` never fails/panics on missing
  namespace.
- Keychain service is derived as `dev.zeep.{namespace}` — new convention, replaces
  today's hardcoded `"dev.zeep.demo"` in the demo app. No migration needed (dev-only,
  no production keychain data to preserve).
- `shell_cwd` optional override; defaults to `std::env::current_dir()` (same
  fallback as today).
- `resolve_keychain_service` extracted as a pure function so it's unit-testable
  without a real `AppHandle`.

### Permissions (Tauri v2 ACL)

- `zeep-kit/build.rs` added, using `tauri_plugin::Builder::new(COMMANDS)` (the
  standard `create-tauri-plugin` scaffold) to generate the plugin's permission
  schema at build time.
- `zeep-kit/permissions/default.toml` added: allow-all for the 10 commands under
  the `zeep-kit:default` permission set — same pattern as official Tauri plugins
  (`tauri-plugin-store`, etc).
- `zeep-kit/Cargo.toml` gains `tauri-plugin` as a `build-dependency`.
- Consuming apps must add `"zeep-kit:default"` to their
  `capabilities/*.json` `permissions` array or the commands are blocked at
  runtime — this is the enforcement D12 was written for.

### Demo app migration

`apps/demo/src-tauri/src/lib.rs` becomes:

```rust
tauri::Builder::default()
    .plugin(zeep_kit::Builder::new().namespace("zeep-demo").build())
    .run(tauri::generate_context!())
    .expect("error running tauri application");
```

- `apps/demo/src-tauri/Cargo.toml`: add `zeep-kit` path dependency, drop the direct
  `zeep-core` dependency (app no longer touches `zeep_core` types directly).
- `apps/demo/src-tauri/capabilities/default.json`: add `"zeep-kit:default"` to
  `permissions`.

### Error handling

- `.setup()` closure propagates errors via `?` (its signature already returns
  `tauri::Result<()>`) — matches today's behavior in the demo app (fails app boot
  with a clear error if `app_data_dir()` fails). No new `.unwrap()` introduced.
- `Builder::build()` itself cannot fail — no `Result` return; namespace has a
  default, `shell_cwd` has a fallback.

### Testing

- New test in `zeep-kit`: `Builder::new().namespace("x").build::<MockRuntime>()`
  does not panic and returns a plugin named `"zeep-kit"` (via `TauriPlugin::name()`
  — needs `tauri::test` dev-dependency for `MockRuntime`).
- Unit tests for `resolve_keychain_service`: default derivation, custom namespace.
- `cargo test --workspace` goes from 19 passing (all in zeep-core) to 19+N, with
  zeep-kit's count moving off zero.

## Open follow-ups (not in this change)

- JS/TS test runner setup (Vitest) — tracked separately in STATE.md, unrelated to
  this crate.
- Per-module opt-in builder methods — deferred until zeep-logger/zeep-ai exist.
