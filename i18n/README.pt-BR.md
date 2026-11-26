# zeep-native-kit

[![CI](https://github.com/zeeplabs/zeep-native-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/zeeplabs/zeep-native-kit/actions/workflows/ci.yml)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](#license)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](../package.json)
[![Rust](https://img.shields.io/badge/rust-%3E%3D1.80-orange?logo=rust)](../src-tauri/Cargo.toml)
[![Tauri v2](https://img.shields.io/badge/tauri-v2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)

[English](../README.md) | **Português** | [Español](README.es.md)

**Desenvolvimento desktop-first para apps Tauri v2 + React + Rust.**

zeep-native-kit dá a qualquer app Tauri um baseline polished em uma chamada — design system premium, comandos Rust prontos (keychain, prefs, shell), logger estruturado, auto-updater, e integração com AI local (sem API key).

> **Status: publicado.** Os pacotes (`@zeeptech/*` no [npm](https://www.npmjs.com/org/zeeptech), crates `zeep-*` no [crates.io](https://crates.io/search?q=zeep-)) estão no ar desde a `v1.0.0` — veja [Instalação](#instalação--status-de-publicação).

## Índice

- [Stack](#stack)
- [Instalação / Status de publicação](#instalação--status-de-publicação)
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
// main.rs — app Tauri completo com zeep-native-kit
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
// App.tsx — frontend com design system + todos os módulos
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

## Instalação / Status de publicação

Os pacotes estão publicados e instaláveis hoje:

```bash
pnpm add @zeeptech/kit
```

```toml
# Cargo.toml
[dependencies]
zeep-kit = "1.0"
```

**Workspace local (para contribuir com este repo)** — adicione como dependência `workspace:*` neste monorepo pnpm, como o próprio `apps/demo` faz:

```jsonc
// package.json do seu app
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

Wire it up:
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
       │     re-exporta todos os packages       │
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
| `@zeeptech/kit` | Barrel — re-exports all packages below |
| `@zeeptech/core` | TypeScript wrappers for Tauri commands (`prefsGet`, `keychainSet`, `shellRun`, etc.) |
| `@zeeptech/ui` | Design system: `ZeepProvider`, `Button`, `GlassCard`, `AnimatedBackground`, `MarkdownRenderer`, etc. |
| `@zeeptech/logger` | `LogViewer` (virtualized, filter, export JSON), `LogLevelSelector`, `useLogEvents` |
| `@zeeptech/updater` | `UpdateBanner`, `UpdateProgress`, `UpdateReadyDialog`, `useUpdater` |
| `@zeeptech/ai` | `useAI` hook, `AIProviderStatus`, `AIPromptInput`, `AIResponseStream`, `AIProviderPicker`, AIText utilities |

## Modules

### Prefs (`zeep-core`)

Preferências JSON com escopo por namespace, armazenadas em `{app_data_dir}/{namespace}.json`.

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

Armazenamento seguro de credenciais via crate `keyring` (macOS Keychain, Windows Credential Manager, Linux Secret Service).

```rust
use zeep_core::keychain::Keychain;

let kc = Keychain::new("dev.zeep.myapp");
kc.set("api-token", "sk-xxx")?;
let token: Option<String> = kc.get("api-token")?;
kc.delete("api-token")?;
```

### Shell (`zeep-core`)

Execução de comandos com resolução via PATH e suporte a streaming. Resolve binários manualmente (o sandbox do Tauri não herda o PATH completo no macOS).

```rust
use zeep_core::shell::ShellRunner;

let runner = ShellRunner::new("/my/cwd");
let output = runner.run("node", &["--version"], None, None).await?;
// ShellOutput { stdout, stderr, exitCode }

runner.run_stream("node", &["script.js"], None, None).await?;
// Emite eventos Tauri shell:stdout / shell:stderr / shell:done
```

### Logger (`zeep-logger`)

Logging estruturado JSON-por-linha via `fern`. Rotação de arquivo, ring buffer para UI ao vivo.

```rust
zeep_logger::Builder::development()   // stdout + webview, Debug
    .build::<Wry>()                   // ou production()

// Ou via zeep_kit:
zeep_kit::Builder::new()
    .log_dev()
    // .log_prod()
    .install(tauri::Builder::default());
```

Comandos: `logger_set_level(level: u8)` — muda o nível de log em runtime. `logger_get_entries()` — busca as últimas 1000 entradas.

**Mascarar segredos (redactor):** `Builder::redactor` (ou `zeep_kit::Builder::log_redactor`) permite reescrever cada entrada antes de ela chegar a qualquer saída: ring buffer, o evento `log://log` do webview, stdout/stderr e arquivos.

```rust
zeep_kit::Builder::new()
    .log_prod()
    .log_redactor(|entry| {
        entry.message = entry.message.replace(&my_token, "[REDACTED]");
    })
    .install(tauri::Builder::default());
```

É um filtro de melhor esforço sobre o texto do log, **não uma barreira de segurança**: só vê o que passa por este logger e só mascara o que o seu código reconhece, então prefira não logar segredos. Roda na thread que loga, para cada entrada que passa do filtro de nível (mantenha-o rápido), e se der panic a mensagem é trocada por um texto fixo em vez de ser logada sem máscara.

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

Integração de auto-update via `tauri-plugin-updater` com gate de semver (apenas releases estáveis, estritamente mais novas).

```rust
zeep_updater::Builder::new()
    .pubkey("hex-public-key")
    .build::<Wry>()
```

Comandos: `check`, `download_and_install`, `download`, `install` (expostos pelo `tauri-plugin-updater`).

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

Integração com CLIs de IA local. Detecta CLIs no PATH, executa com isolamento de process group para cancelamento limpo.

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

9 componentes + sistema de design tokens com 5 temas de destaque (violet, ocean, sunset, forest, graphite).

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

**Depois (com zeep-native-kit):**
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

**Antes — cabeamento manual de prefs, keychain, shell, logger, updater:**
```rust
// main.rs — ~35 linhas de wiring manual
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

**Depois — uma chamada:**
```rust
// main.rs — 6 linhas
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

**Antes — declarações manuais de capability por comando:**
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

**Depois — permissões do plugin declaradas automaticamente:**
```json
{
  "permissions": [
    "core:default",
    "zeep-kit:default"
  ]
}
```

### Step 4: Replace UI boilerplate

**Antes — toggle de dark mode, CSS variables e sistema de toast feitos à mão:**
```tsx
// ~200 linhas de boilerplate
const [theme, setTheme] = useState('dark');
useEffect(() => {
  document.documentElement.style.setProperty('--bg', '#0d0d0f');
  // ...
}, []);
```

**Depois — um provider:**
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

1. Criar changeset:
   ```bash
   pnpm changeset
   ```
2. Commit e push do PR para `main`
3. Após o merge, bump de versões e geração de changelogs:
   ```bash
   pnpm version-packages
   git add . && git commit -m "chore: bump versions"
   ```
4. Tag e push:
   ```bash
   git tag v0.1.0
   git push --tags
   ```
5. GitHub Actions publica no npm (via [Trusted Publishing](https://docs.npmjs.com/trusted-publishers), sem `NPM_TOKEN`) e as crates para crates.io.

> Nota: para um pacote/crate **novo** (primeira publicação), o Trusted Publisher precisa ser configurado manualmente em npmjs.com/crates.io antes do release — trusted publishing só pode ser vinculado a um pacote que já existe no registry. O primeiro `publish` de cada pacote é manual; releases seguintes são automáticos via CI.

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
├── i18n/                   # READMEs traduzidos (pt-BR, es)
└── docs/
    └── superpowers/        # Design docs + plans
```

## Roadmap

Roadmap detalhado é mantido internamente em `.specs/project/ROADMAP.md`. Em alto nível:

- [x] Módulos core estáveis: Prefs, Keychain, Shell, Logger, Updater, AI, UI (API-stable na linha 1.0)
- [x] CI (clippy + cargo test + Vitest + type-check) via GitHub Actions
- [x] Fluxo de release via Changesets + npm Trusted Publishing
- [x] Primeira publicação pública no npm e crates.io (`v1.0.0`)
- [ ] CI multiplataforma (Linux/Windows), hoje só `macos-latest`
- [ ] Script `lint` real por pacote (hoje é um no-op no root)

Sugestões de roadmap são bem-vindas via [issues](https://github.com/zeeplabs/zeep-native-kit/issues).

## Contributing

Contribuições são bem-vindas. Veja o guia completo em [CONTRIBUTING.md](../CONTRIBUTING.md) — cobre setup do ambiente, workflow de desenvolvimento, convenção de changesets e checklist de PR.

## Security

Para reportar vulnerabilidades, **não abra uma issue pública** — siga o processo em [SECURITY.md](../SECURITY.md) (GitHub Security Advisories).

## Code of Conduct

Este projeto segue o [Contributor Covenant](../CODE_OF_CONDUCT.md).

## License

Licenciado sob dupla licença, à sua escolha:

- [MIT license](../LICENSE-MIT)
- [Apache License, Version 2.0](../LICENSE-APACHE)

Salvo indicação explícita em contrário, qualquer contribuição intencionalmente submetida para inclusão no projeto será licenciada conforme acima, sem termos ou condições adicionais.
