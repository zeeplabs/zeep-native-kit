# zeep-ui — Spec

## Overview
React component library and design system for Tauri desktop apps. Desktop-first, premium aesthetic. Ships as an npm package consumed by any Tauri + React project.

Equivalent to: CortexUI + CortexHelpers (Swift).

---

## Requirements

### TOK · Design Tokens

| ID | Requirement |
|----|-------------|
| TOK-01 | All visual values (color, spacing, radius, shadow, typography) are CSS custom properties (`--zeep-*`) |
| TOK-02 | Tokens are injected into `:root` by `ZeepProvider` — no manual import required |
| TOK-03 | Five accent themes: **Violet**, **Ocean**, **Sunset**, **Forest**, **Graphite** |
| TOK-04 | Each theme defines: `--zeep-accent`, `--zeep-accent-light`, `--zeep-accent-dark`, `--zeep-glow` |
| TOK-05 | Base tokens (non-theme): `--zeep-bg`, `--zeep-surface`, `--zeep-border`, `--zeep-text`, `--zeep-text-muted` |
| TOK-06 | Typography scale: `--zeep-font-*` maps to a fluid type scale (xs/sm/md/lg/xl/2xl/3xl) |
| TOK-07 | Spacing scale: `--zeep-space-*` (1–16, in 4px units) |
| TOK-08 | Consumer can override any token by setting the CSS var after `ZeepProvider` |

### PRV · ZeepProvider

| ID | Requirement |
|----|-------------|
| PRV-01 | `<ZeepProvider>` wraps the app; accepts `theme`, `accentTheme`, `brandName`, `logo` props |
| PRV-02 | Injects design tokens into the DOM and sets up ThemeContext |
| PRV-03 | `theme` prop: `"light"` \| `"dark"` \| `"system"` (default: `"system"`) |
| PRV-04 | `accentTheme` prop: `AccentTheme` enum (default: `"violet"`) |
| PRV-05 | `useZeep()` hook exposes `{ theme, accentTheme, brandName, logo, setTheme, setAccentTheme }` |

### BG · AnimatedBackground

| ID | Requirement |
|----|-------------|
| BG-01 | `<AnimatedBackground>` renders a full-bleed animated gradient behind app content |
| BG-02 | Animation is CSS-only (no JS animation loop) — respects `prefers-reduced-motion` |
| BG-03 | Colors derive from current accent theme tokens |
| BG-04 | Accepts `intensity` prop: `"subtle"` \| `"medium"` \| `"strong"` (default: `"medium"`) |
| BG-05 | Performance: no repaints on scroll; `will-change: background-position` |

### GLS · GlassCard

| ID | Requirement |
|----|-------------|
| GLS-01 | `<GlassCard>` renders a frosted-glass surface with backdrop-filter blur |
| GLS-02 | Cursor parallax: card content shifts slightly as mouse moves across it |
| GLS-03 | Parallax is disabled when `prefers-reduced-motion: reduce` is set |
| GLS-04 | Props: `padding`, `radius`, `blur` (default values from tokens) |
| GLS-05 | Border uses `--zeep-border` with a thin translucent glow on hover |
| GLS-06 | `children` are rendered in a composable slot — no forced layout |

### TXT · ShimmerText

| ID | Requirement |
|----|-------------|
| TXT-01 | `<ShimmerText>` renders text with a moving shimmer gradient |
| TXT-02 | Shimmer direction: left-to-right, 2 s loop |
| TXT-03 | Respects `prefers-reduced-motion` — renders plain styled text when reduced |
| TXT-04 | Props: `size` (maps to `--zeep-font-*`), `weight`, `as` (default `"h1"`) |

### BTN · Button

| ID | Requirement |
|----|-------------|
| BTN-01 | `<Button>` supports variants: `"primary"` \| `"secondary"` \| `"ghost"` \| `"danger"` |
| BTN-02 | `"primary"` uses gradient fill derived from accent theme |
| BTN-03 | Press animation: subtle scale-down (98%) on `:active` |
| BTN-04 | Loading state: `isLoading` prop shows spinner, disables interaction |
| BTN-05 | Icon support: `leftIcon`, `rightIcon` slots |
| BTN-06 | Full keyboard accessibility (focus ring, Enter/Space activation) |

### DOT · StatusDot

| ID | Requirement |
|----|-------------|
| DOT-01 | `<StatusDot>` renders a small colored indicator circle |
| DOT-02 | Props: `status`: `"online"` \| `"offline"` \| `"busy"` \| `"away"` \| `color` (CSS color string) |
| DOT-03 | Optional `pulse` prop: adds a breathing animation for `"online"` status |

### TST · ToastProvider + useToast

| ID | Requirement |
|----|-------------|
| TST-01 | `<ToastProvider>` renders a toast container in a portal at screen corner |
| TST-02 | `useToast()` returns `{ success, error, info, warning, dismiss }` functions |
| TST-03 | Toasts auto-dismiss after `duration` ms (default: 3000) |
| TST-04 | At most 5 toasts visible simultaneously; oldest dismissed first when limit exceeded |
| TST-05 | Toasts are accessible: `role="status"` and `aria-live="polite"` |
| TST-06 | Swipe-to-dismiss gesture on the toast element |

### SKL · SkeletonLoader

| ID | Requirement |
|----|-------------|
| SKL-01 | `<Skeleton>` renders a shimmering placeholder rectangle |
| SKL-02 | Props: `width`, `height`, `radius` (default: `--zeep-radius-md`) |
| SKL-03 | `<SkeletonText lines={n}>` renders n lines of skeleton text at decreasing widths |
| SKL-04 | Shimmer uses CSS animation, respects `prefers-reduced-motion` |

### MD · MarkdownRenderer

| ID | Requirement |
|----|-------------|
| MD-01 | `<MarkdownRenderer>` converts markdown string to styled HTML |
| MD-02 | Uses `marked` or `micromark` (no heavy runtime like remark) |
| MD-03 | Code blocks: syntax highlighted via `highlight.js` (lazy-loaded) |
| MD-04 | Supports `<SearchHighlight query="..." />` prop to wrap matched text in `<mark>` |
| MD-05 | Output is sanitized (no XSS via user content) |

---

## Out of Scope (zeep-ui v1)

- Data table component
- Rich text editor
- Date picker / calendar
- Chart components
- Drag-and-drop primitives

---

## Testing

- Vitest + Testing Library for all components
- Visual regression: Chromatic or Percy (TBD per Q03 in STATE.md)
- Accessibility: `jest-axe` on every component
- Each component has a story / demo in the Tauri demo app
