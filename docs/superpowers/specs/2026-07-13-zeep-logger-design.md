# zeep-logger: Structured Logging Crate — Design

## Problem

M3 (per ROADMAP.md) requires a `zeep-logger` crate providing structured logs, file rotation, and (in a later round) a log viewer component. Today there is zero code for it. `Q04` in STATE.md is open: should `zeep-logger` wrap the official `tauri-plugin-log` crate or implement custom file rotation?

## Goals

- Resolve Q04: wrap `tauri-plugin-log` (v2, mature, handles cross-platform log dirs and size-based rotation correctly) rather than building file I/O and rotation from scratch.
- Provide a `zeep_logger::Builder` with a fluent API consistent with the existing `zeep_kit::Builder` (`.build()` returns a `tauri::plugin::TauriPlugin<R>`).
- Provide two presets: `Builder::development()` and `Builder::production()`, covering the common cases without requiring every consumer to hand-configure targets/levels/rotation.
- Satisfy ROADMAP's "structured logs" requirement despite `tauri-plugin-log` only emitting plain text lines natively, via a custom JSON-per-line formatter.
- Expose a `cleanup_old_logs(app: &AppHandle, days: u64) -> io::Result<()>` utility for age-based retention, callable by consumers on their own schedule.

## Non-goals

- Log viewer UI component (`@zeep/ui`) — deferred to a separate spec/plan round, per explicit scope decision.
- Automatic/scheduled log cleanup — `cleanup_old_logs` is exposed but not invoked by zeep-logger itself; no background scheduler in this round (YAGNI — no other crate in this repo runs background schedulers yet).
- `tracing` crate bridging — `tauri-plugin-log` integrates with the `log` crate natively; a `tracing` → `log` bridge is not part of this round.
- Any change to `zeep-kit`, `zeep-core`, or the demo app's existing plugin registration — `zeep-logger` is additive and registered as its own separate `.plugin()` call.

## Design

### Why a separate plugin registration

`tauri_plugin_log::Builder::new().build()` already returns a closed `TauriPlugin<R>` — Tauri does not support nesting one plugin's `TauriPlugin` inside another's `.setup()`/`.invoke_handler()`. This differs from `zeep-kit`, which registers zeep-core's prefs/keychain/shell directly via `app.manage()` and `tauri::generate_handler!` inside its own plugin body. `zeep-logger` cannot merge into `zeep-kit`'s plugin; consumers register both:

```rust
tauri::Builder::default()
    .plugin(zeep_kit::Builder::new().namespace("zeep-demo").build())
    .plugin(zeep_logger::Builder::production().build())
    .run(tauri::generate_context!())
```

This is a new architectural fact for the project (D12's original "compose multiple plugins" idea, deferred by D13 for zeep-kit's own modules, turns out to be required here because the wrapped dependency is itself a closed plugin) — worth recording as its own decision.

### Crate structure

New crate `src-tauri/crates/zeep-logger/`, workspace member alongside `zeep-core`/`zeep-kit`:

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
```

`src-tauri/Cargo.toml`'s `[workspace.dependencies]` gains `zeep-logger = { path = "crates/zeep-logger" }`.

### `Builder` API (`src/lib.rs`)

```rust
use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_log::{Target, TargetKind, RotationStrategy};

pub struct Builder {
    inner: tauri_plugin_log::Builder,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            inner: tauri_plugin_log::Builder::new()
                .format(json_line_formatter),
        }
    }

    pub fn development() -> Self {
        Self::new()
            .level(log::LevelFilter::Debug)
            .targets([Target::new(TargetKind::Stdout), Target::new(TargetKind::Webview)])
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
```

(Exact `tauri_plugin_log` v2 type/method names — `Target`, `TargetKind`, `RotationStrategy`, `.format()`, `.max_file_size()`, `.rotation_strategy()` — must be confirmed against the crate's actual published API during implementation; the plan's first task includes verifying these against `cargo doc`/docs.rs before writing the wrapper, since the design phase worked from research summary, not the crate's source.)

### JSON-per-line formatter

`tauri-plugin-log`'s `.format(fn)` receives a callback with the log record and a writer; the formatter serializes one JSON object per line:

```rust
fn json_line_formatter(
    out: tauri_plugin_log::fern::FormatCallback,
    message: &std::fmt::Arguments,
    record: &log::Record,
) {
    let entry = serde_json::json!({
        "timestamp": time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap_or_default(),
        "level": record.level().to_string(),
        "target": record.target(),
        "message": message.to_string(),
    });
    out.finish(format_args!("{}", entry));
}
```

This satisfies "structured logs" without introducing a second logging backend — `tauri-plugin-log`'s own formatting hook does the work.

### Retention utility

```rust
use std::io;
use tauri::{AppHandle, Manager, Runtime};

pub fn cleanup_old_logs<R: Runtime>(app: &AppHandle<R>, days: u64) -> io::Result<()> {
    let log_dir = app.path().app_log_dir().map_err(io::Error::other)?;
    let cutoff = std::time::SystemTime::now() - std::time::Duration::from_secs(days * 86_400);

    for entry in std::fs::read_dir(&log_dir)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_file() && metadata.modified()? < cutoff {
            std::fs::remove_file(entry.path())?;
        }
    }
    Ok(())
}
```

Consumers call this themselves (e.g. once at app startup) — no scheduler is provided.

## Error handling

- `cleanup_old_logs` returns `io::Result<()>`; a missing/unreadable log directory is a real error surfaced to the caller, not swallowed.
- The JSON formatter never fails the log call itself — if `time` formatting fails, it falls back to an empty string rather than panicking or dropping the log line (logging code must never panic).

## Testing

- Unit tests for the `Builder`: `development()` and `production()` presets construct without panicking and produce a `TauriPlugin<MockRuntime>` (same `tauri::test::MockRuntime` pattern already used in `zeep-kit`'s tests).
- Unit test for the JSON formatter: given a fixed `log::Record`, the formatted output parses as valid JSON with the expected `level`/`target`/`message` fields (timestamp only checked for RFC3339 shape, not exact value, since it's wall-clock).
- Unit tests for `cleanup_old_logs`: using a temp directory (`tempfile` dev-dependency) with files of controlled mtimes, verify files older than the cutoff are removed and newer ones are kept.
