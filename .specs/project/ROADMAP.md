# Roadmap — zeep-native-kit

## Milestones

### M1 · Foundation (v0.1)
Goal: monorepo up, Tauri scaffold, CI green, first Rust commands wired.

- [ ] Monorepo structure (pnpm workspaces + Cargo workspace)
- [ ] Tauri v2 app scaffold (`zeep-native-kit-demo`)
- [ ] CI pipeline (GitHub Actions: lint, test, build on macOS + Windows)
- [ ] Changesets release workflow
- [ ] **zeep-core** v0.1 — PrefsStore + Keychain + ShellRunner

### M2 · UI System (v0.2)
Goal: apps can drop in the design system and get branded in one call.

- [ ] **zeep-ui** v0.1 — design tokens, theme system, AnimatedBackground
- [ ] **zeep-ui** v0.2 — GlassCard, ShimmerText, AccentTheme palette
- [ ] **zeep-ui** v0.3 — Button variants, StatusDot, ToastProvider
- [ ] **zeep-ui** v0.4 — SkeletonLoader, MarkdownRenderer, SearchHighlight
- [ ] Storybook / component catalog (internal)

### M3 · Logger + Updater (v0.3)
Goal: production-grade observability and self-updating apps.

- [ ] **zeep-logger** — structured logs, log viewer component, file rotation
- [ ] **zeep-updater** — Tauri updater integration, UpdateBanner component, semver gate

### M4 · AI Integration (v0.4)
Goal: any app can call the user's local AI CLI in 3 lines.

- [ ] **zeep-ai** — CLI detection (claude/codex/ollama), streaming runner, response parser
- [ ] AIText utilities (strip fences, truncate, first-line)
- [ ] Demo: AI-powered command palette in the demo app

### M5 · Umbrella + Docs (v1.0)
Goal: stable public API, full docs, published to npm + crates.io.

- [ ] **zeep-kit** umbrella package — re-exports all modules
- [ ] `configure()` top-level API
- [ ] README + API docs (TypeDoc + rustdoc)
- [ ] Migration guide from raw Tauri
- [ ] Publish v1.0.0

---

## Features Index

| Feature | Module | Milestone | Status |
|---------|--------|-----------|--------|
| Design tokens & CSS vars | zeep-ui | M2 | planned |
| Animated background | zeep-ui | M2 | planned |
| Glass card component | zeep-ui | M2 | planned |
| Accent theme palette | zeep-ui | M2 | planned |
| Button variants | zeep-ui | M2 | planned |
| Toast / notification | zeep-ui | M2 | planned |
| Skeleton loader | zeep-ui | M2 | planned |
| Markdown renderer | zeep-ui | M2 | planned |
| PrefsStore (Rust) | zeep-core | M1 | planned |
| Keychain (Rust) | zeep-core | M1 | planned |
| ShellRunner (Rust) | zeep-core | M1 | planned |
| Structured logger | zeep-logger | M3 | planned |
| Log viewer component | zeep-logger | M3 | planned |
| Auto-updater | zeep-updater | M3 | planned |
| Update UI | zeep-updater | M3 | planned |
| AI CLI detection | zeep-ai | M4 | planned |
| AI streaming runner | zeep-ai | M4 | planned |
| configure() umbrella | zeep-kit | M5 | planned |
