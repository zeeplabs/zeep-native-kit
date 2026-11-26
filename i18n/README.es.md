# zeep-native-kit

[![CI](https://github.com/zeeplabs/zeep-native-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/zeeplabs/zeep-native-kit/actions/workflows/ci.yml)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](#license)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](../package.json)
[![Rust](https://img.shields.io/badge/rust-%3E%3D1.80-orange?logo=rust)](../src-tauri/Cargo.toml)
[![Tauri v2](https://img.shields.io/badge/tauri-v2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)

[English](../README.md) | [Português](README.pt-BR.md) | **Español**

**Kit de desarrollo desktop-first para apps Tauri v2 + React + Rust.**

zeep-native-kit le da a cualquier app Tauri una base pulida en una sola llamada — sistema de diseño premium, comandos Rust listos (keychain, prefs, shell), logger estructurado, auto-updater e integración con IA local (sin API key).

> **Estado: publicado.** Los paquetes (`@zeeptech/*` en [npm](https://www.npmjs.com/org/zeeptech), crates `zeep-*` en [crates.io](https://crates.io/search?q=zeep-)) están disponibles desde la `v1.0.0` — ver [Instalación](#instalación--estado-de-publicación).

## Índice

- [Stack](#stack)
- [Instalación / Estado de publicación](#instalación--estado-de-publicación)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Modules](#modules)
- [Migration Guide](#migration-guide-raw-tauri--zeep-native-kit)
- [Release Flow](#release-flow)
- [Development](#development)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

```rust
// main.rs — app Tauri completa con zeep-native-kit
fn main() {
    zeep_kit::Builder::new()
        .namespace("dev.myapp")
        .log_dev()
        .updater("your-public-key-hex")
        .install(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

```tsx
// App.tsx — frontend con sistema de diseño + todos los módulos
import { ZeepProvider, Button, LogViewer, useUpdater } from '@zeeptech/kit';

function App() {
  return (
    <ZeepProvider>
      <Button variant="primary">Hello zeep</Button>
    </ZeepProvider>
  );
}
```

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | Tauri v2 |
| Frontend | React 18+ / TypeScript |
| Styling | CSS custom properties (`--zeep-*`) |
| Bundler | Vite 5+ |
| Rust | Stable 1.80+ |
| Package manager | pnpm (monorepo) |
| Testing (UI) | Vitest + Testing Library |
| Testing (Rust) | `cargo test` |
| Release | Changesets + GitHub Actions |

## Instalación / Estado de publicación

Los paquetes ya están publicados y son instalables hoy:

```bash
pnpm add @zeeptech/kit
```

```toml
# Cargo.toml
[dependencies]
zeep-kit = "1.0"
```

**Workspace local (para contribuir a este repo)** — agrégalo como dependencia `workspace:*` dentro de este monorepo pnpm, tal como lo hace `apps/demo`:

```jsonc
// package.json de tu app
{
  "dependencies": {
    "@zeeptech/kit": "workspace:*"
  }
}
```

```toml
# Cargo.toml
[dependencies]
zeep-kit = { path = "../zeep-native-kit/src-tauri/crates/zeep-kit" }
```

## Quick Start

### From scratch

Conéctalo:
```rust
zeep_kit::Builder::new()
    .namespace("dev.myapp")
    .install(tauri::Builder::default())
    .run(tauri::generate_context!())
    .expect("error running app");
```

### With logger + updater + AI

```rust
zeep_kit::Builder::new()
    .namespace("dev.myapp")
    .log_dev()                        // dev: stdout + webview, Debug level
    // .log_prod()                    // prod: file rotation, Info level
    .updater("your-public-key-hex")   // enable auto-updates
    // .ai(false)                     // skip the local AI plugin (on by default in 1.x)
    .install(tauri::Builder::default())
    .run(tauri::generate_context!())
    .expect("error running app");
```

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                          apps/demo                         │
│                (Tauri app + React gallery)                 │
└──────┬───────────┬───────────┬───────────┬───────────┬─────┘
       │            │           │           │           │
┌───────────┐┌──────────┐┌──────────┐┌──────────┐┌───────────┐
│@zeeptech/ ││@zeeptech/││@zeeptech/││@zeeptech/││@zeeptech/ │
│core       ││ui        ││logger    ││updater   ││ai         │
│(invoke    ││          ││          ││          ││(useAI,    │
│wraps)     ││          ││          ││          ││comps)     │
└───────────┘└──────────┘└──────────┘└──────────┘└───────────┘
       ┌───────────────────────────────────────┐
       │        @zeeptech/kit (barrel)          │
       │      reexporta todos los paquetes      │
       └───────────────────────────────────────┘

┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│zeep-core ││zeep-     ││zeep-     ││zeep-ai   │
│(Prefs,   ││logger    ││updater   ││(detect,  │
│Keychain, ││(struct   ││(semver   ││runner,   │
│Shell)    ││logs,     ││gate,     ││adapters) │
│          ││rotation) ││commands) ││          │
└──────────┘└──────────┘└──────────┘└──────────┘
       ┌─────────────────────────────────────┐
       │        zeep-kit (umbrella crate)     │
       │   Builder + install() API            │
       └─────────────────────────────────────┘
```

### Rust Crates

| Crate | Description |
|-------|-------------|
| `zeep-core` | `PrefsStore` (JSON), `Keychain` (macOS/Windows/Linux), `ShellRunner` (PATH-resolved, streaming) |
| `zeep-kit` | Umbrella `Builder`. `.namespace()` / `.log_dev()` / `.updater()` / `.install()` |
| `zeep-logger` | Structured JSON logging via `fern`. Ring buffer (1000 entries), file rotation, `logger_set_level`/`logger_get_entries` |
| `zeep-updater` | Wraps `tauri-plugin-updater` with semver gate (stable-only, strictly newer). `check`/`download`/`install`/`download_and_install` |
| `zeep-ai` | CLI detection (claude/codex/ollama/llm/opencode), `AIRunner` with process group kill (`libc::setsid`/`killpg`), streaming via Tauri events |

### npm Packages

| Package | Description |
|---------|-------------|
| `@zeeptech/kit` | Barrel — reexporta todos los paquetes de abajo |
| `@zeeptech/core` | Wrappers TypeScript para comandos Tauri (`prefsGet`, `keychainSet`, `shellRun`, etc.) |
| `@zeeptech/ui` | Sistema de diseño: `ZeepProvider`, `Button`, `GlassCard`, `AnimatedBackground`, `MarkdownRenderer`, etc. |
| `@zeeptech/logger` | `LogViewer` (virtualizado, filtro, exportar JSON), `LogLevelSelector`, `useLogEvents` |
| `@zeeptech/updater` | `UpdateBanner`, `UpdateProgress`, `UpdateReadyDialog`, `useUpdater` |
| `@zeeptech/ai` | Hook `useAI`, `AIProviderStatus`, `AIPromptInput`, `AIResponseStream`, `AIProviderPicker`, utilidades AIText |

## Modules

### Prefs (`zeep-core`)

Preferencias JSON con alcance por namespace, almacenadas en `{app_data_dir}/{namespace}.json`.

```rust
use zeep_core::prefs::PrefsStore;

let store = PrefsStore::new("myapp", app_data_dir);
store.set("theme".into(), serde_json::json!("dark"));
let theme: Option<serde_json::Value> = store.get("theme");
store.delete("theme");
let all = store.get_all();
```

**Frontend:**
```typescript
import { prefsGet, prefsSet } from '@zeeptech/kit';

await prefsSet('theme', 'dark');
const theme = await prefsGet('theme');
```

### Keychain (`zeep-core`)

Almacenamiento seguro de credenciales vía crate `keyring` (macOS Keychain, Windows Credential Manager, Linux Secret Service).

```rust
use zeep_core::keychain::Keychain;

let kc = Keychain::new("dev.zeep.myapp");
kc.set("api-token", "sk-xxx")?;
let token: Option<String> = kc.get("api-token")?;
kc.delete("api-token")?;
```

### Shell (`zeep-core`)

Ejecución de comandos con resolución vía PATH y soporte de streaming. Resuelve binarios manualmente (el sandbox de Tauri no hereda el PATH completo en macOS).

```rust
use zeep_core::shell::ShellRunner;

let runner = ShellRunner::new("/my/cwd");
let output = runner.run("node", &["--version"], None, None).await?;
// ShellOutput { stdout, stderr, exitCode }

runner.run_stream("node", &["script.js"], None, None).await?;
// Emite eventos Tauri shell:stdout / shell:stderr / shell:done
```

### Logger (`zeep-logger`)

Logging estructurado JSON por línea vía `fern`. Rotación de archivos, ring buffer para UI en vivo.

```rust
zeep_logger::Builder::development()   // stdout + webview, Debug
    .build::<Wry>()                   // o production()

// O vía zeep_kit:
zeep_kit::Builder::new()
    .log_dev()
    // .log_prod()
    .install(tauri::Builder::default());
```

Comandos: `logger_set_level(level: u8)` — cambia el nivel de log en runtime. `logger_get_entries()` — obtiene las últimas 1000 entradas.

**Frontend:**
```tsx
import { LogViewer, LogLevelSelector, useLogEvents } from '@zeeptech/kit';

function DevPanel() {
  const logEvents = useLogEvents();
  return (
    <>
      <LogLevelSelector />
      <LogViewer logEvents={logEvents} maxHeight={400} />
    </>
  );
}
```

### Updater (`zeep-updater`)

Integración de auto-actualización vía `tauri-plugin-updater` con validación de semver (solo releases estables, estrictamente más nuevas).

```rust
zeep_updater::Builder::new()
    .pubkey("hex-public-key")
    .build::<Wry>()
```

Comandos: `check`, `download_and_install`, `download`, `install` (expuestos por `tauri-plugin-updater`).

**Frontend:**
```tsx
import { useUpdater, UpdateBanner, UpdateProgress, UpdateReadyDialog } from '@zeeptech/kit';

function UpdateManager() {
  const updater = useUpdater();

  return (
    <>
      <Button onClick={updater.check}>Check for Updates</Button>
      {updater.state.status === 'available' && (
        <UpdateBanner
          version={updater.state.updateInfo!.version}
          notes={updater.state.updateInfo!.body}
          onInstall={updater.install}
          onDismiss={updater.dismiss}
        />
      )}
      {updater.state.status === 'downloading' && (
        <UpdateProgress
          downloaded={updater.state.downloaded}
          contentLength={updater.state.contentLength}
        />
      )}
      {updater.state.status === 'ready' && (
        <UpdateReadyDialog
          onRestart={updater.restart}
          onDismiss={updater.dismiss}
        />
      )}
    </>
  );
}
```

### AI (`zeep-ai`)

Integración con CLIs de IA local. Detecta CLIs en el PATH, las ejecuta con aislamiento de process group para una cancelación limpia.

```rust
zeep_ai::Builder::build()
```

Comandos: `ai_detect_providers` → `Vec<DetectedProvider>`, `ai_run`/`ai_run_stream`/`ai_cancel`.

**Frontend:**
```tsx
import { useAI, AIProviderPicker, AIPromptInput, AIResponseStream } from '@zeeptech/kit';

function AIPanel() {
  const ai = useAI();

  return (
    <>
      <Button onClick={ai.detect}>Detect AI CLIs</Button>
      {ai.providers.length > 0 && (
        <>
          <AIProviderPicker
            providers={ai.providers}
            value={selected}
            onChange={setSelected}
          />
          <AIPromptInput onSend={(p) => ai.run(selected, p)} />
          <AIResponseStream text={ai.output} isStreaming={ai.status === 'running'} />
          <Button onClick={ai.cancel}>Cancel</Button>
        </>
      )}
    </>
  );
}
```

### UI (`@zeeptech/ui`)

9 componentes + sistema de design tokens con 5 temas de acento (violet, ocean, sunset, forest, graphite).

```tsx
import { ZeepProvider, Button, GlassCard, AnimatedBackground,
         ShimmerText, StatusDot, ToastProvider, useToast,
         Skeleton, MarkdownRenderer, SearchHighlight } from '@zeeptech/kit';

function App() {
  return (
    <ZeepProvider>
      <ToastProvider>
        <GlassCard>
          <ShimmerText>Welcome</ShimmerText>
          <Button variant="primary">Get Started</Button>
        </GlassCard>
      </ToastProvider>
    </ZeepProvider>
  );
}
```

## Migration Guide: Raw Tauri → zeep-native-kit

### Step 1: Add dependencies

**Antes (Tauri puro):**
```toml
# Cargo.toml
[dependencies]
tauri = "2"
serde = "1"
serde_json = "1"
```

```json
// package.json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "react": "^18"
  }
}
```

**Después (con zeep-native-kit):**
```toml
# Cargo.toml
[dependencies]
zeep-kit = "1.0"
tauri = "2"
```

```json
// package.json
{
  "dependencies": {
    "@zeeptech/kit": "^1.0",
    "@tauri-apps/api": "^2",
    "react": "^18"
  }
}
```

### Step 2: Replace manual wiring

**Antes — cableado manual de prefs, keychain, shell, logger, updater:**
```rust
// main.rs — ~35 líneas de wiring manual
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([Target::new(TargetKind::Stdout)])
            .build())
        .setup(|app| {
            let prefs = Arc::new(RwLock::new(PrefsStore::new("myapp", ...)));
            app.manage(prefs);
            // ... keychain, shell, etc.
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            prefs_get, prefs_set, ...
        ])
        .run(tauri::generate_context!())
        .expect("error");
}
```

**Después — una llamada:**
```rust
// main.rs — 6 líneas
fn main() {
    zeep_kit::Builder::new()
        .namespace("dev.myapp")
        .log_dev()
        .install(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

### Step 3: Replace capabilities

**Antes — declaraciones manuales de capability por comando:**
```json
{
  "permissions": [
    "core:default",
    "allow-prefs-get",
    "allow-prefs-set",
    "allow-keychain-get",
    "allow-shell-which",
    ...
  ]
}
```

**Después — permisos del plugin declarados automáticamente:**
```json
{
  "permissions": [
    "core:default",
    "zeep-kit:default"
  ]
}
```

### Step 4: Replace UI boilerplate

**Antes — toggle de dark mode, CSS variables y sistema de toast hechos a mano:**
```tsx
// ~200 líneas de boilerplate
const [theme, setTheme] = useState('dark');
useEffect(() => {
  document.documentElement.style.setProperty('--bg', '#0d0d0f');
  // ...
}, []);
```

**Después — un provider:**
```tsx
import { ZeepProvider, useZeep } from '@zeeptech/kit';

function App() {
  return (
    <ZeepProvider>
      <MyApp />
    </ZeepProvider>
  );
}

function MyApp() {
  const { theme, setTheme } = useZeep();
  return <Button onClick={() => setTheme('light')}>Light mode</Button>;
}
```

### Step 5: Add optional modules

| Module | Cargo.toml | Package.json | Rust | Frontend |
|--------|-----------|-------------|------|----------|
| Logger | `zeep-kit` → `.log_dev()` | `@zeeptech/kit` | auto | `LogViewer`, `LogLevelSelector` |
| Updater | `zeep-kit` → `.updater(pk)` | `@zeeptech/kit` | auto | `UpdateBanner`, `useUpdater` |
| AI | `zeep-kit` → on by default, `.ai(false)` to opt out | `@zeeptech/kit` | auto | `AIPromptInput`, `useAI` |

## Release Flow

1. Crear un changeset:
   ```bash
   pnpm changeset
   ```
2. Commit y push del PR a `main`
3. Tras el merge, bump de versiones y generación de changelogs:
   ```bash
   pnpm version-packages
   git add . && git commit -m "chore: bump versions"
   ```
4. Tag y push:
   ```bash
   git tag v0.1.0
   git push --tags
   ```
5. GitHub Actions publica en npm (vía [Trusted Publishing](https://docs.npmjs.com/trusted-publishers), sin `NPM_TOKEN`) y los crates en crates.io.

> Nota: para un paquete/crate **nuevo** (primera publicación), el Trusted Publisher debe configurarse manualmente en npmjs.com/crates.io antes del release — trusted publishing solo puede vincularse a un paquete que ya exista en el registro. El primer `publish` de cada paquete es manual; los releases siguientes son automáticos vía CI.

## Development

```bash
pnpm install
pnpm -r test          # Vitest (5 packages with tests, 46 tests)
cargo test --workspace # Rust tests (55 tests + 1 doctest)
cargo check            # workspace
```

### Adding a new crate

```bash
mkdir -p src-tauri/crates/zeep-xyz/src
# Add to src-tauri/Cargo.toml [workspace.dependencies]
# Add build.rs + permissions/default.toml
```

### Adding a new package

```bash
mkdir -p packages/@zeeptech/xyz/src
# Copy package.json, tsconfig.json, vitest.config.ts from @zeeptech/logger
# Add workspace dep to apps/demo/package.json
```

## Project Structure

```
zeep-native-kit/
├── .github/workflows/      # CI + Release
├── .changeset/             # Changesets config
├── .specs/                 # Specs, roadmap, state
│   ├── project/            # PROJECT.md, ROADMAP.md, STATE.md
│   └── features/           # Feature specs per module
├── src-tauri/
│   ├── Cargo.toml          # Rust workspace root
│   └── crates/
│       ├── zeep-core/      # Prefs, Keychain, Shell
│       ├── zeep-kit/       # Umbrella Builder
│       ├── zeep-logger/    # Structured logging
│       ├── zeep-updater/   # Auto-update
│       └── zeep-ai/        # AI CLI integration
├── packages/
│   └── @zeeptech/
│       ├── core/           # TS command wrappers
│       ├── ui/             # React design system
│       ├── logger/         # LogViewer + controls
│       ├── updater/        # Update components
│       ├── ai/             # AI components + utils
│       └── kit/            # Barrel re-exports
├── apps/
│   └── demo/               # Tauri demo app
├── i18n/                   # READMEs traducidos (pt-BR, es)
└── docs/
    └── superpowers/        # Design docs + plans
```

## Roadmap

El roadmap detallado se mantiene internamente en `.specs/project/ROADMAP.md`. A alto nivel:

- [x] Módulos core estables: Prefs, Keychain, Shell, Logger, Updater, AI, UI (API-stable en la línea 1.0)
- [x] CI (clippy + cargo test + Vitest + type-check) vía GitHub Actions
- [x] Flujo de release vía Changesets + npm Trusted Publishing
- [x] Primera publicación pública en npm y crates.io (`v1.0.0`)
- [ ] CI multiplataforma (Linux/Windows), hoy solo `macos-latest`
- [ ] Script `lint` real por paquete (hoy es un no-op en la raíz)

Las sugerencias de roadmap son bienvenidas vía [issues](https://github.com/zeeplabs/zeep-native-kit/issues).

## Contributing

Las contribuciones son bienvenidas. Ver la guía completa en [CONTRIBUTING.md](../CONTRIBUTING.md) — cubre configuración del entorno, flujo de desarrollo, convención de changesets y checklist de PR.

## Security

Para reportar vulnerabilidades, **no abras un issue público** — sigue el proceso en [SECURITY.md](../SECURITY.md) (GitHub Security Advisories).

## Code of Conduct

Este proyecto sigue el [Contributor Covenant](../CODE_OF_CONDUCT.md).

## License

Doble licencia, a tu elección:

- [MIT license](../LICENSE-MIT)
- [Apache License, Version 2.0](../LICENSE-APACHE)

Salvo indicación explícita en contrario, cualquier contribución enviada intencionalmente para su inclusión en el proyecto se licenciará según lo anterior, sin términos ni condiciones adicionales.
