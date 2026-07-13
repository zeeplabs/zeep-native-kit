# zeep-kit Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `zeep-kit::Builder` from a `namespace()`-only stub into a real `tauri::plugin::Plugin` that registers prefs/keychain/shell with declared Tauri v2 permissions, and migrate `apps/demo` to consume it.

**Architecture:** `zeep-kit` gains a `build.rs` (standard `tauri-plugin` scaffold) generating an ACL permission schema for its 10 commands, a `permissions/default.toml` declaring the `zeep-kit:default` allow-set, and `Builder::build::<R>()` returning a `tauri::plugin::TauriPlugin<R>` built via `tauri::plugin::Builder::new("zeep-kit")`. `apps/demo` drops manual `app.manage()`/`generate_handler!` wiring for a single `.plugin(...)` call.

**Tech Stack:** Rust, Tauri v2.11.3, `tauri-plugin` v2 (build-dep), `cargo test` with `tauri::test::MockRuntime`.

## Global Constraints

- Rust MSRV = 1.80 (D06)
- Tauri v2 only (D01)
- Namespace defaults to `"zeep-app"` if unset — `build()` never panics/fails on missing namespace
- Keychain service is derived as `dev.zeep.{namespace}` — no backward-compat needed, dev-only today
- Registers prefs + keychain + shell together, no per-module opt-in (deferred to when zeep-logger/zeep-ai exist)

---

## Task 1: `resolve_keychain_service` helper + unit tests

**Files:**
- Modify: `src-tauri/crates/zeep-kit/src/lib.rs`

**Interfaces:**
- Produces: `fn resolve_keychain_service(namespace: &str) -> String` (private, used by Task 4's `build()`)

- [ ] **Step 1: Write the failing tests**

Add to `src-tauri/crates/zeep-kit/src/lib.rs`, below the existing `Builder`/`Default` impls:

```rust
fn resolve_keychain_service(namespace: &str) -> String {
    unimplemented!()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_service_from_namespace() {
        assert_eq!(resolve_keychain_service("zeep-demo"), "dev.zeep.zeep-demo");
    }

    #[test]
    fn derives_service_from_custom_namespace() {
        assert_eq!(resolve_keychain_service("acme-app"), "dev.zeep.acme-app");
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src-tauri && cargo test -p zeep-kit`
Expected: FAIL — panics with `not implemented` on both tests.

- [ ] **Step 3: Implement**

Replace the `unimplemented!()` body:

```rust
fn resolve_keychain_service(namespace: &str) -> String {
    format!("dev.zeep.{namespace}")
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test -p zeep-kit`
Expected: `test result: ok. 2 passed; 0 failed`

- [ ] **Step 5: Commit**

```bash
git add src-tauri/crates/zeep-kit/src/lib.rs
git commit -m "feat(zeep-kit): add resolve_keychain_service helper"
```

---

## Task 2: Cargo.toml — add build/test dependencies

**Files:**
- Modify: `src-tauri/crates/zeep-kit/Cargo.toml`

**Interfaces:**
- Produces: `tauri-plugin` available in `build.rs` (Task 3); `tauri::test::MockRuntime` available in `#[cfg(test)]` (Task 4)

- [ ] **Step 1: Edit Cargo.toml**

Current content:

```toml
[package]
name = "zeep-kit"
description = "Umbrella crate for zeep-native-kit — Builder API for Tauri apps"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
authors.workspace = true

[dependencies]
zeep-core.workspace = true
tauri.workspace = true
```

Replace with:

```toml
[package]
name = "zeep-kit"
description = "Umbrella crate for zeep-native-kit — Builder API for Tauri apps"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
authors.workspace = true

[dependencies]
zeep-core.workspace = true
tauri.workspace = true

[build-dependencies]
tauri-plugin = { workspace = true }

[dev-dependencies]
tauri = { workspace = true, features = ["test"] }
```

- [ ] **Step 2: Verify it still compiles (no build.rs yet, so build-dependency is unused but must resolve)**

Run: `cd src-tauri && cargo check -p zeep-kit --tests`
Expected: succeeds (may take longer the first time as `tauri-plugin` and `tauri`'s `test` feature compile).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/crates/zeep-kit/Cargo.toml
git commit -m "build(zeep-kit): add tauri-plugin build-dep and tauri test feature dev-dep"
```

---

## Task 3: Permission schema — `build.rs` + `permissions/default.toml`

**Files:**
- Create: `src-tauri/crates/zeep-kit/build.rs`
- Create: `src-tauri/crates/zeep-kit/permissions/default.toml`

**Interfaces:**
- Produces: `zeep-kit:default` permission set covering all 10 commands, consumed by `apps/demo/src-tauri/capabilities/default.json` in Task 7.

- [ ] **Step 1: Write build.rs**

Create `src-tauri/crates/zeep-kit/build.rs`:

```rust
const COMMANDS: &[&str] = &[
    "prefs_get",
    "prefs_set",
    "prefs_delete",
    "prefs_get_all",
    "keychain_get",
    "keychain_set",
    "keychain_delete",
    "shell_which",
    "shell_run",
    "shell_run_stream",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
```

- [ ] **Step 2: Create permissions directory and default.toml**

Create `src-tauri/crates/zeep-kit/permissions/default.toml`:

```toml
"$schema" = "schemas/schema.json"

[default]
description = "Default permissions for zeep-kit: prefs, keychain, and shell commands."
permissions = [
    "allow-prefs-get",
    "allow-prefs-set",
    "allow-prefs-delete",
    "allow-prefs-get-all",
    "allow-keychain-get",
    "allow-keychain-set",
    "allow-keychain-delete",
    "allow-shell-which",
    "allow-shell-run",
    "allow-shell-run-stream",
]
```

- [ ] **Step 3: Build and verify the permission identifiers match what tauri-plugin generates**

Run: `cd src-tauri && cargo build -p zeep-kit 2>&1 | tail -40`

Expected: build succeeds and `src-tauri/crates/zeep-kit/permissions/autogenerated/` is created with one `.toml` file per command (e.g. `prefs_get.toml`) plus a `schemas/schema.json`.

If the build **fails** with a message about unknown/unresolved permission identifiers in `default.toml`: open `src-tauri/crates/zeep-kit/permissions/autogenerated/commands/` and read the generated `allow-*`/`deny-*` identifiers verbatim from those files — replace the guessed list in `permissions/default.toml` Step 2 with the exact identifiers found there, then re-run this build command until it succeeds.

- [ ] **Step 4: Commit (including generated schema files)**

```bash
git add src-tauri/crates/zeep-kit/build.rs src-tauri/crates/zeep-kit/permissions/
git commit -m "feat(zeep-kit): add Tauri v2 permission schema for prefs/keychain/shell commands"
```

---

## Task 4: `Builder::build()` returns a `TauriPlugin<R>`

**Files:**
- Modify: `src-tauri/crates/zeep-kit/src/lib.rs`

**Interfaces:**
- Consumes: `resolve_keychain_service(namespace: &str) -> String` (Task 1); `zeep_core::prefs::{PrefsState, PrefsStore}`, `zeep_core::keychain::{Keychain, KeychainState}`, `zeep_core::shell::{ShellRunner, ShellState}` (existing, from `zeep-core`)
- Produces: `Builder::build<R: tauri::Runtime>(self) -> tauri::plugin::TauriPlugin<R>` — consumed by `apps/demo/src-tauri/src/lib.rs` in Task 6.

- [ ] **Step 1: Write the failing test**

Add to the `#[cfg(test)] mod tests` block in `src-tauri/crates/zeep-kit/src/lib.rs` (below the two tests from Task 1):

```rust
#[test]
fn build_returns_plugin_named_zeep_kit() {
    let plugin = Builder::new()
        .namespace("test-app")
        .build::<tauri::test::MockRuntime>();
    assert_eq!(plugin.name(), "zeep-kit");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test -p zeep-kit`
Expected: FAIL to compile — `no method named build found for struct Builder` (or similar), since `build()` doesn't exist yet.

- [ ] **Step 3: Implement `Builder::build()`**

Replace the full contents of `src-tauri/crates/zeep-kit/src/lib.rs` above the `resolve_keychain_service` function with:

```rust
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use tauri::plugin::{Builder as PluginBuilder, TauriPlugin};
use tauri::{Manager, Runtime};

use zeep_core::keychain::{Keychain, KeychainState};
use zeep_core::prefs::{PrefsState, PrefsStore};
use zeep_core::shell::{ShellRunner, ShellState};

pub use zeep_core;

pub struct Builder {
    namespace: Option<String>,
    shell_cwd: Option<PathBuf>,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            namespace: None,
            shell_cwd: None,
        }
    }

    pub fn namespace(mut self, ns: impl Into<String>) -> Self {
        self.namespace = Some(ns.into());
        self
    }

    pub fn shell_cwd(mut self, cwd: PathBuf) -> Self {
        self.shell_cwd = Some(cwd);
        self
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R> {
        let namespace = self.namespace.unwrap_or_else(|| "zeep-app".into());
        let keychain_service = resolve_keychain_service(&namespace);
        let shell_cwd = self.shell_cwd;

        PluginBuilder::new("zeep-kit")
            .setup(move |app, _api| {
                let app_data_dir = app.path().app_data_dir()?;

                let prefs: PrefsState =
                    Arc::new(RwLock::new(PrefsStore::new(&namespace, app_data_dir)));
                app.manage(prefs);

                let keychain: KeychainState =
                    Arc::new(RwLock::new(Keychain::new(&keychain_service)));
                app.manage(keychain);

                let cwd = shell_cwd.clone().unwrap_or_else(|| {
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                });
                let shell: ShellState = Arc::new(RwLock::new(ShellRunner::new(cwd)));
                app.manage(shell);

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

impl Default for Builder {
    fn default() -> Self {
        Self::new()
    }
}
```

Keep the existing `resolve_keychain_service` function and `#[cfg(test)] mod tests` block below this unchanged (from Task 1), just with the new test from Step 1 above added to it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test -p zeep-kit`
Expected: `test result: ok. 3 passed; 0 failed` (2 from Task 1 + this one).

- [ ] **Step 5: Run full workspace test suite to confirm no regressions**

Run: `cd src-tauri && cargo test --workspace`
Expected: `zeep-core` still shows 19 passed; `zeep-kit` now shows 3 passed (was 0).

- [ ] **Step 6: Commit**

```bash
git add src-tauri/crates/zeep-kit/src/lib.rs
git commit -m "feat(zeep-kit): implement Builder::build() as a real tauri::plugin::Plugin"
```

---

## Task 5: Demo app — Cargo.toml migration

**Files:**
- Modify: `apps/demo/src-tauri/Cargo.toml`

**Interfaces:**
- Consumes: `zeep-kit` crate (Task 4)

- [ ] **Step 1: Edit Cargo.toml**

Current `[dependencies]` section:

```toml
[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
zeep-core = { path = "../../../src-tauri/crates/zeep-core" }
```

Replace with:

```toml
[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
zeep-kit = { path = "../../../src-tauri/crates/zeep-kit" }
```

(`zeep-core` is dropped — the demo app no longer references `zeep_core` types directly after Task 6.)

- [ ] **Step 2: Verify it resolves**

Run: `cd apps/demo/src-tauri && cargo check`
Expected: FAILS at this point — `lib.rs` still imports `zeep_core::*` directly (Task 6 fixes this). Confirm the failure is specifically unresolved `zeep_core` imports, not a dependency-resolution error.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/src-tauri/Cargo.toml
git commit -m "build(demo): depend on zeep-kit instead of zeep-core directly"
```

---

## Task 6: Demo app — `lib.rs` migration to `.plugin(...)`

**Files:**
- Modify: `apps/demo/src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `zeep_kit::Builder::new().namespace(...).build::<R>()` (Task 4)

- [ ] **Step 1: Replace lib.rs contents**

Current content:

```rust
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use tauri::Manager;
use zeep_core::keychain::{Keychain, KeychainState};
use zeep_core::prefs::{PrefsState, PrefsStore};
use zeep_core::shell::{ShellRunner, ShellState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;

            let prefs: PrefsState =
                Arc::new(RwLock::new(PrefsStore::new("zeep-demo", app_data_dir)));
            app.manage(prefs);

            let keychain: KeychainState =
                Arc::new(RwLock::new(Keychain::new("dev.zeep.demo")));
            app.manage(keychain);

            let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            let shell: ShellState = Arc::new(RwLock::new(ShellRunner::new(cwd)));
            app.manage(shell);

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
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
```

Replace with:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(zeep_kit::Builder::new().namespace("zeep-demo").build())
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/demo/src-tauri && cargo check`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/src-tauri/src/lib.rs
git commit -m "refactor(demo): migrate to zeep_kit::Builder plugin, drop manual command wiring"
```

---

## Task 7: Demo app — capabilities + end-to-end verification

**Files:**
- Modify: `apps/demo/src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: `zeep-kit:default` permission set (Task 3)

- [ ] **Step 1: Edit capabilities file**

Current content:

```json
{
  "$schema": "https://schema.tauri.app/schema/v2/capabilities",
  "identifier": "default",
  "description": "Default permissions for zeep-demo",
  "windows": ["main"],
  "permissions": [
    "core:default"
  ]
}
```

Replace with:

```json
{
  "$schema": "https://schema.tauri.app/schema/v2/capabilities",
  "identifier": "default",
  "description": "Default permissions for zeep-demo",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "zeep-kit:default"
  ]
}
```

- [ ] **Step 2: Full workspace build**

Run: `cd src-tauri && cargo build --workspace && cd ../apps/demo/src-tauri && cargo build`
Expected: both succeed with no errors.

- [ ] **Step 3: Full workspace test run**

Run: `cd src-tauri && cargo test --workspace`
Expected: `zeep-core`: 19 passed. `zeep-kit`: 3 passed. `zeep-kit` no longer shows `running 0 tests`.

- [ ] **Step 4: Manual smoke test of the demo app**

Run: `cd apps/demo && pnpm tauri dev`
In the running app: open the UIGallery/demo page that exercises a prefs or keychain call (whatever page currently calls `invoke("prefs_set", ...)` or similar) and confirm it succeeds with no "permission denied" / "command not allowed" error in the console. Close the app (Ctrl+C in the terminal) when confirmed.

If the invoke call fails with a capability/permission error: re-check that `permissions/default.toml`'s identifiers (Task 3) exactly match what's under `src-tauri/crates/zeep-kit/permissions/autogenerated/commands/`, and that `zeep-kit:default` is spelled correctly in `capabilities/default.json` (Step 1).

- [ ] **Step 5: Commit**

```bash
git add apps/demo/src-tauri/capabilities/default.json
git commit -m "feat(demo): grant zeep-kit:default capability for prefs/keychain/shell commands"
```

---

## Task 8: Update STATE.md

**Files:**
- Modify: `.specs/project/STATE.md`

- [ ] **Step 1: Edit STATE.md todos**

Find this line (added in the prior session):

```markdown
- [ ] **NEXT: zeep-kit Builder** — `Builder::namespace()` exists but no `.build()` / `tauri::plugin::Plugin` wiring yet (D12 not yet implemented in code)
```

Replace with:

```markdown
- [x] **zeep-kit Builder** — `Builder::build()` now returns a real `tauri::plugin::TauriPlugin<R>` with declared `zeep-kit:default` permissions (D12 implemented); `apps/demo` migrated to `.plugin(zeep_kit::Builder::new().namespace(...).build())`. zeep-kit test count: 0 → 3.
- [ ] **NEXT:** Add unit tests to remaining zeep-kit gaps as new modules land (zeep-logger/zeep-ai); JS/TS test runner setup still pending (tracked separately below)
```

- [ ] **Step 2: Add a Decision row**

In the `## Decisions` table, add a new row after `D12`:

```markdown
| D13 | zeep-kit Builder derives keychain service as `dev.zeep.{namespace}`, registers prefs+keychain+shell together (no per-module opt-in) | Simplest correct implementation of D12; per-module opt-in deferred until zeep-logger/zeep-ai exist (YAGNI) | 2026-07-13 |
```

- [ ] **Step 3: Commit**

```bash
git add .specs/project/STATE.md
git commit -m "docs: mark zeep-kit Builder done in STATE.md, add D13"
```

---

## Self-Review Notes

- **Spec coverage:** Plugin construction → Task 4. Permissions/ACL → Task 3. Builder API (namespace default, shell_cwd override, keychain derivation) → Tasks 1 & 4. Demo migration (lib.rs, Cargo.toml, capabilities) → Tasks 5–7. Testing (resolve_keychain_service unit tests, MockRuntime plugin-name test, workspace count 19→19+N) → Tasks 1, 4, 7. Error handling (no new `.unwrap()`, `?` propagation) → verified in Task 4's code, unchanged from original demo `.setup()`.
- **Out of scope per spec's Non-goals:** no per-module opt-in builder methods, no keychain backward-compat — neither task attempts these.
- **Type consistency checked:** `PrefsState`/`KeychainState`/`ShellState` type aliases and `PrefsStore::new`/`Keychain::new`/`ShellRunner::new` constructor signatures match exactly what Task 4's code uses and what the original `apps/demo/src-tauri/src/lib.rs` (read from the live repo) already called — no invented APIs.
