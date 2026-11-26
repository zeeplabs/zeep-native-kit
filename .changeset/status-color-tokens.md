---
"@zeeptech/ui": minor
"@zeeptech/logger": patch
"@zeeptech/ai": patch
---

Add `--zeep-danger`, `--zeep-success`, `--zeep-warning` and `--zeep-info` color tokens (dark and light, AA contrast) and use them in `Button`, `Toast`, `StatusDot`, `MarkdownRenderer`, the logger level colors and `AIProviderStatus` instead of hardcoded hex values. In the light theme these colors are now darker than before so text stays readable.
