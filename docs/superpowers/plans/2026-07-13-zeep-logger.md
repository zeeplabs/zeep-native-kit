# zeep-logger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `zeep-logger` crate — a thin wrapper over `tauri-plugin-log` providing a `zeep_kit`-style `Builder`, dev/production presets, a JSON-per-line formatter, and an age-based log cleanup utility. Resolves Q04.

**Architecture:** New workspace member crate `src-tauri/crates/zeep-logger/`. `zeep_logger::Builder` wraps `tauri_plugin_log::Builder` internally and exposes a matching fluent API; `.build()` returns a `tauri::plugin::TauriPlugin<R>` registered as its own `.plugin()` call by consumers (cannot merge into `zeep-kit`'s plugin — see Global Constraints). No UI component, no scheduler.

**Tech Stack:** Rust, Tauri v2, `tauri-plugin-log` 2.8.0, `log` 0.4, `serde_json`, `time` 0.3.

## Global Constraints

- `tauri-plugin-log` version: `"2"` (tested API confirmed against 2.8.0 on docs.rs).
- `RotationStrategy` has exactly three variants: `KeepAll`, `KeepOne`, `KeepSome(usize)` — no `Default` variant. This plan uses `KeepAll` for the production preset.
- `TargetKind::LogDir` is a struct variant: `TargetKind::LogDir { file_name: Option<String> }`. `TargetKind::Stdout` and `TargetKind::Webview` are unit variants. `Target::new(kind: TargetKind) -> Target` wraps any of them.
- `Builder::format<F>(self, formatter: F)` requires `F: Fn(FormatCallback<'_>, &Arguments<'_>, &Record<'_>) + Sync + Send + 'static`.
- `zeep-logger` is registered as a separate `.plugin()` call from `zeep-kit` in any consuming app — this plan does NOT modify `apps/demo` to register it (out of scope; a future task/plan wires it into the demo, mirroring how zeep-kit's Builder task also didn't touch the demo until a later task).
- No log viewer UI component in `@zeep/ui` — out of scope for this plan.
- No scheduler/background cleanup invocation — `cleanup_old_logs` is a plain function consumers call themselves.
- Follow `zeep-kit`'s existing test pattern: `tauri::test::MockRuntime` + `use tauri::plugin::Plugin as _;` to call `.name()` on a built plugin.
- Crate naming/versioning follows the existing workspace convention (`version.workspace = true` etc., see `src-tauri/crates/zeep-kit/Cargo.toml` for the exact pattern).

---

### Task 1: Crate scaffold + Builder with development()/production() presets

**Files:**
- Create: `src-tauri/crates/zeep-logger/Cargo.toml`
- Create: `src-tauri/crates/zeep-logger/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- Consumes: `tauri_plugin_log::Builder` (external crate, per Global Constraints' confirmed API).
- Produces: `zeep_logger::Builder` with `new()`, `development()`, `production()`, `level()`, `targets()`, `max_file_size()`, `rotation_strategy()`, `build<R: Runtime>() -> TauriPlugin<R>`. Task 2 adds the JSON formatter that `new()` wires in; Task 3 adds `cleanup_old_logs` as a sibling function in the same file — neither depends on this task's internals beyond the `Builder` struct existing.

- [ ] **Step 1: Add the crate to the workspace**

Edit `src-tauri/Cargo.toml`, add to `[workspace.dependencies]` (alongside the existing `zeep-core`/`zeep-kit` lines):

```toml
[workspace.dependencies]
zeep-core = { path = "crates/zeep-core" }
zeep-kit = { path = "crates/zeep-kit" }
zeep-logger = { path = "crates/zeep-logger" }

serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
thiserror = "2"
tauri = { version = "2", features = [] }
tauri-plugin = { version = "2", features = ["build"] }
```

(`[workspace]` `members = ["crates/*"]` already covers the new crate directory — no change needed there.)

- [ ] **Step 2: Create the crate manifest**

Create `src-tauri/crates/zeep-logger/Cargo.toml`:

```toml
[package]
name = "zeep-logger"
description = "Structured logging for zeep-native-kit Tauri apps — wraps tauri-plugin-log"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true
authors.workspace = true

[dependencies]
tauri.workspace = true
tauri-plugin-log = "2"
log = "0.4"
serde_json.workspace = true
time = { version = "0.3", features = ["formatting"] }

[dev-dependencies]
tauri = { workspace = true, features = ["test"] }
tempfile = "3"
```

Run: `cd src-tauri && cargo check -p zeep-logger`
Expected: fails with "no target" or similar since `src/lib.rs` doesn't exist yet — that's fine, proceed to Step 3.

- [ ] **Step 3: Write the failing test for the presets**

Create `src-tauri/crates/zeep-logger/src/lib.rs` with just enough to compile a failing test first — actually, since `Builder` doesn't exist yet, write the full struct alongside the test in one step (this is a mechanical scaffold task, not exploratory — TDD here means: write the test, confirm it fails to COMPILE, then it passes once the struct below is added in the same file):

```rust
use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

pub struct Builder {
    inner: tauri_plugin_log::Builder,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            inner: tauri_plugin_log::Builder::new(),
        }
    }

    pub fn development() -> Self {
        Self::new()
            .level(log::LevelFilter::Debug)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
            ])
    }

    pub fn production() -> Self {
        Self::new()
            .level(log::LevelFilter::Info)
            .targets([Target::new(TargetKind::LogDir { file_name: None })])
            .max_file_size(10_000_000)
            .rotation_strategy(RotationStrategy::KeepAll)
    }

    pub fn level(mut self, level: log::LevelFilter) -> Self {
        self.inner = self.inner.level(level);
        self
    }

    pub fn targets(mut self, targets: impl IntoIterator<Item = Target>) -> Self {
        self.inner = self.inner.targets(targets);
        self
    }

    pub fn max_file_size(mut self, bytes: u128) -> Self {
        self.inner = self.inner.max_file_size(bytes);
        self
    }

    pub fn rotation_strategy(mut self, strategy: RotationStrategy) -> Self {
        self.inner = self.inner.rotation_strategy(strategy);
        self
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R> {
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
    fn development_preset_builds_a_plugin() {
        let plugin = Builder::development().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "log");
    }

    #[test]
    fn production_preset_builds_a_plugin() {
        let plugin = Builder::production().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "log");
    }
}
```

Note: `tauri_plugin_log`'s registered plugin name is `"log"` (its own internal name, not `"zeep-logger"`) — this plan's test asserts that real, existing behavior, not a wish. If the actual plugin name differs when you run the test, update the assertion to match reality and note the discrepancy in your report; do not change `tauri-plugin-log`'s behavior (it's an external crate).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test -p zeep-logger`
Expected: 2 tests pass (`development_preset_builds_a_plugin`, `production_preset_builds_a_plugin`).

If a method name (`.level()`, `.targets()`, `.max_file_size()`, `.rotation_strategy()`) doesn't compile against the actual installed `tauri-plugin-log` version, run `cargo doc -p tauri-plugin-log --open` or check `~/.cargo/registry/src/*/tauri-plugin-log-*/src/lib.rs` to find the real signature, and fix this crate's wrapper method to match — the confirmed API in this plan's Global Constraints was checked against docs.rs 2.8.0, but pin/lock resolution could differ slightly; treat the compiler as ground truth over this plan's text if they disagree.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/crates/zeep-logger/Cargo.toml src-tauri/crates/zeep-logger/src/lib.rs src-tauri/Cargo.lock
git commit -m "feat(zeep-logger): scaffold crate with Builder + development/production presets"
```

---

### Task 2: JSON-per-line formatter

**Files:**
- Modify: `src-tauri/crates/zeep-logger/src/lib.rs`

**Interfaces:**
- Consumes: `Builder::new()` from Task 1 (modifies it to wire in the formatter).
- Produces: `json_line_formatter` function, wired into every `Builder` instance via `.format()` in `new()`. `development()`/`production()` presets call `Self::new()` so they inherit it automatically — no changes needed to those two methods.

- [ ] **Step 1: Write the failing test**

Add to the `tests` module in `src-tauri/crates/zeep-logger/src/lib.rs` (inside the existing `mod tests` block, after the two Task 1 tests):

```rust
    #[test]
    fn json_formatter_produces_valid_json_with_expected_fields() {
        let message = format_args!("hello world");
        let line = build_json_line(log::Level::Info, "zeep_logger::tests", &message);

        let parsed: serde_json::Value = serde_json::from_str(&line).expect("valid json line");
        assert_eq!(parsed["level"], "INFO");
        assert_eq!(parsed["target"], "zeep_logger::tests");
        assert_eq!(parsed["message"], "hello world");
        assert!(parsed["timestamp"].is_string());
    }
```

This tests the extracted pure function `build_json_line` directly rather than driving `fern`'s global logger — avoids global logger state entirely, which is the simpler and more reliable approach for a unit test.

- [ ] **Step 2: Implement the formatter**

Add to `src-tauri/crates/zeep-logger/src/lib.rs`, above the `Builder` struct:

```rust
use std::fmt::Arguments;
use tauri_plugin_log::fern::FormatCallback;

fn build_json_line(level: log::Level, target: &str, message: &Arguments<'_>) -> String {
    let timestamp = time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default();

    serde_json::json!({
        "timestamp": timestamp,
        "level": level.to_string(),
        "target": target,
        "message": message.to_string(),
    })
    .to_string()
}

fn json_line_formatter(out: FormatCallback<'_>, message: &Arguments<'_>, record: &log::Record<'_>) {
    let line = build_json_line(record.level(), record.target(), message);
    out.finish(format_args!("{line}"));
}
```

Then wire it into `Builder::new()`:

```rust
impl Builder {
    pub fn new() -> Self {
        Self {
            inner: tauri_plugin_log::Builder::new().format(json_line_formatter),
        }
    }
    // ... rest unchanged
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd src-tauri && cargo test -p zeep-logger`
Expected: all tests pass (2 from Task 1 + `json_formatter_produces_valid_json_with_expected_fields`).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/crates/zeep-logger/src/lib.rs
git commit -m "feat(zeep-logger): add JSON-per-line log formatter"
```

---

### Task 3: `cleanup_old_logs` retention utility

**Files:**
- Modify: `src-tauri/crates/zeep-logger/src/lib.rs`
- Modify: `src-tauri/crates/zeep-logger/Cargo.toml`

**Interfaces:**
- Consumes: nothing from Tasks 1-2 beyond the file they're in — this is an independent public function.
- Produces: `pub fn cleanup_old_logs<R: Runtime>(app: &AppHandle<R>, days: u64) -> io::Result<()>` — no other task in this plan depends on it; a future consumer (demo app or another plan) calls it manually.

- [ ] **Step 1: Add the dev-dependency for the test**

Edit `src-tauri/crates/zeep-logger/Cargo.toml`, add `filetime = "0.2"` to `[dev-dependencies]`:

```toml
[dev-dependencies]
tauri = { workspace = true, features = ["test"] }
tempfile = "3"
filetime = "0.2"
```

- [ ] **Step 2: Write the failing test**

Add to the `tests` module in `src-tauri/crates/zeep-logger/src/lib.rs`:

```rust
    #[test]
    fn cleanup_removes_files_older_than_cutoff_and_keeps_newer_ones() {
        use std::time::{Duration, SystemTime};

        let dir = tempfile::tempdir().expect("tempdir");
        let old_file = dir.path().join("old.log");
        let new_file = dir.path().join("new.log");
        std::fs::write(&old_file, "old").unwrap();
        std::fs::write(&new_file, "new").unwrap();

        let ten_days_ago = SystemTime::now() - Duration::from_secs(10 * 86_400);
        let old_time = filetime::FileTime::from_system_time(ten_days_ago);
        filetime::set_file_mtime(&old_file, old_time).unwrap();

        remove_stale_files(dir.path(), 5).unwrap();

        assert!(!old_file.exists());
        assert!(new_file.exists());
    }
```

This test targets a helper `remove_stale_files(dir: &Path, days: u64) -> io::Result<()>` that `cleanup_old_logs` delegates to, so the retention logic is testable without needing a real `AppHandle`/`app_log_dir()` (which requires a running Tauri app context).

- [ ] **Step 3: Run test to verify it fails**

Run: `cd src-tauri && cargo test -p zeep-logger cleanup_removes_files_older_than_cutoff`
Expected: FAIL — `remove_stale_files` not defined.

- [ ] **Step 4: Implement the retention logic**

Add to `src-tauri/crates/zeep-logger/src/lib.rs`:

```rust
use std::io;
use std::path::Path;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager};

fn remove_stale_files(dir: &Path, days: u64) -> io::Result<()> {
    let cutoff = SystemTime::now() - Duration::from_secs(days * 86_400);

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_file() && metadata.modified()? < cutoff {
            std::fs::remove_file(entry.path())?;
        }
    }
    Ok(())
}

pub fn cleanup_old_logs<R: Runtime>(app: &AppHandle<R>, days: u64) -> io::Result<()> {
    let log_dir = app.path().app_log_dir().map_err(io::Error::other)?;
    remove_stale_files(&log_dir, days)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd src-tauri && cargo test -p zeep-logger`
Expected: all tests pass (Tasks 1-3 combined: 4 tests total).

- [ ] **Step 6: Commit**

```bash
git add src-tauri/crates/zeep-logger/src/lib.rs src-tauri/crates/zeep-logger/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(zeep-logger): add cleanup_old_logs retention utility"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers the Builder/presets goal. Task 2 covers the structured-logs (JSON formatter) goal. Task 3 covers the retention-utility goal. The design's explicit non-goals (log viewer UI, scheduler, tracing bridge, demo app wiring) are intentionally absent from all three tasks.
- **Placeholder scan:** no TBD/TODO. Task 2's test uses an extracted pure function (`build_json_line`) rather than driving the global `fern`/`log` logger, avoiding the fragility a global-state test would have — this was tightened during self-review from an earlier draft that risked exactly that fragility.
- **Type consistency:** `Builder::build<R: Runtime>` return type `TauriPlugin<R>` matches `zeep-kit`'s existing pattern exactly. `cleanup_old_logs<R: Runtime>(app: &AppHandle<R>, days: u64)` signature matches the design doc.
- **Known unknown flagged for the implementer:** Task 1's test asserts the built plugin's name is `"log"` (tauri-plugin-log's own internal plugin name) rather than `"zeep-logger"` — different from `zeep-kit`'s test (which asserts `"zeep-kit"`, since zeep-kit names its own plugin). If this is wrong once actually run, the implementer must fix the assertion to match reality, not change `tauri-plugin-log`.
