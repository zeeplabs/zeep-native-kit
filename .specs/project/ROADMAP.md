# Roadmap — zeep-native-kit

## Milestones

### M1 · Foundation (v0.1) ✅
Goal: monorepo up, Tauri scaffold, CI green, first Rust commands wired.

- [x] Monorepo structure (pnpm workspaces + Cargo workspace)
- [x] Tauri v2 app scaffold (`zeep-native-kit-demo`)
- [ ] CI pipeline (GitHub Actions: lint, test, build on macOS + Windows) — *not started*
- [ ] Changesets release workflow — *not started*
- [x] **zeep-core** v0.1 — PrefsStore + Keychain + ShellRunner

### M2 · UI System (v0.2) ✅
Goal: apps can drop in the design system and get branded in one call.

- [x] **zeep-ui** v0.1 — design tokens, theme system, AnimatedBackground
- [x] **zeep-ui** v0.2 — GlassCard, ShimmerText, AccentTheme palette
- [x] **zeep-ui** v0.3 — Button variants, StatusDot, ToastProvider
- [x] **zeep-ui** v0.4 — SkeletonLoader, MarkdownRenderer, SearchHighlight
- [ ] Storybook / component catalog (internal) — *deferred*

### M3 · Logger + Updater (v0.3) ✅
Goal: production-grade observability and self-updating apps.

- [x] **zeep-logger** — structured logs (JSON-per-line, ring buffer, file rotation), Tauri commands (logger_set_level, logger_get_entries), rotating file writer
- [x] **zeep-logger** React package — LogViewer, LogLevelSelector, useLogEvents hook
- [x] **zeep-updater** — Tauri updater integration, semver gate, demo wiring with signing key
- [x] **zeep-updater** React package — UpdateBanner, UpdateProgress, UpdateReadyDialog, useUpdater hook

### M4 · AI Integration (v0.4) ✅
Goal: any app can call the user's local AI CLI in 3 lines.

- [x] **zeep-ai** — CLI detection (claude/codex/ollama/llm/opencode), streaming runner with process group kill, response parser
- [x] AIText utilities (stripFences, truncate, firstLine, extractJson)
- [x] Demo: AI section in UIGallery with provider picker, prompt input, streaming response

### M5 · Umbrella + Docs (v1.0)
Goal: stable public API, full docs, published to npm + crates.io.

- [x] **zeep-kit** umbrella package — `@zeep/kit` barrel re-exportando todos os módulos
- [x] `configure()` top-level API — `zeep_kit::Builder::install(tauri::Builder)`
- [x] README + API docs (TypeDoc + rustdoc)
- [x] Migration guide from raw Tauri
- [ ] Publish v1.0.0

---

## Features Index

| Feature | Module | Milestone | Status |
|---------|--------|-----------|--------|
| Design tokens & CSS vars | zeep-ui | M2 | **done** |
| Animated background | zeep-ui | M2 | **done** |
| Glass card component | zeep-ui | M2 | **done** |
| Accent theme palette | zeep-ui | M2 | **done** |
| Button variants | zeep-ui | M2 | **done** |
| Toast / notification | zeep-ui | M2 | **done** |
| Skeleton loader | zeep-ui | M2 | **done** |
| Markdown renderer | zeep-ui | M2 | **done** |
| PrefsStore (Rust) | zeep-core | M1 | **done** |
| Keychain (Rust) | zeep-core | M1 | **done** |
| ShellRunner (Rust) | zeep-core | M1 | **done** |
| Structured logger | zeep-logger | M3 | **done** |
| Log viewer component | zeep-logger | M3 | **done** |
| Auto-updater | zeep-updater | M3 | **done** |
| Update UI | zeep-updater | M3 | **done** |
| AI CLI detection | zeep-ai | M4 | **done** |
| AI streaming runner | zeep-ai | M4 | **done** |
| @zeep/kit barrel | zeep-kit | M5 | **done** |
| configure() top-level API | zeep-kit | M5 | **done** |
| CI pipeline | infra | M1 | **done** |
| Changesets release | infra | M1 | **done** |
| README + API docs | docs | M5 | pending |
| Publish v1.0.0 | release | M5 | pending |
