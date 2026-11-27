---
"@zeeptech/ui": minor
---

Add `Stepper`: progress through a multi-step flow (wizard). Ordered list with `aria-current="step"` on the current step, per-step status (`pending`, `current`, `complete`, `error`) derived from `current` or overridden per step, status exposed to screen readers as text (localizable via `statusLabels`), horizontal and vertical layouts, and an optional `onStepClick` that makes non-pending steps buttons so users can go back. Uses the `--zeep-*` tokens.
