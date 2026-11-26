# zeep-native-kit

[![CI](https://github.com/zeeplabs/zeep-native-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/zeeplabs/zeep-native-kit/actions/workflows/ci.yml)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](#license)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![Rust](https://img.shields.io/badge/rust-%3E%3D1.80-orange?logo=rust)](src-tauri/Cargo.toml)
[![Tauri v2](https://img.shields.io/badge/tauri-v2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)

**English** | [Português](i18n/README.pt-BR.md) | [Español](i18n/README.es.md)

**Desktop-first development kit for Tauri v2 + React + Rust apps.**

zeep-native-kit gives any Tauri app a polished baseline in one call — premium design system, ready-made Rust commands (keychain, prefs, shell), structured logger, auto-updater, and local AI integration (no API key required).

> **Status: published.** The packages (`@zeeptech/*` on [npm](https://www.npmjs.com/org/zeeptech), `zeep-*` crates on [crates.io](https://crates.io/search?q=zeep-)) are live as of `v1.0.0` — see [Installation](#installation--publication-status).

## Table of Contents

- [Stack](#stack)
- [Installation / Publication Status](#installation--publication-status)
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
// main.rs — a complete Tauri app with zeep-native-kit
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
// App.tsx — frontend with design system + every module
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

## Installation / Publication Status

The packages are published and installable today:

```bash
pnpm add @zeeptech/kit
```

```toml
# Cargo.toml
[dependencies]
zeep-kit = "1.0"
```

**Local workspace (for contributing to this repo)** — add it as a `workspace:*` dependency inside this pnpm monorepo, the same way `apps/demo` does:

```jsonc
// your app's package.json
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
    .install(tauri::Builder::default())
    .run(tauri::generate_context!())
    .expect("error running app");
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                  apps/demo                   │
│          (Tauri app + React gallery)         │
└──────┬──────┬──────┬──────┬──────┬──────────┘
       │      │      │      │      │
┌───────────┐┌──────────┐┌──────────┐┌──────────┐┌───────────┐
│@zeeptech/ ││@zeeptech/││@zeeptech/││@zeeptech/││@zeeptech/ │
│core       ││ui        ││logger    ││updater   ││ai         │
│(invoke    ││          ││          ││          ││(useAI,    │
│wraps)     ││          ││          ││          ││comps)     │
└───────────┘└──────────┘└──────────┘└──────────┘└───────────┘
       ┌───────────────────────────────────────┐
       │        @zeeptech/kit (barrel)          │
       │     re-exports every package           │
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

Namespace-scoped JSON preferences stored at `{app_data_dir}/{namespace}.json`.

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

Secure credential storage via the `keyring` crate (macOS Keychain, Windows Credential Manager, Linux Secret Service).

```rust
use zeep_core::keychain::Keychain;

let kc = Keychain::new("dev.zeep.myapp");
kc.set_secret("api-token", "sk-xxx")?;
let token: Option<String> = kc.get_secret("api-token")?;
kc.delete_secret("api-token")?;
```

Backends are enabled per target: `apple-native` (macOS/iOS), `windows-native` (Windows) and `sync-secret-service` + `crypto-rust` (Linux).

**Linux:** secrets are stored through the Secret Service D-Bus API, so the user session needs a running provider (GNOME Keyring, KWallet, KeePassXC). Without one, `keychain_*` commands return an error instead of silently losing data. Building requires `libdbus-1-dev` and `pkg-config`.

### Shell (`zeep-core`)

PATH-resolved command execution with streaming support. Resolves binaries manually (Tauri's sandbox doesn't inherit the full PATH on macOS).

```rust
use zeep_core::shell::ShellRunner;

let runner = ShellRunner::new("/my/cwd");
let output = runner.run("node", &["--version"], None, None).await?;
// ShellOutput { stdout, stderr, exitCode }

runner.run_stream("node", &["script.js"], None, None).await?;
// Emits Tauri events shell:stdout / shell:stderr / shell:done
```

### Logger (`zeep-logger`)

Structured JSON-per-line logging via `fern`. File rotation, ring buffer for live UI.

```rust
zeep_logger::Builder::development()   // stdout + webview, Debug
    .build::<Wry>()                   // or production()

// Or via zeep_kit:
zeep_kit::Builder::new()
    .log_dev()
    // .log_prod()
    .install(tauri::Builder::default());
```

Commands: `logger_set_level(level: u8)` — change log level at runtime. `logger_get_entries()` — pull recent 1000 entries.

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

Auto-update integration via `tauri-plugin-updater` with semver gate (only stable releases, strictly newer).

```rust
zeep_updater::Builder::new()
    .pubkey("hex-public-key")
    .build::<Wry>()
```

Commands: `check`, `download_and_install`, `download`, `install` (exposed by `tauri-plugin-updater`).

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

Local AI CLI integration. Detects CLIs in PATH, runs them with process group isolation for clean cancellation.

```rust
zeep_ai::Builder::build()
```

Commands: `ai_detect_providers` → `Vec<DetectedProvider>`, `ai_run`/`ai_run_stream`/`ai_cancel`.

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

9 components + design token system with 5 accent themes (violet, ocean, sunset, forest, graphite).

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

**Before (raw Tauri):**
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

**After (with zeep-native-kit):**
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

**Before — manually wiring prefs, keychain, shell, logger, updater:**
```rust
// main.rs — ~35 lines of manual wiring
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

**After — one call:**
```rust
// main.rs — 6 lines
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

**Before — manual capability declarations per command:**
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

**After — plugin permissions auto-declared:**
```json
{
  "permissions": [
    "core:default",
    "zeep-kit:default"
  ]
}
```

### Step 4: Replace UI boilerplate

**Before — hand-rolled dark mode toggle, CSS variables, toast system:**
```tsx
// ~200 lines of boilerplate
const [theme, setTheme] = useState('dark');
useEffect(() => {
  document.documentElement.style.setProperty('--bg', '#0d0d0f');
  // ...
}, []);
```

**After — one provider:**
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
| AI | `zeep-kit` → auto-enabled | `@zeeptech/kit` | auto | `AIPromptInput`, `useAI` |

## Release Flow

1. Create a changeset:
   ```bash
   pnpm changeset
   ```
2. Commit and push a PR to `main`
3. After merging, bump versions and generate changelogs:
   ```bash
   pnpm version-packages
   git add . && git commit -m "chore: bump versions"
   ```
4. Tag and push:
   ```bash
   git tag v0.1.0
   git push --tags
   ```
5. GitHub Actions publishes to npm (via [Trusted Publishing](https://docs.npmjs.com/trusted-publishers), no `NPM_TOKEN`) and the crates to crates.io.

> Note: for a **new** package/crate (first publication), the Trusted Publisher must be configured manually on npmjs.com/crates.io before the release — trusted publishing can only be linked to a package that already exists in the registry. The first `publish` of each package is manual; subsequent releases are automated via CI.

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
├── i18n/                   # Translated READMEs (pt-BR, es)
└── docs/
    └── superpowers/        # Design docs + plans
```

## Roadmap

Detailed roadmap is kept internally in `.specs/project/ROADMAP.md`. At a high level:

- [x] Stable core modules: Prefs, Keychain, Shell, Logger, Updater, AI, UI (API-stable in the 1.0 line)
- [x] CI (clippy + cargo test + Vitest + type-check) via GitHub Actions
- [x] Release flow via Changesets + npm Trusted Publishing
- [x] First public publication to npm and crates.io (`v1.0.0`)
- [ ] Cross-platform CI (Linux/Windows), currently `macos-latest` only
- [ ] Real per-package `lint` script (currently a no-op at the root)

Roadmap suggestions are welcome via [issues](https://github.com/zeeplabs/zeep-native-kit/issues).

## Contributing

Contributions are welcome. See the full guide in [CONTRIBUTING.md](CONTRIBUTING.md) — covers environment setup, development workflow, changeset convention, and PR checklist.

## Security

To report vulnerabilities, **do not open a public issue** — follow the process in [SECURITY.md](SECURITY.md) (GitHub Security Advisories).

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

Dual-licensed, at your option:

- [MIT license](LICENSE-MIT)
- [Apache License, Version 2.0](LICENSE-APACHE)

Unless explicitly stated otherwise, any contribution intentionally submitted for inclusion in the project shall be licensed as above, without any additional terms or conditions.
