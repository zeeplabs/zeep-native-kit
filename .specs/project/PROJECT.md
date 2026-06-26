# zeep-native-kit

## Vision

A versioned npm + crate library that gives any Tauri app a polished, desktop-first baseline in one `configure()` call.

Every Tauri app re-implements the same plumbing: a design system, secure storage, shell execution, preferences, logging, auto-updater, and "call the local AI CLI the user already has." zeep-native-kit packages all of that — once, tested, versioned.

Inspired by [getcortexlabs/cortex-kit](https://github.com/getcortexlabs/cortex-kit) (Swift/macOS), adapted for the Tauri + Rust + React stack.

---

## Goals

| # | Goal |
|---|------|
| G1 | Drop-in: one `configure()` call sets up brand identity, theme, and all subsystems |
| G2 | Premium UI out-of-the-box: animated backgrounds, glass cards, accent themes, typography |
| G3 | Rust-side plumbing exposed as Tauri commands: shell, keychain, prefs, logger, updater |
| G4 | Local AI integration with zero API keys — runs `claude`, `codex`, or any AI CLI the user has |
| G5 | Modular consumption — apps pull only the modules they need |
| G6 | Cross-platform Tauri target: macOS primary, Windows/Linux secondary |
| G7 | Zero mandatory third-party JS dependencies in core UI (Radix primitives allowed, no heavy frameworks) |

---

## Constraints

- **Tauri v2** only (not v1)
- React 18+ (no Vue, no Svelte adapter in v1)
- Rust stable toolchain (MSRV = 1.80)
- macOS is the primary design target; Windows/Linux must not break
- No API keys stored or required for AI features
- LGPL-compatible or MIT/Apache-2 for all dependencies

---

## Non-Goals (v1)

- Vue / Svelte / Solid UI adapters
- Mobile (iOS/Android via Tauri Mobile)
- Cloud sync for preferences
- Bundled AI models (use system CLIs only)
- Plugin marketplace / registry

---

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | Tauri v2 |
| Frontend | React 18 + TypeScript |
| Styling | CSS variables + design tokens (vanilla-extract TBD) |
| Bundler | Vite 5 |
| Rust | Stable 1.80+ |
| Package manager | pnpm (monorepo) |
| Testing (UI) | Vitest + Testing Library |
| Testing (Rust) | `cargo test` + integration harness |
| Release | Changesets |

---

## Team

| Role | Owner |
|------|-------|
| Architecture & Rust | Julio Sousa |
| UI/Design | TBD |
| Release management | Julio Sousa |
