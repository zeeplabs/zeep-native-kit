# zeep-updater — Spec

## Overview
Auto-update integration for Tauri v2 apps. Wraps `tauri-plugin-updater` with a higher-level API and ready-made React components.

---

## Requirements

### CHK · Update Check (Rust)

| ID | Requirement |
|----|-------------|
| CHK-01 | `updater_check` Tauri command checks for a new version against the configured endpoint |
| CHK-02 | Returns `UpdateInfo`: `{ available: bool, version?: string, notes?: string, pub_date?: string }` |
| CHK-03 | Check is non-blocking; result emitted as Tauri event `updater:check-result` |
| CHK-04 | Automatic check on app start, configurable via `updater_set_auto_check(enabled, interval_hours)` |
| CHK-05 | Auto-check interval stored in PrefsStore; default 24 h |
| CHK-06 | Endpoint URL set at `configure()` time; cannot change at runtime |

### DWN · Download & Install (Rust)

| ID | Requirement |
|----|-------------|
| DWN-01 | `updater_download_and_install` Tauri command starts the update process |
| DWN-02 | Emits Tauri events: `updater:progress` `{ downloaded, total }`, `updater:ready`, `updater:error` |
| DWN-03 | `updater_restart` Tauri command quits and relaunches to apply the update |
| DWN-04 | Download can be cancelled via `updater_cancel` (stops mid-download; no partial apply) |
| DWN-05 | Signature verification is required; installer rejects unsigned packages |

### UI · Update Components (React)

| ID | Requirement |
|----|-------------|
| UI-01 | `<UpdateBanner>` appears at top of app when update available; shows version + release notes |
| UI-02 | Banner has `"Update Now"` and `"Later"` actions |
| UI-03 | `"Later"` dismisses for current session; re-appears next launch |
| UI-04 | `<UpdateProgress>` shows download progress bar while update downloads |
| UI-05 | `<UpdateReadyDialog>` modal that appears when update is ready to install; confirms restart |
| UI-06 | `useUpdater()` hook exposes `{ updateInfo, status, check, install, restart }` |
| UI-07 | All update UI components inherit ZeepProvider theme |

---

## Out of Scope (zeep-updater v1)

- Delta / patch updates
- Forced updates (cannot block app launch)
- Rollback to previous version

---

## Testing

- Rust: mock updater endpoint, test check/download/install state machine
- React: hook state transitions, banner appears when `updateInfo.available`, progress bar receives events
