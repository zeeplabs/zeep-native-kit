# zeep-kit (umbrella) — Spec

## Overview
Top-level entry point. Re-exports all modules. Fornece `zeep_kit::Builder` — builder fluente que registra todos os módulos como Tauri v2 plugins.

Equivalent to: `import CortexKit` in Swift.

**Decisão arquitetural (D12):** cada módulo implementa `tauri::plugin::Plugin` internamente. zeep-kit expõe API fluente própria que compõe os plugins e delega para `tauri::Builder`. Capabilities/permissions do Tauri v2 são declaradas automaticamente pelos plugins — consumidor não precisa configurar manualmente.

---

## Requirements

### CFG · zeep_kit::Builder

| ID | Requirement |
|----|-------------|
| CFG-01 | `zeep_kit::Builder::new()` inicia o builder fluente |
| CFG-02 | `.namespace("dev.myapp")` — define namespace do PrefsStore e serviço no Keychain |
| CFG-03 | `.updater(endpoint: &str)` — habilita auto-updater com endpoint informado |
| CFG-04 | `.log_level(LevelFilter)` — define log level inicial (default: `Info`) |
| CFG-05 | `.log_dir(PathBuf)` — sobrescreve diretório padrão de logs |
| CFG-06 | `.build(tauri::Builder::default())` — registra todos os plugins, retorna `tauri::Builder` pronto para `.run()` |
| CFG-07 | Cada módulo expõe `pub fn plugin() -> TauriPlugin<Wasm>` usado internamente pelo Builder |
| CFG-08 | Emite evento Tauri `zeep:ready` quando todos os subsistemas estão inicializados |
| CFG-09 | Cada crate declara `permissions/` no padrão Tauri v2 plugin (auto-descoberto pelo Tauri CLI) |
| CFG-10 | Consumidor NÃO precisa declarar comandos manualmente em `capabilities/*.json` |

**API esperada (main.rs do consumidor):**
```rust
fn main() {
    zeep_kit::Builder::new()
        .namespace("dev.myapp")
        .log_level(LevelFilter::Info)
        .updater("https://releases.myapp.com/update.json")
        .build(tauri::Builder::default())
        .run(tauri::generate_context!())
        .unwrap();
}
```

**Implementação interna (transparente ao consumidor):**
```rust
// O que Builder::build() faz internamente:
tauri_builder
    .plugin(zeep_core::plugin())
    .plugin(zeep_logger::plugin())
    .plugin(zeep_updater::plugin())
    .plugin(zeep_ai::plugin())
```

### JS · ZeepProvider (React umbrella)

| ID | Requirement |
|----|-------------|
| JS-01 | `ZeepProvider` from `@zeeptech/kit` re-exports ZeepProvider from `@zeeptech/ui` |
| JS-02 | `configure` from `@zeeptech/kit/tauri` is a React hook that waits for `zeep:ready` event |
| JS-03 | `@zeeptech/kit` re-exports all hooks and components from `@zeeptech/ui`, `@zeeptech/ai`, `@zeeptech/logger`, `@zeeptech/updater` |
| JS-04 | Tree-shaking: each module is a separate entry point; `@zeeptech/kit` is a convenience barrel |

### MOD · Module Granularity

| ID | Requirement |
|----|-------------|
| MOD-01 | Consumer can use `@zeeptech/core` alone (no UI dependency) for CLI tools |
| MOD-02 | Consumer can use `@zeeptech/ui` alone (no Rust commands) for web-only preview |
| MOD-03 | Rust crate `zeep-core` can be used independently without the full `zeep-kit` feature flags |
| MOD-04 | Each npm package has its own `package.json` and is independently versioned via Changesets |

### PKG · Package Structure

```
packages/
  @zeeptech/
    core/          # Tauri commands TypeScript bindings + Rust crate
    ui/            # React components + design tokens
    ai/            # AI runner + utilities
    logger/        # Logger + LogViewer component
    updater/       # Updater + Update components
    kit/           # Umbrella re-export
src-tauri/
  crates/
    zeep-core/     # Rust: PrefsStore, Keychain, ShellRunner
    zeep-logger/   # Rust: structured logger
    zeep-updater/  # Rust: updater wrapper
    zeep-ai/       # Rust: AI CLI runner
    zeep-kit/      # Rust: configure() + command registration
apps/
  demo/            # Tauri demo app exercising all features
```

---

## Out of Scope (v1)

- Server-side rendering of zeep-ui components
- Storybook publish to CDN
- Plugin API for third-party extensions

---

## Testing

- Integration test: `Builder::build()` registra todos os plugins esperados
- Integration test: demo app compila e abre sem erro
- Smoke test: `zeep:ready` event dispara ≤2s após launch
- Capability test: comandos acessíveis sem declaração manual em `capabilities/*.json`
