---
"@zeeptech/logger": patch
---

`LogLevelSelector`: the active level button now uses `--zeep-bg` as its text color instead of white, which was unreadable (~2:1) on the dark-theme green and amber. `Trace` follows the theme text color (`--zeep-text`) instead of a fixed `#999`, so it stays readable on the light surface; this also changes the `Trace` color in `LogViewer`.
