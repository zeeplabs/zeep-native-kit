# zeep-updater: Auto-Update Crate — Design

## Problem

M3 (per ROADMAP.md) requires a `zeep-updater` crate providing Tauri updater integration, an `UpdateBanner` component, and a "semver gate." Today there is zero code for it.

## Goals

- Wrap `tauri-plugin-updater` (v2.10.1, confirmed against docs.rs) in a `zeep_updater::Builder` consistent in style with `zeep_kit::Builder`/`zeep_logger::Builder`.
- Implement the "semver gate": only treat a remote release as an available update if its version is a stable release (no pre-release identifier) AND strictly greater than the currently installed version. Wired in as the default `default_version_comparator`.
- Allow `pubkey()` and `target()` passthrough for consumers who need them (same as the wrapped crate exposes).

## Non-goals

- `UpdateBanner` UI component (`@zeep/ui`) — deferred to a separate spec/plan round, per explicit scope decision (same pattern as zeep-logger's log viewer).
- Download/install orchestration UI or CLI — this crate only configures the plugin and the version gate; calling `.check()`/`.download_and_install()` is left to the consuming app (same division of responsibility zeep-kit/zeep-logger established: the crate provides the plugin + policy, the app decides when/how to invoke it).
- Any change to `zeep-kit`, `zeep-core`, `zeep-logger`, or `apps/demo`'s existing plugin registrations — additive only, registered as its own `.plugin()` call.
- Custom/configurable version-gate closures for consumers in this round — the default gate (stable + greater-than) is hardcoded; a `.version_comparator(fn)` override point can be added later if a real need arises (YAGNI).

## Design

### Why `TauriPlugin<R, Config>`, not `TauriPlugin<R>`

`tauri_plugin_updater::Builder::build<R: Runtime>(self) -> TauriPlugin<R, Config>` has a second type parameter — different from `zeep-kit`'s and `zeep-logger`'s wrapped builders, which both return the single-parameter `TauriPlugin<R>`. `zeep_updater::Builder::build()` must forward this exact two-parameter type, not the shape used by the other two zeep-native-kit crates. This is a real, confirmed API difference (not a typo) — call it out explicitly in the plan so the implementer doesn't "fix" it to match the other crates' signature.

### Crate structure

New crate `src-tauri/crates/zeep-updater/`, workspace member alongside `zeep-core`/`zeep-kit`/`zeep-logger`:

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
```

`src-tauri/Cargo.toml`'s `[workspace.dependencies]` gains `zeep-updater = { path = "crates/zeep-updater" }`.

### `Builder` API (`src/lib.rs`)

```rust
use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_updater::{Config, RemoteRelease};

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

fn is_stable_and_newer(current: semver::Version, remote: RemoteRelease) -> bool {
    remote.version.pre.is_empty() && remote.version > current
}
```

(Confirmed against `tauri-plugin-updater` 2.10.1 docs.rs: `Builder::new() -> Self`; `Builder::pubkey<S: Into<String>>(self, pubkey: S) -> Self`; `Builder::target(self, target: impl Into<String>) -> Self`; `Builder::default_version_comparator<F: Fn(Version, RemoteRelease) -> bool + Send + Sync + 'static>(self, f: F) -> Self`; `Builder::build<R: Runtime>(self) -> TauriPlugin<R, Config>`; `RemoteRelease.version: semver::Version` field, with `Version.pre` — a `semver::Prerelease` — empty when the version is a stable release.)

### Consuming apps register it like the other zeep-native-kit plugins

```rust
tauri::Builder::default()
    .plugin(zeep_kit::Builder::new().namespace("zeep-demo").build())
    .plugin(zeep_logger::Builder::development().build())
    .plugin(zeep_updater::Builder::new().build())
    .run(tauri::generate_context!())
```

Checking/downloading/installing an update from the app's own code uses `tauri_plugin_updater::UpdaterExt` directly (`app.updater()?.check().await`) — `zeep-updater` does not wrap that call surface in this round; it only configures the plugin and the gate.

## Error handling

- `is_stable_and_newer` never panics — `semver::Version` comparison and `Prerelease::is_empty()` are total, pure functions with no fallible paths.
- No new fallible surface is introduced beyond what `tauri_plugin_updater` itself already exposes (`Result<Updater>`, `check().await` errors) — this crate doesn't call those, so it has nothing new to handle.

## Testing

- Unit test: `Builder::new().build::<tauri::test::MockRuntime>()` constructs without panicking (same `MockRuntime` pattern as zeep-kit/zeep-logger). Plugin name assertion checked against whatever `tauri-plugin-updater` actually registers as (confirm the real string when running the test, same caveat as zeep-logger's `"log"` name).
- Unit tests for `is_stable_and_newer`: table of cases — stable-and-greater (true), stable-and-equal (false), stable-and-lesser (false), pre-release-and-greater (false, rejected purely for being pre-release). Constructing `RemoteRelease` directly for tests may not be possible if its fields are private/non-constructible outside the crate — if so, extract the comparator's core logic into a pure function taking `(current: Version, remote_version: Version, remote_is_prerelease: bool) -> bool` that `is_stable_and_newer` delegates to, and test that pure function directly. Prefer this extraction proactively rather than discovering the constructibility problem mid-implementation.
