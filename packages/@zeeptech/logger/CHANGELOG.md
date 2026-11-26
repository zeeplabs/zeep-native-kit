# @zeeptech/logger

## 1.0.1

### Patch Changes

- d7e2cce: Add `--zeep-danger`, `--zeep-success`, `--zeep-warning` and `--zeep-info` color tokens (dark and light, AA contrast) and use them in `Button`, `Toast`, `StatusDot`, `MarkdownRenderer`, the logger level colors and `AIProviderStatus` instead of hardcoded hex values. In the light theme these colors are now darker than before so text stays readable.

## 1.0.0

### Major Changes

- First stable release. Design system, Rust command bindings (prefs/keychain/shell),
  structured logging, auto-updater, and local AI CLI integration are now considered
  API-stable for the 1.0 line.
