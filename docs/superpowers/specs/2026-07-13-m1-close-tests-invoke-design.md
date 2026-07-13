# M1 Close: JS/TS Test Coverage + Frontend invoke() Wiring — Design

## Problem

M1 (Foundation) is functionally complete (zeep-core, zeep-kit Builder, PrefsStore, Keychain, ShellRunner all implemented and merged) but has two tracked gaps that block calling M1 done:

1. **0% JS/TS test coverage.** `@zeep/ui` and `@zeep/core` have no test runner installed, no `test` script, and no tests. `.specs/project/STATE.md` lists Vitest as the intended stack but it was never wired up.
2. **Zero `invoke()` calls in the demo frontend.** `apps/demo/src/` never calls any of the 10 Tauri commands `@zeep/core` wraps (`prefsGet`, `prefsSet`, `prefsDelete`, `prefsGetAll`, `keychainGet`, `keychainSet`, `keychainDelete`, `shellWhich`, `shellRun`, `shellRunStream`). The `zeep-kit:default` capability was declared and the plugin builds, but nothing has ever proven the wiring works end-to-end from a real UI action through IPC to the Rust command and back.

## Goals

- Install and configure Vitest for `@zeep/ui` and `@zeep/core`, each with an independent package-local config (no shared root config).
- Add smoke tests for all 9 `@zeep/ui` components (`AnimatedBackground`, `Button`, `GlassCard`, `Markdown`, `ShimmerText`, `Skeleton`, `StatusDot`, `Toast`, `tokens/inject`).
- Add unit tests for all 10 `@zeep/core` command wrappers, mocking `@tauri-apps/api/core`'s `invoke`.
- Add a "Native Kit" section to the existing `apps/demo/src/pages/UIGallery.tsx` that calls the real `@zeep/core` wrappers against the running Tauri backend, proving the `zeep-kit:default` capability works from a real UI action.

## Non-goals

- Deep/exhaustive component test coverage (variants, a11y, snapshots) — smoke tests only, per explicit choice.
- Shared/root Vitest config — each package configures independently (YAGNI; revisit if duplication becomes painful).
- Any change to Rust code, `zeep-core`, or `zeep-kit` — the backend is already correct and tested (19 Rust tests passing). This is purely a frontend/test gap.
- E2E browser automation (Playwright, WebDriver) of the actual Tauri window — out of scope; the Native Kit section is manually testable and its constituent pieces (React rendering, `@zeep/core` wrapper calls) are unit-tested.
- Adding new pages or routing to the demo app — the Native Kit section is added to the existing `UIGallery` page.

## Design

### Vitest setup

**`@zeep/core`** (`packages/@zeep/core/`):
- `devDependencies`: `vitest`.
- `vitest.config.ts`: default node environment (no DOM needed — pure function wrappers around `invoke`).
- `package.json` `scripts.test`: `"vitest run"`.
- Tests live in `packages/@zeep/core/src/index.test.ts`, mocking `@tauri-apps/api/core` via `vi.mock`.

Example shape (one of 10):
```ts
import { describe, it, expect, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { prefsGet } from "./index";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("prefsGet", () => {
  it("invokes prefs_get with the key", async () => {
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue("value");
    const result = await prefsGet("foo");
    expect(invoke).toHaveBeenCalledWith("prefs_get", { key: "foo" });
    expect(result).toBe("value");
  });
});
```
Each of the 10 wrappers gets one test verifying the exact command name and the exact args object shape (matching the existing call sites in `packages/@zeep/core/src/index.ts`).

**`@zeep/ui`** (`packages/@zeep/ui/`):
- `devDependencies`: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
- `vitest.config.ts`: `environment: "jsdom"`.
- `package.json` `scripts.test`: `"vitest run"`.
- Tests live alongside each component: `packages/@zeep/ui/src/components/Button.test.tsx`, etc.

Smoke test pattern — render without crashing + one essential behavior assertion per component:
- `Button.test.tsx`: renders children, calls `onClick` when clicked.
- `StatusDot.test.tsx`: renders, applies the color class/style for a given status prop.
- `Toast.test.tsx`: renders a message when triggered via its provider.
- `GlassCard.test.tsx`, `ShimmerText.test.tsx`, `AnimatedBackground.test.tsx`, `Skeleton.test.tsx`, `Markdown.test.tsx`: render without crashing + one prop-driven output check (e.g. `Markdown` renders parsed HTML from a markdown string).
- `tokens/inject.test.ts`: calling the inject function writes the expected CSS variables/style tag to `document`.

Root `package.json` already has `"test": "pnpm -r test"` — no change needed there; it will now actually run something in both packages.

### Native Kit section in UIGallery

`apps/demo/src/pages/UIGallery.tsx` gains a new section (same pattern as existing component showcase sections) that:
- Imports the `@zeep/core` wrappers directly (`prefsGet`, `prefsSet`, `keychainGet`, `keychainSet`, `shellWhich`, `shellRun`).
- Uses existing `@zeep/ui` components already used elsewhere on the page (`Button` for actions, `GlassCard` or similar for layout, `StatusDot`/text for showing the last result or error) — no new `@zeep/ui` components introduced.
- Provides these interactions:
  - **Prefs**: a text input for a value + "Set" button calling `prefsSet("native-kit-demo", value)`, and a "Get" button calling `prefsGet("native-kit-demo")` and displaying the result.
  - **Keychain**: same set/get pattern against a fixed demo key, calling `keychainSet`/`keychainGet`.
  - **Shell**: a "Which node" button calling `shellWhich("node")` and displaying the resolved path or `null`.
- Each action's result (success value or thrown error message) is displayed inline — this is the human-verifiable proof that IPC → `zeep-kit:default` capability → Rust command → back round-trips correctly in the real running app.

This section is manually verified by running the demo app (`pnpm dev` / `cargo tauri dev` inside `apps/demo`) and clicking through — no automated E2E harness is introduced (see Non-goals).

## Error handling

- `@zeep/core` wrapper tests assert the promise rejects/resolves as `invoke` is mocked to do — no new error-handling logic is added to the wrappers themselves (they already just forward to `invoke`).
- The Native Kit UI section wraps each action in a `try/catch` and displays the caught error's message via the existing result-display element, rather than letting it throw uncaught in the demo app.

## Testing

- `pnpm -r test` (root script, unchanged) now runs `vitest run` in both `@zeep/core` and `@zeep/ui` and must pass with 0 failures.
- No changes to Rust tests; the existing 19 `zeep-core`/`zeep-kit` Rust tests continue to pass untouched.
- The Native Kit section itself is not unit-tested beyond what's already covered by the `@zeep/core` wrapper tests and standard React rendering — it is a manual-verification surface by design (see Non-goals on E2E scope).
