# STATE — zeep-native-kit

_Persistent memory across sessions: decisions, blockers, lessons, todos, deferred ideas._

---

## Decisions

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| D01 | Use Tauri v2 only | v2 has stable plugin system, better security model (capabilities), CSP hardened | 2026-06-26 |
| D02 | pnpm monorepo + Cargo workspace | Single repo, shared tooling, Changesets for versioning | 2026-06-26 |
| D03 | CSS variables for theming (not CSS-in-JS) | Zero runtime cost, works with Tauri's CSP, easier for consumers to override | 2026-06-26 |
| D04 | Local AI CLIs only (no API key) | Follows cortex-kit pattern — user already has claude/codex authenticated; no token cost | 2026-06-26 |
| D05 | macOS as primary target, Windows/Linux must not break | ZeepFly apps are macOS-first; cross-platform is a constraint not a goal | 2026-06-26 |
| D06 | Rust MSRV = 1.80 | Tauri v2 minimum; stable async traits needed for AI streaming | 2026-06-26 |
| D07 | Keychain via `keyring` crate | Cross-platform: macOS Keychain, Windows Credential Manager, Linux Secret Service | 2026-06-26 |
| D08 | ShellRunner uses `tokio::process` with PATH resolution | Tauri sandbox doesn't inherit full PATH on macOS (Finder launch); must resolve manually | 2026-06-26 |
| D09 | Styling via pure CSS custom properties (`--zeep-*`) | Zero runtime, Tauri CSP compatible, consumers override with one var | 2026-06-26 |
| D10 | zeep-ui ships as pure component lib (no Vite plugin) | Simpler DX; ZeepProvider injects tokens at React mount time | 2026-06-26 |
| D11 | Component dev in demo Tauri app (`apps/demo/`) | Tests real Tauri integration; no extra tooling; UIGallery page covers all components | 2026-06-26 |
| D12 | zeep-kit usa `tauri::plugin::Plugin` internamente + API fluente própria (`zeep_kit::Builder`) | Tauri v2 exige capabilities declaradas por plugin; sem isso comandos bloqueados em produção. Plugin pattern declara permissions automaticamente, eliminando configuração manual pelo consumidor | 2026-06-26 |
| D13 | zeep-kit Builder derives keychain service as `dev.zeep.{namespace}`, registers prefs+keychain+shell together (no per-module opt-in) | Simplest correct implementation of D12; per-module opt-in deferred until zeep-logger/zeep-ai exist (YAGNI) | 2026-07-13 |
| D14 | zeep-logger wraps `tauri-plugin-log` (2.8.0) instead of custom file rotation; registered as its own separate `.plugin()` call, not merged into zeep-kit's plugin | `tauri_plugin_log::Builder::build()` already returns a closed `TauriPlugin<R>` — can't nest one plugin inside another's setup/invoke_handler. Resolves Q04 | 2026-07-13 |
| D15 | zeep-ai's `AIRunner::run_stream` (RUN-02) extends `zeep-core::ShellRunner`'s existing `shell_run_stream` (raw `tokio::process`, already in `shell.rs:137-194`) instead of adopting `tauri-plugin-shell`'s Command API | `tauri-plugin-shell` requires each binary pre-declared in capabilities JSON (no dynamic/wildcard path), which conflicts with DET-01's runtime CLI detection; its stdout events are byte chunks anyway (no line-buffering advantage); `shell_run_stream` already solves per-line emit + D08 PATH resolution. Resolves Q05. **Open validation before RUN-07 implementation:** neither `tokio::process::Child::kill()` nor `tauri-plugin-shell`'s equivalent documents process-group kill — if `claude`/`codex`/`ollama` spawn subprocesses, direct-PID kill may orphan them; needs `setsid`/`libc::killpg` check before cancellation ships | 2026-07-13 |
| D20 | License: dual MIT OR Apache-2.0 (kept, not changed) — `LICENSE-MIT` + `LICENSE-APACHE` files added at repo root | Every `package.json`/`Cargo.toml` already declared `"license": "MIT OR Apache-2.0"` since M5, but no LICENSE file ever existed — legally unenforceable claim. Rust ecosystem convention (Cargo/rustc itself use this dual). Rejected LGPL: Rust static linking makes LGPL's dynamic-relink guarantee impractical to honor, would create GPL-like friction for consumers embedding zeep-native-kit in closed-source Tauri apps — contradicts the kit's own goal of zero-friction adoption | 2026-08-08 |

---

## Open Questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| Q01 | Styling: vanilla-extract vs plain CSS vars + Tailwind preset? | Julio | **resolved → D09** |
| Q02 | Should zeep-ui ship as a Vite plugin (injects CSS vars) or pure component lib? | Julio | **resolved → D10** |
| Q03 | Storybook for component dev or use the demo Tauri app directly? | Julio | **resolved → D11** |
| Q04 | zeep-logger: write to Tauri log plugin or custom file rotation? | Julio | **resolved → D14** |
| Q05 | AI streaming: spawn process + pipe stdout line-by-line or use `tauri-plugin-shell` stream API? | Julio | **resolved → D15** |

---

## Blockers

_None yet._

---

## Todos (cross-session)

- [x] Validate Q01 (styling approach) before starting zeep-ui → resolved D09 (CSS vars)
- [x] Check Tauri v2 keychain plugin vs raw `keyring` crate integration → resolved D07 (`keyring` crate)
- [x] **ZT-6** — Implement PrefsStore (PRF-01..PRF-10) in `src-tauri/crates/zeep-core/src/prefs.rs` — done, 19 Rust tests passing across prefs/keychain/shell
- [x] **zeep-kit Builder** — `Builder::build()` now returns a real `tauri::plugin::TauriPlugin<R>` with declared `zeep-kit:default` permissions (D12 implemented); `apps/demo` migrated to `.plugin(zeep_kit::Builder::new().namespace(...).build())`. zeep-kit test count: 0 → 3.
- [x] **M1 close** — Vitest set up in `@zeeptech/core` (11 tests, node env, mocks `invoke`) and `@zeeptech/ui` (15 tests across 9 component files, jsdom + Testing Library). `apps/demo` gained `@zeeptech/core` dependency + a "Native Kit" section in `UIGallery.tsx` wiring real `prefsGet/Set`, `keychainGet/Set`, `shellWhich` calls. Merged to `main` (`e683802..d36a111`).
- [x] **M1 close — manual QA** — clicked through Native Kit section for real (`pnpm tauri dev`). Found and fixed a real bug the static IPC-contract check missed: `@zeeptech/core`'s `invoke()` calls used bare command names (`"prefs_get"`) left over from before `zeep-kit` became a real Tauri plugin — Tauri v2 auto-namespaces plugin commands as `plugin:zeep-kit|prefs_get`, so every call failed with "Command X not found" until fixed (commit `d890422`). Also fixed native window showing OS-white title bar/initial paint (no `backgroundColor` in `tauri.conf.json`) — same commit. **M1 (Foundation) is now genuinely done**, capability proven end-to-end by a human click, not just compile/log inspection.
- [x] **zeep-logger** — new crate wrapping `tauri-plugin-log` (D14, resolves Q04). `zeep_logger::Builder` (dev/production presets), JSON-per-line formatter, `cleanup_old_logs` retention util. 5 Rust tests. Merged to `main` (`f6e063a..3233483`). No log viewer UI yet (deferred).
- [x] **zeep-logger demo wiring** — `apps/demo/src-tauri/src/lib.rs` registers `.plugin(zeep_logger::Builder::development().build())` + calls `cleanup_old_logs(app.handle(), 14)` in `.setup()`. `cargo check` clean; no capability declaration needed (plugin exposes no frontend-invokable commands).
- [x] Review `tauri-plugin-updater` v2 API before writing zeep-updater spec — confirmed against docs.rs 2.10.1: `UpdaterExt` trait adds `.updater() -> Result<Updater>` / `.updater_builder() -> UpdaterBuilder` to `App`/`AppHandle`/`WebviewWindow`/etc; `handle.updater()?.check().await` returns update info; `Builder` (registered via `.plugin()`) configures endpoints/pubkey/target/headers/version-comparator. Rust-callable, not just JS commands.
- [x] **zeep-updater** — new crate wrapping `tauri-plugin-updater` (2.10.1). `zeep_updater::Builder` (`new`/`pubkey`/`target`/`build`), hardcoded semver gate `is_stable_and_newer` (stable-only, strictly newer than current) via `default_version_comparator`. `build<R: Runtime>() -> TauriPlugin<R, Config>` (two type params, unlike zeep-kit/zeep-logger's single-param form — API-mandated). 4 Rust tests. Merged to `main` (`65c65ad..865f8f7`). No demo wiring yet (deferred, same pattern as zeep-logger); no UpdateBanner UI.
- [x] **zeep-updater demo wiring** — registered `.plugin(zeep_updater::Builder::new().pubkey(PK).build())` in `apps/demo/src-tauri/src/lib.rs`. Signing key generated (`f750321bc...`), private key in `apps/demo/src-tauri/.env.local`. Capability `"updater:default"` added.
- [x] **M3 Logger — Rust commands + ring buffer** — zeep-logger crate refactored to a standalone plugin (no longer wraps tauri-plugin-log). Ring buffer (1000 entries), Tauri commands `logger_set_level`/`logger_get_entries`, rotating file writer, LogTarget enum (Stdout/Stderr/LogDir/Folder/Webview). `build()` returns TauriPlugin named `"zeep-logger"` with setup + invoke_handler. JSON-per-line format with ring buffer push and event channel for Webview target.
- [x] **M3 Updater — Rust commands** — tauri-plugin-updater already registers `check`/`download`/`install`/`download_and_install` commands. zeep-updater continues to wrap the inner builder with semver gate. No additional Rust commands needed.
- [x] **M3 @zeeptech/logger** — New package: LogViewer (virtualized, color-coded, filter by level/text, export JSON, auto-scroll), LogLevelSelector (5 level buttons, calls `logger_set_level`), useLogEvents (listens to `log://log` event). Vitest setup with jsdom.
- [x] **M3 @zeeptech/updater** — New package: UpdateBanner (version + notes + Update Now/Later), UpdateProgress (bar with %), UpdateReadyDialog (modal for restart), useUpdater hook (check/install/restart/dismiss state machine with Channel-based progress events). Vitest setup with jsdom.
- [x] **M3 Demo wiring** — UIGallery.tsx gain new Logger section (show/hide LogViewer + LogLevelSelector) and Updater section (Check for Updates button + UpdateBanner/UpdateProgress/UpdateReadyDialog). `apps/demo/package.json` depends on both new packages.
- [x] Resolve Q05 → D15: extend `zeep-core::ShellRunner::shell_run_stream` for `zeep-ai`'s RUN-02, not `tauri-plugin-shell`
- [x] **Opensource governance pass** (2026-08-08) — repo had no LICENSE file despite every package.json/Cargo.toml declaring one (see D20). Added `LICENSE-MIT`, `LICENSE-APACHE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`. Root `package.json` gained `license`/`repository`/`homepage`/`bugs` fields (packages already had them, root didn't)
- [x] **README rewrite + i18n** (2026-08-08) — root `README.md` translated PT→EN (was mixed PT content under English headers), added CI/license/Node/Rust/Tauri badges, TOC, and an "Installation / Publication Status" section that stops promising `pnpm add @zeeptech/kit` as if it already worked (it doesn't — 404 on npm, confirmed live). Added Roadmap/Contributing/Security/Code of Conduct sections linking the new governance files. Portuguese and Spanish translations moved to `i18n/README.pt-BR.md` / `i18n/README.es.md` with a language-selector line and relative links back to root-level files (`../LICENSE-MIT`, etc.)
- [ ] **Open follow-up:** none of the above is reflected yet in `.specs/project/PROJECT.md` or the feature specs — only tracked here and in the vault project index. Root `pnpm lint` no-op (no package defines a `lint` script) is now documented in CONTRIBUTING.md as a known limitation instead of silently misleading contributors

---

## Deferred Ideas

| Idea | Reason deferred | Revisit |
|------|-----------------|---------|
| Vue/Svelte adapters for zeep-ui | Out of scope v1; would require full component rewrite | v2 |
| Cloud prefs sync (iCloud/S3) | Adds auth complexity; local-first is the principle | v2 |
| Bundled WASM AI model (e.g. llama.cpp) | Binary size, no standardized Tauri WASM GPU path yet | future |
| Plugin registry / marketplace | Too early; need dogfooding first | future |
| iOS/Android via Tauri Mobile | zeep-native-kit is desktop-first by design | future |

---

## Lessons

| ID | Lesson | Date |
|----|--------|------|
| L01 | `tauri-build::build()` always requires `src-tauri/icons/icon.png` at compile time, even with `bundle.icon = []` in tauri.conf.json. `cargo check` fails with "failed to open icon icons/icon.png: No such file or directory". Fix: create a minimal valid PNG placeholder (1x1 pixel) in `icons/`. | 2026-06-26 |
| L02 | `apps/demo/src-tauri/` must be a separate Cargo workspace from the main `src-tauri/` workspace. Reference library crates via path dependency: `zeep-core = { path = "../../../src-tauri/crates/zeep-core" }`. Cargo resolves each workspace's deps independently — no conflicts. | 2026-06-26 |
| L03 | `pnpm -r test` runs 0 tests silently (exit 0) because `@zeeptech/ui` and `@zeeptech/core` have no `test` script and Vitest isn't installed — despite PROJECT.md listing Vitest + Testing Library as the UI test stack. `cargo test --workspace` is real: 19 passing tests in zeep-core (prefs/keychain/shell), 0 in zeep-kit. JS/TS coverage is 0%. | 2026-07-13 |
| L04 | jsdom's `disabled` button CSS (`pointer-events: none`, set by `@zeeptech/ui`'s own `Button.tsx`) makes `@testing-library/user-event`'s default `click()` throw — real component behavior, not a test bug. Fix: `userEvent.click(btn, { pointerEventsCheck: 0 })` when the assertion under test is "onClick does not fire," not "the click physically succeeds." | 2026-07-13 |
| L05 | Compile-time + startup-log verification (`tsc`/`vite build` pass, `tauri dev` boots with no capability/IPC errors) proves the plugin registers and the capability resolves — it does NOT prove a click-through round-trip works. A handler-side serialization bug only surfaces on actual invocation. Static IPC-contract tracing (arg names in JS match Rust command params, command is in `generate_handler!`, permission covers it) is a reasonable substitute when no display is available, but real manual QA is still owed before calling the feature done. | 2026-07-13 |
| L06 | L05's caveat was real, not theoretical: manual click-through immediately found a bug the static contract check missed — `@zeeptech/core`'s `invoke("prefs_get", ...)` calls used bare command names, but Tauri v2 auto-namespaces commands registered inside a plugin's `invoke_handler` as `plugin:<plugin-name>|<command>`. Arg-shape/permission tracing can't catch this because the mismatch is purely in the invoke() *command string*, not the args or the ACL. Every `@zeeptech/core` wrapper needed the `plugin:zeep-kit|` prefix added. | 2026-07-13 |
| L07 | Tauri v2 window config needs an explicit `backgroundColor` (hex) in `tauri.conf.json`'s `app.windows[]` entry, or the native title bar and initial paint default to OS white regardless of the app's CSS theme tokens — the webview content can be correctly dark while the native chrome around it stays white. Not something `@zeeptech/ui`'s `injectTokens` can fix (it only sets CSS vars inside the DOM, not the native window's own background). | 2026-07-13 |

---

## Preferences

_No session preferences recorded yet._
