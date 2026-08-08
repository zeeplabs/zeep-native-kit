# M1 Tasks — zeep-native-kit Foundation

## Scope
pnpm monorepo + Cargo workspace + Tauri v2 demo app + zeep-core v0.1 (PrefsStore, Keychain, ShellRunner)

---

## Tasks

### T01 · Monorepo scaffold
**What:** Create pnpm workspace root with package.json, pnpm-workspace.yaml, .gitignore, tsconfig base  
**Where:** `/libs/zeep-native-kit/`  
**Depends on:** —  
**Done when:** `pnpm install` runs clean; workspace recognizes packages/ and apps/  

### T02 · Cargo workspace
**What:** Create `Cargo.toml` workspace root; crates: `zeep-core`, `zeep-kit` (stub)  
**Where:** `src-tauri/`  
**Depends on:** T01  
**Done when:** `cargo check` passes from workspace root  

### T03 · Tauri v2 demo app
**What:** Scaffold `apps/demo/` with `tauri init`; React 18 + Vite 5 frontend  
**Where:** `apps/demo/`  
**Depends on:** T01, T02  
**Done when:** `pnpm tauri dev` launches window; no errors in console  

### T04 · zeep-core crate skeleton
**What:** `zeep-core/src/lib.rs` with modules: `prefs`, `keychain`, `shell`; feature flags per module  
**Where:** `src-tauri/crates/zeep-core/`  
**Depends on:** T02  
**Done when:** `cargo check -p zeep-core` passes  

### T05 · PrefsStore implementation
**What:** Implement `PrefsStore` per PRF-01..PRF-10; JSON file in app_data_dir; RwLock AppState  
**Where:** `zeep-core/src/prefs.rs`  
**Depends on:** T04  
**Reuses:** `serde_json`, `tokio::sync::RwLock`  
**Done when:** unit tests pass: roundtrip get/set, namespace isolation, missing key → None  

### T06 · Keychain implementation
**What:** Implement `Keychain` per KCH-01..KCH-09 via `keyring` crate  
**Where:** `zeep-core/src/keychain.rs`  
**Depends on:** T04  
**Done when:** unit tests pass: set/get/delete cycle, absent key → None  

### T07 · ShellRunner implementation
**What:** Implement `ShellRunner` per SHL-01..SHL-11; PATH resolution; tokio process; streaming events  
**Where:** `zeep-core/src/shell.rs`  
**Depends on:** T04  
**Done when:** unit tests pass: PATH resolution, arg array safety; `shell_which("echo")` returns path  

### T08 · Tauri commands + AppState wiring
**What:** Register `prefs_*`, `keychain_*`, `shell_*` commands in Tauri Builder; inject AppState  
**Where:** `apps/demo/src-tauri/src/main.rs` + `zeep-core/src/commands.rs`  
**Depends on:** T03, T05, T06, T07  
**Done when:** `tauri dev` + `invoke("prefs_set", ...)` from browser console succeeds  

### T09 · TypeScript bindings @zeeptech/core
**What:** `packages/@zeeptech/core/src/index.ts` — typed wrappers for all Tauri commands  
**Where:** `packages/@zeeptech/core/`  
**Depends on:** T08  
**Done when:** TypeScript compiles; types match Rust command signatures  

### T10 · CI pipeline
**What:** GitHub Actions: `ci.yml` — lint (clippy + eslint), test (cargo + vitest), build on macOS  
**Where:** `.github/workflows/ci.yml`  
**Depends on:** T05, T06, T07, T09  
**Done when:** workflow file valid; acts as gate on PRs  

### T11 · Changesets setup
**What:** `pnpm changeset init`; `.changeset/config.json`; release workflow stub  
**Where:** root  
**Depends on:** T01  
**Done when:** `pnpm changeset` runs; config references all packages  

---

## Status

| Task | Status |
|------|--------|
| T01 | pending |
| T02 | pending |
| T03 | pending |
| T04 | pending |
| T05 | pending |
| T06 | pending |
| T07 | pending |
| T08 | pending |
| T09 | pending |
| T10 | pending |
| T11 | pending |
