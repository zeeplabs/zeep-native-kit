# zeep-logger — Spec

## Overview
Structured logging for Tauri apps. Rust side writes logs; React side can read and display them. Wraps or extends `tauri-plugin-log`.

---

## Requirements

### LOG · Logger (Rust)

| ID | Requirement |
|----|-------------|
| LOG-01 | Log levels: `trace`, `debug`, `info`, `warn`, `error` |
| LOG-02 | Each log entry: `{ timestamp: ISO8601, level, target, message, fields: Map<String,Value> }` |
| LOG-03 | Structured fields via `log_info!("msg", key = value, ...)` macro |
| LOG-04 | Writes to file at `{app_log_dir}/{namespace}.log` |
| LOG-05 | File rotation: max 5 MB per file, keep last 3 files |
| LOG-06 | Also emits Tauri event `log:entry` for real-time log viewer in UI |
| LOG-07 | Minimum log level configurable at runtime via `logger_set_level` command |
| LOG-08 | Tauri commands exposed: `logger_set_level`, `logger_get_entries` (last N) |
| LOG-09 | `logger_get_entries` returns up to 1000 most recent entries from the in-memory ring buffer |
| LOG-10 | Log level persisted in PrefsStore so it survives restarts |

### VWR · Log Viewer Component (React)

| ID | Requirement |
|----|-------------|
| VWR-01 | `<LogViewer>` renders a virtualized list of log entries (react-window or similar) |
| VWR-02 | Color-coded by level: trace=muted, debug=blue, info=green, warn=amber, error=red |
| VWR-03 | Filter by level (multi-select) and free-text search |
| VWR-04 | Auto-scroll to bottom; pauses when user scrolls up |
| VWR-05 | Copy single entry or export all visible to clipboard as JSON |
| VWR-06 | `<LogLevelSelector>` component tied to `logger_set_level` command |
| VWR-07 | Live updates via `log:entry` Tauri event subscription |

---

## Out of Scope (zeep-logger v1)

- Log shipping to external services (Datadog, Sentry)
- Structured query language for log search
- Binary log format

---

## Testing

- Rust: log entry format, rotation trigger, ring buffer capacity
- React: VWR renders entries, filter reduces list, auto-scroll behavior
