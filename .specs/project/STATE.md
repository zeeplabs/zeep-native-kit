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

---

## Open Questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| Q01 | Styling: vanilla-extract vs plain CSS vars + Tailwind preset? | Julio | **resolved → D09** |
| Q02 | Should zeep-ui ship as a Vite plugin (injects CSS vars) or pure component lib? | Julio | **resolved → D10** |
| Q03 | Storybook for component dev or use the demo Tauri app directly? | Julio | **resolved → D11** |
| Q04 | zeep-logger: write to Tauri log plugin or custom file rotation? | Julio | open |
| Q05 | AI streaming: spawn process + pipe stdout line-by-line or use `tauri-plugin-shell` stream API? | Julio | open |

---

## Blockers

_None yet._

---

## Todos (cross-session)

- [x] Validate Q01 (styling approach) before starting zeep-ui → resolved D09 (CSS vars)
- [x] Check Tauri v2 keychain plugin vs raw `keyring` crate integration → resolved D07 (`keyring` crate)
- [x] **ZT-6** — Implement PrefsStore (PRF-01..PRF-10) in `src-tauri/crates/zeep-core/src/prefs.rs` — done, 19 Rust tests passing across prefs/keychain/shell
- [ ] **NEXT: zeep-kit Builder** — `Builder::namespace()` exists but no `.build()` / `tauri::plugin::Plugin` wiring yet (D12 not yet implemented in code)
- [ ] Set up JS/TS test runner — no `test` script in `@zeep/ui` or `@zeep/core`, Vitest not installed despite PROJECT.md listing it as stack. Zero JS/TS test coverage today.
- [ ] Add unit tests to `zeep-kit` — currently 0 tests
- [ ] Review `tauri-plugin-updater` v2 API before writing zeep-updater spec
- [ ] Research `tauri-plugin-log` to decide zeep-logger approach (wrap vs replace)
- [ ] Resolve Q04: zeep-logger — `tauri-plugin-log` wrap vs custom rotation
- [ ] Resolve Q05: AI streaming — `tokio::process` pipe vs `tauri-plugin-shell` stream API

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
| L03 | `pnpm -r test` runs 0 tests silently (exit 0) because `@zeep/ui` and `@zeep/core` have no `test` script and Vitest isn't installed — despite PROJECT.md listing Vitest + Testing Library as the UI test stack. `cargo test --workspace` is real: 19 passing tests in zeep-core (prefs/keychain/shell), 0 in zeep-kit. JS/TS coverage is 0%. | 2026-07-13 |

---

## Preferences

_No session preferences recorded yet._
