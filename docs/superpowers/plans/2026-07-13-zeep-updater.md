# zeep-updater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `zeep-updater` crate — a thin wrapper over `tauri-plugin-updater` providing a `zeep_kit`-style `Builder` with a hardcoded semver gate (stable releases only, strictly newer than current).

**Architecture:** New workspace member crate `src-tauri/crates/zeep-updater/`. `zeep_updater::Builder` wraps `tauri_plugin_updater::Builder` internally; `.build()` returns `tauri::plugin::TauriPlugin<R, tauri_plugin_updater::Config>` (note the two type parameters — different from `zeep-kit`/`zeep-logger`'s single-parameter `TauriPlugin<R>`). Registered as its own `.plugin()` call by consumers. No UI component in this plan.

**Tech Stack:** Rust, Tauri v2, `tauri-plugin-updater` 2.10.1, `semver` 1.

## Global Constraints

- `tauri-plugin-updater` version: `"2"` (tested API confirmed against 2.10.1 on docs.rs).
- `Builder::build<R: Runtime>(self) -> TauriPlugin<R, Config>` — TWO type parameters. `zeep_updater::Builder::build()` must forward this exact shape. Do NOT "fix" it to `TauriPlugin<R>` to match zeep-kit/zeep-logger — that would not compile and is not a bug to correct.
- `Builder::default_version_comparator<F: Fn(Version, RemoteRelease) -> bool + Send + Sync + 'static>(self, f: F) -> Self` — the semver gate closure signature. `Version` is `semver::Version`.
- `RemoteRelease.version: semver::Version` is a public field. `semver::Version.pre` (a `semver::Prerelease`) is empty (`.is_empty()`) when the version is a stable release.
- No `UpdateBanner` UI component in `@zeep/ui` — out of scope for this plan.
- No changes to `zeep-kit`, `zeep-core`, `zeep-logger`, or `apps/demo` — this plan does NOT wire `zeep-updater` into the demo app (a separate follow-up task, mirroring how zeep-logger's demo wiring was its own step after the crate existed).
- No configurable/override version-gate closure exposed to consumers — the gate is hardcoded in this round (YAGNI).
- Follow the existing test pattern: `tauri::test::MockRuntime` + `use tauri::plugin::Plugin as _;` to call `.name()` on a built plugin (see `zeep-kit`'s and `zeep-logger`'s `src/lib.rs` for the exact idiom).
- Crate naming/versioning follows the existing workspace convention (`version.workspace = true` etc. — see `src-tauri/crates/zeep-logger/Cargo.toml` for the exact pattern).

---

### Task 1: Crate scaffold + Builder wrapping `tauri_plugin_updater::Builder`

**Files:**
- Create: `src-tauri/crates/zeep-updater/Cargo.toml`
- Create: `src-tauri/crates/zeep-updater/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- Consumes: `tauri_plugin_updater::Builder` (external crate, per Global Constraints' confirmed API).
- Produces: `zeep_updater::Builder` with `new()`, `pubkey()`, `target()`, `build<R: Runtime>() -> TauriPlugin<R, tauri_plugin_updater::Config>`, and a private `is_stable_and_newer` comparator function wired into `new()`. Nothing else in this plan depends on this task's internals beyond the `Builder` struct and `is_stable_and_newer` existing (Task 2 tests `is_stable_and_newer` directly).

- [ ] **Step 1: Add the crate to the workspace**

Edit `src-tauri/Cargo.toml`, add to `[workspace.dependencies]` (alongside the existing `zeep-core`/`zeep-kit`/`zeep-logger` lines):

```toml
[workspace.dependencies]
zeep-core = { path = "crates/zeep-core" }
zeep-kit = { path = "crates/zeep-kit" }
zeep-logger = { path = "crates/zeep-logger" }
zeep-updater = { path = "crates/zeep-updater" }

serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
thiserror = "2"
tauri = { version = "2", features = [] }
tauri-plugin = { version = "2", features = ["build"] }
```

- [ ] **Step 2: Create the crate manifest**

Create `src-tauri/crates/zeep-updater/Cargo.toml`:

```toml
[package]
name = "zeep-updater"
description = "Auto-update integration for zeep-native-kit Tauri apps — wraps tauri-plugin-updater with a semver gate"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
authors.workspace = true

[dependencies]
tauri.workspace = true
tauri-plugin-updater = "2"
semver = "1"

[dev-dependencies]
tauri = { workspace = true, features = ["test"] }
```

Run: `cd src-tauri && cargo check -p zeep-updater`
Expected: fails since `src/lib.rs` doesn't exist yet — proceed to Step 3.

- [ ] **Step 3: Write the Builder and its test**

Create `src-tauri/crates/zeep-updater/src/lib.rs`:

```rust
use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_updater::{Config, RemoteRelease};

fn is_stable_and_newer(current: semver::Version, remote: RemoteRelease) -> bool {
    remote.version.pre.is_empty() && remote.version > current
}

pub struct Builder {
    inner: tauri_plugin_updater::Builder,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            inner: tauri_plugin_updater::Builder::new()
                .default_version_comparator(is_stable_and_newer),
        }
    }

    pub fn pubkey(mut self, pubkey: impl Into<String>) -> Self {
        self.inner = self.inner.pubkey(pubkey);
        self
    }

    pub fn target(mut self, target: impl Into<String>) -> Self {
        self.inner = self.inner.target(target);
        self
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R, Config> {
        self.inner.build()
    }
}

impl Default for Builder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::plugin::Plugin as _;

    #[test]
    fn build_returns_a_plugin() {
        let plugin = Builder::new().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "updater");
    }
}
```

Note: the asserted plugin name `"updater"` is `tauri-plugin-updater`'s own internal registered name — if the actual name differs when you run the test, update the assertion to match reality (same caveat documented for zeep-logger's `"log"` plugin name) and note the discrepancy in your report; do not change the external crate.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test -p zeep-updater`
Expected: 1 test passes (`build_returns_a_plugin`).

If `.pubkey()`, `.target()`, or `.default_version_comparator()` don't compile against the actually-resolved `tauri-plugin-updater` version, treat the compiler as ground truth over this plan's text (same escape hatch used in the zeep-logger plan) — fix the wrapper method to match and note the discrepancy in your report.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/crates/zeep-updater/Cargo.toml src-tauri/crates/zeep-updater/src/lib.rs
git commit -m "feat(zeep-updater): scaffold crate with Builder wrapping tauri-plugin-updater"
```

---

### Task 2: Semver gate unit tests

**Files:**
- Modify: `src-tauri/crates/zeep-updater/src/lib.rs`

**Interfaces:**
- Consumes: `is_stable_and_newer` from Task 1 (tests it directly; may need to refactor it per the note below if `RemoteRelease` isn't constructible outside the crate).
- Produces: table-driven test coverage proving the semver gate's four cases. No other task depends on this.

- [ ] **Step 1: Check whether `RemoteRelease` is constructible from outside `tauri_plugin_updater`**

Run: `cd src-tauri && cargo doc -p tauri-plugin-updater --no-deps --open` (or read the crate's source under `~/.cargo/registry/src/*/tauri-plugin-updater-*/src/`) and check `RemoteRelease`'s fields/constructors. If all fields are `pub` and the struct has no private fields blocking a literal `RemoteRelease { version: ..., ..Default::default() }` or equivalent, you can construct test fixtures directly. If it's NOT constructible (private fields, no public constructor, `#[non_exhaustive]`), proceed to Step 2's refactor instead of fighting the type.

- [ ] **Step 2: Refactor for testability if needed, then write the failing tests**

If `RemoteRelease` IS constructible, add directly to the `tests` module in `src-tauri/crates/zeep-updater/src/lib.rs`:

```rust
    fn remote(version: &str) -> RemoteRelease {
        // construct using whatever fields/builder RemoteRelease actually exposes,
        // setting `version` to the parsed semver::Version and leaving other
        // fields at sensible defaults, based on what Step 1 found
    }

    #[test]
    fn rejects_stable_but_not_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(!is_stable_and_newer(current.clone(), remote("1.2.0")));
        assert!(!is_stable_and_newer(current, remote("1.1.0")));
    }

    #[test]
    fn accepts_stable_and_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(is_stable_and_newer(current, remote("1.3.0")));
    }

    #[test]
    fn rejects_prerelease_even_if_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(!is_stable_and_newer(current, remote("1.3.0-beta.1")));
    }
```

Fill in `remote()`'s body using `RemoteRelease`'s actual constructor shape found in Step 1 — this plan cannot know it without Step 1's investigation.

If `RemoteRelease` is NOT constructible (the more likely case for a type meant to come from a signed update manifest), refactor `is_stable_and_newer` in `src-tauri/crates/zeep-updater/src/lib.rs` to delegate to a pure, fully-testable helper:

```rust
fn is_stable_and_newer(current: semver::Version, remote: RemoteRelease) -> bool {
    is_stable_and_newer_version(&current, &remote.version)
}

fn is_stable_and_newer_version(current: &semver::Version, remote: &semver::Version) -> bool {
    remote.pre.is_empty() && remote > current
}
```

Then test the pure helper directly:

```rust
    #[test]
    fn rejects_stable_but_not_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(!is_stable_and_newer_version(&current, &semver::Version::parse("1.2.0").unwrap()));
        assert!(!is_stable_and_newer_version(&current, &semver::Version::parse("1.1.0").unwrap()));
    }

    #[test]
    fn accepts_stable_and_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(is_stable_and_newer_version(&current, &semver::Version::parse("1.3.0").unwrap()));
    }

    #[test]
    fn rejects_prerelease_even_if_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(!is_stable_and_newer_version(&current, &semver::Version::parse("1.3.0-beta.1").unwrap()));
    }
```

Prefer this second (pure-helper) approach if there's any ambiguity — it's simpler and doesn't depend on `RemoteRelease`'s exact shape at all.

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd src-tauri && cargo test -p zeep-updater`
Expected: all tests pass (Task 1's `build_returns_a_plugin` + this task's 3 gate tests = 4 total).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/crates/zeep-updater/src/lib.rs
git commit -m "test(zeep-updater): add semver gate coverage (stable + strictly-newer only)"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers the Builder/wrapping goal. Task 2 covers the semver-gate correctness goal. The design's non-goals (UpdateBanner UI, demo wiring, configurable gate) are intentionally absent from both tasks.
- **Placeholder scan:** Task 2 Step 2 has an explicit investigate-then-branch instruction (construct `RemoteRelease` directly vs. extract a pure helper) rather than a vague requirement — the implementer is told exactly how to resolve the ambiguity (check constructibility first, prefer the pure-helper path if ambiguous), not left to guess.
- **Type consistency:** `Builder::build<R: Runtime>` returns `TauriPlugin<R, Config>` throughout — Task 1's struct definition and test both use the two-parameter form consistently; no task drifts back to the single-parameter `TauriPlugin<R>` used by zeep-kit/zeep-logger.
- **Known unknown flagged for the implementer:** Task 1's test asserts the built plugin's name is `"updater"` (tauri-plugin-updater's own internal name) — same pattern as zeep-logger's `"log"` assertion; fix the assertion, not the external crate, if it's wrong.
