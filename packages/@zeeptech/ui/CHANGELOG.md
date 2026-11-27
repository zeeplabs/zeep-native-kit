# @zeeptech/ui

## 1.3.0

### Minor Changes

- 57a0e0c: Add `Stepper`: progress through a multi-step flow (wizard). Ordered list with `aria-current="step"` on the current step, per-step status (`pending`, `current`, `complete`, `error`) derived from `current` or overridden per step, status exposed to screen readers as text (localizable via `statusLabels`), horizontal and vertical layouts, and an optional `onStepClick` that makes non-pending steps buttons so users can go back. Uses the `--zeep-*` tokens.

## 1.2.0

### Minor Changes

- d7e2cce: Add `--zeep-danger`, `--zeep-success`, `--zeep-warning` and `--zeep-info` color tokens (dark and light, AA contrast) and use them in `Button`, `Toast`, `StatusDot`, `MarkdownRenderer`, the logger level colors and `AIProviderStatus` instead of hardcoded hex values. In the light theme these colors are now darker than before so text stays readable.

## 1.1.0

### Minor Changes

- Add `TextField`, `Checkbox`, `Table` and `Tabs` components (accessible, `--zeep-*` tokens, light/dark and all accents).

## 1.0.0

### Major Changes

- First stable release. Design system, Rust command bindings (prefs/keychain/shell),
  structured logging, auto-updater, and local AI CLI integration are now considered
  API-stable for the 1.0 line.
