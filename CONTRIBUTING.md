# Contributing to zeep-native-kit

Thanks for your interest in contributing. This project is a pnpm + Cargo
hybrid monorepo; most changes touch either a `packages/@zeeptech/*` (TypeScript)
package or a `src-tauri/crates/*` (Rust) crate, sometimes both in tandem.

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (repo is pinned to `pnpm@10.33.0` via `packageManager`)
- Rust stable >= 1.80
- macOS, Linux, or Windows (CI currently runs on macOS only — see [Known limitations](#known-limitations))

## Getting started

```bash
git clone git@github.com:zeeplabs/zeep-native-kit.git
cd zeep-native-kit
pnpm install
```

Run the demo app to exercise every module end-to-end:

```bash
pnpm --filter demo dev
```

## Development workflow

```bash
pnpm build          # build all TS packages (tsup)
pnpm test           # run Vitest across all packages
pnpm type-check      # tsc --noEmit across all packages
cargo test --workspace --manifest-path src-tauri/Cargo.toml
cargo clippy --all-features --manifest-path src-tauri/Cargo.toml -- -D warnings
```

Each `packages/@zeeptech/*` package follows the same layout (`tsup.config.ts`,
`vitest.config.ts`, `src/index.ts`). Copy an existing package (e.g. `@zeeptech/logger`)
as a template when adding a new one, and wire it into `@zeeptech/kit`'s barrel exports.

Each `src-tauri/crates/*` crate exposes Tauri commands via `#[tauri::command]`
and a `Builder`/`install()` entry point consumed by the `zeep-kit` umbrella crate.

## Commit style

This repo uses [Changesets](https://github.com/changesets/changesets) for
versioning. Any change to a published package's public behavior needs a
changeset:

```bash
pnpm changeset
```

Commit messages should follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `chore:`, `docs:`, ...) — CI does not currently enforce this,
but it keeps changelogs and `git log` readable.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Make your change with tests (Vitest for TS, `#[test]`/doctests for Rust).
3. Run the full check suite locally (see above) before opening the PR.
4. Include a changeset if the change affects a published package's API.
5. Open the PR against `main`. CI runs Rust (`clippy` + `cargo test`) and
   TypeScript (`type-check` + `test`) jobs — both must pass.

## Known limitations

- CI (`ci.yml`) currently runs on `macos-latest` only; Linux/Windows-specific
  regressions (e.g. keychain backend, shell PATH resolution) may not be caught
  automatically. Manual testing on the target OS is recommended for changes to
  `zeep-core`'s keychain/shell modules.
- No `lint` script is currently defined in any package (`pnpm lint` at the
  root is a no-op today). Rely on `type-check` and `clippy` for now.

## Reporting bugs / requesting features

Use [GitHub Issues](https://github.com/zeeplabs/zeep-native-kit/issues). For
security vulnerabilities, see [SECURITY.md](SECURITY.md) instead — do not
open a public issue.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
