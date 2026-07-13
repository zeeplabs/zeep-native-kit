# M1 Close: JS/TS Test Coverage + Frontend invoke() Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two remaining M1 gaps — 0% JS/TS test coverage and zero `invoke()` calls in the demo frontend — so M1 (Foundation) can be marked done.

**Architecture:** Vitest installed independently in `@zeep/core` (node env) and `@zeep/ui` (jsdom env), each package testing its own surface. The demo app (`apps/demo`) gains a direct dependency on `@zeep/core` and a new "Native Kit" section in the existing `UIGallery.tsx` page that calls the real command wrappers.

**Tech Stack:** Vitest, @testing-library/react, @testing-library/jest-dom, jsdom, pnpm workspaces.

## Global Constraints

- Node version in this environment: v20.20.2. pnpm: 10.33.0.
- `@zeep/ui` peer deps: `react ^18 || ^19`, `react-dom ^18 || ^19`. `apps/demo` uses React 18 — use React 18 for any test-only React rendering in `@zeep/ui` tests (its own devDependency is already React 19; do not change it).
- Each package's `vitest.config.ts` extends nothing shared — package-local config only (per design decision, YAGNI).
- Root `package.json` already has `"test": "pnpm -r test"` — do not modify it.
- Test file naming: colocated `*.test.ts`/`*.test.tsx` next to the source file, or `src/index.test.ts` for `@zeep/core` (single-file package).
- No changes to any Rust file, `zeep-core`, or `zeep-kit` crates.
- No new `@zeep/ui` components. No new routing/pages in `apps/demo`.
- Smoke-test depth only for `@zeep/ui`: render-without-crash + one essential behavior assertion per component file — not exhaustive variant coverage.

---

### Task 1: Vitest setup + unit tests for `@zeep/core`

**Files:**
- Modify: `packages/@zeep/core/package.json`
- Create: `packages/@zeep/core/vitest.config.ts`
- Create: `packages/@zeep/core/src/index.test.ts`

**Interfaces:**
- Consumes: the existing exports of `packages/@zeep/core/src/index.ts` — `prefsGet`, `prefsSet`, `prefsDelete`, `prefsGetAll`, `keychainGet`, `keychainSet`, `keychainDelete`, `shellWhich`, `shellRun`, `shellRunStream` — unchanged, do not edit that file.
- Produces: a passing `pnpm --filter @zeep/core test` command; nothing downstream depends on this task's output.

- [ ] **Step 1: Add vitest devDependency and test script**

Edit `packages/@zeep/core/package.json` — add `"vitest": "^2"` under `devDependencies`, and add a `"test"` entry to `scripts`:

```json
{
  "name": "@zeep/core",
  "version": "0.1.0",
  "description": "TypeScript bindings for zeep-core Tauri commands",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  },
  "peerDependencies": {
    "@tauri-apps/api": "^2"
  },
  "devDependencies": {
    "@tauri-apps/api": "^2",
    "typescript": "^5.4.0",
    "vitest": "^2"
  }
}
```

Run: `pnpm install` (from repo root)
Expected: lockfile updates, no errors.

- [ ] **Step 2: Write vitest config**

Create `packages/@zeep/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Write the failing tests**

Create `packages/@zeep/core/src/index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  prefsGet,
  prefsSet,
  prefsDelete,
  prefsGetAll,
  keychainGet,
  keychainSet,
  keychainDelete,
  shellWhich,
  shellRun,
  shellRunStream,
} from './index.ts';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

describe('prefs', () => {
  it('prefsGet invokes prefs_get with the key and returns the result', async () => {
    mockInvoke.mockResolvedValueOnce('stored-value');
    const result = await prefsGet('theme');
    expect(mockInvoke).toHaveBeenCalledWith('prefs_get', { key: 'theme' });
    expect(result).toBe('stored-value');
  });

  it('prefsSet invokes prefs_set with key and value', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await prefsSet('theme', 'dark');
    expect(mockInvoke).toHaveBeenCalledWith('prefs_set', { key: 'theme', value: 'dark' });
  });

  it('prefsDelete invokes prefs_delete with the key', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await prefsDelete('theme');
    expect(mockInvoke).toHaveBeenCalledWith('prefs_delete', { key: 'theme' });
  });

  it('prefsGetAll invokes prefs_get_all with no args', async () => {
    mockInvoke.mockResolvedValueOnce({ theme: 'dark' });
    const result = await prefsGetAll();
    expect(mockInvoke).toHaveBeenCalledWith('prefs_get_all');
    expect(result).toEqual({ theme: 'dark' });
  });
});

describe('keychain', () => {
  it('keychainGet invokes keychain_get with the key', async () => {
    mockInvoke.mockResolvedValueOnce('secret');
    const result = await keychainGet('api-token');
    expect(mockInvoke).toHaveBeenCalledWith('keychain_get', { key: 'api-token' });
    expect(result).toBe('secret');
  });

  it('keychainSet invokes keychain_set with key and value', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await keychainSet('api-token', 'secret');
    expect(mockInvoke).toHaveBeenCalledWith('keychain_set', { key: 'api-token', value: 'secret' });
  });

  it('keychainDelete invokes keychain_delete with the key', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await keychainDelete('api-token');
    expect(mockInvoke).toHaveBeenCalledWith('keychain_delete', { key: 'api-token' });
  });
});

describe('shell', () => {
  it('shellWhich invokes shell_which with the program', async () => {
    mockInvoke.mockResolvedValueOnce('/usr/bin/node');
    const result = await shellWhich('node');
    expect(mockInvoke).toHaveBeenCalledWith('shell_which', { program: 'node' });
    expect(result).toBe('/usr/bin/node');
  });

  it('shellRun invokes shell_run with program, args, cwd, env', async () => {
    const output = { stdout: 'v20.20.2', stderr: '', exitCode: 0 };
    mockInvoke.mockResolvedValueOnce(output);
    const result = await shellRun('node', ['--version'], { cwd: '/tmp', env: { FOO: 'bar' } });
    expect(mockInvoke).toHaveBeenCalledWith('shell_run', {
      program: 'node',
      args: ['--version'],
      cwd: '/tmp',
      env: { FOO: 'bar' },
    });
    expect(result).toEqual(output);
  });

  it('shellRun omits cwd/env when options are not passed', async () => {
    mockInvoke.mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 });
    await shellRun('node', ['--version']);
    expect(mockInvoke).toHaveBeenCalledWith('shell_run', {
      program: 'node',
      args: ['--version'],
      cwd: undefined,
      env: undefined,
    });
  });

  it('shellRunStream invokes shell_run_stream with program, args, cwd, env', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await shellRunStream('node', ['--version'], { cwd: '/tmp' });
    expect(mockInvoke).toHaveBeenCalledWith('shell_run_stream', {
      program: 'node',
      args: ['--version'],
      cwd: '/tmp',
      env: undefined,
    });
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @zeep/core test`
Expected: 11 tests pass (4 prefs + 3 keychain + 4 shell), 0 failures.

If any test fails because the mocked call shape doesn't match `src/index.ts`, fix the test to match the real call — do not change `src/index.ts` (it is correct and already covered by this task's design as unchanged).

- [ ] **Step 5: Commit**

```bash
git add packages/@zeep/core/package.json packages/@zeep/core/vitest.config.ts packages/@zeep/core/src/index.test.ts pnpm-lock.yaml
git commit -m "test(@zeep/core): add Vitest setup and unit tests for command wrappers"
```

---

### Task 2: Vitest setup + smoke tests for `@zeep/ui`

**Files:**
- Modify: `packages/@zeep/ui/package.json`
- Create: `packages/@zeep/ui/vitest.config.ts`
- Create: `packages/@zeep/ui/src/test-setup.ts`
- Create: `packages/@zeep/ui/src/components/AnimatedBackground.test.tsx`
- Create: `packages/@zeep/ui/src/components/Button.test.tsx`
- Create: `packages/@zeep/ui/src/components/GlassCard.test.tsx`
- Create: `packages/@zeep/ui/src/components/ShimmerText.test.tsx`
- Create: `packages/@zeep/ui/src/components/StatusDot.test.tsx`
- Create: `packages/@zeep/ui/src/components/Toast.test.tsx`
- Create: `packages/@zeep/ui/src/components/Skeleton.test.tsx`
- Create: `packages/@zeep/ui/src/components/Markdown.test.tsx`
- Create: `packages/@zeep/ui/src/tokens/inject.test.ts`

**Interfaces:**
- Consumes: existing `@zeep/ui` component exports (`AnimatedBackground`, `Button`, `GlassCard`, `ShimmerText`, `StatusDot`, `ToastProvider`, `useToast`, `Skeleton`, `SkeletonText`, `MarkdownRenderer`, `SearchHighlight`, `injectTokens`) — none of these are modified by this task.
- Produces: a passing `pnpm --filter @zeep/ui test` command; nothing downstream depends on this task's output.

- [ ] **Step 1: Add test devDependencies and test script**

Edit `packages/@zeep/ui/package.json`:

```json
{
  "name": "@zeep/ui",
  "version": "0.1.0",
  "description": "React component library and design system for Tauri desktop apps",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tokens": "./src/tokens/index.ts"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "dompurify": "^3",
    "highlight.js": "^11",
    "marked": "^14"
  },
  "peerDependencies": {
    "react": "^18 || ^19",
    "react-dom": "^18 || ^19"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^16",
    "@testing-library/user-event": "^14",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "jsdom": "^25",
    "react": "^19",
    "react-dom": "^19",
    "typescript": "^5.4.0",
    "vitest": "^2"
  }
}
```

Run: `pnpm install` (from repo root)
Expected: lockfile updates, no errors.

- [ ] **Step 2: Write vitest config and test setup**

Create `packages/@zeep/ui/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Create `packages/@zeep/ui/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Write the failing tests**

Create `packages/@zeep/ui/src/components/AnimatedBackground.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AnimatedBackground } from './AnimatedBackground.tsx';

describe('AnimatedBackground', () => {
  it('renders without crashing for each intensity', () => {
    for (const intensity of ['subtle', 'medium', 'strong'] as const) {
      const { container, unmount } = render(<AnimatedBackground intensity={intensity} />);
      expect(container.querySelector('.zeep-animated-bg-inner')).not.toBeNull();
      unmount();
    }
  });
});
```

Create `packages/@zeep/ui/src/components/Button.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button.tsx';

describe('Button', () => {
  it('renders children and calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

Create `packages/@zeep/ui/src/components/GlassCard.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard } from './GlassCard.tsx';

describe('GlassCard', () => {
  it('renders children inside the card', () => {
    render(<GlassCard>hello card</GlassCard>);
    expect(screen.getByText('hello card')).toBeInTheDocument();
  });
});
```

Create `packages/@zeep/ui/src/components/ShimmerText.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShimmerText } from './ShimmerText.tsx';

describe('ShimmerText', () => {
  it('renders as the requested tag with its children', () => {
    render(<ShimmerText as="h2">Heading text</ShimmerText>);
    const el = screen.getByText('Heading text');
    expect(el.tagName).toBe('H2');
  });
});
```

Create `packages/@zeep/ui/src/components/StatusDot.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusDot } from './StatusDot.tsx';

describe('StatusDot', () => {
  it('applies the color for the given status', () => {
    render(<StatusDot status="busy" />);
    const dot = screen.getByRole('img', { name: 'Status: busy' });
    expect(dot.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('uses an explicit color override when provided', () => {
    render(<StatusDot status="online" color="#000000" />);
    const dot = screen.getByRole('img', { name: 'Status: online' });
    expect(dot.style.backgroundColor).toBe('rgb(0, 0, 0)');
  });
});
```

Create `packages/@zeep/ui/src/components/Toast.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { ToastProvider, useToast } from './Toast.tsx';

function TriggerButton() {
  const toast = useToast();
  return <button onClick={() => toast.success('Operação concluída!')}>trigger</button>;
}

describe('Toast', () => {
  it('renders a message when a toast is triggered', async () => {
    render(
      <ToastProvider>
        <TriggerButton />
      </ToastProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'trigger' });
    await act(async () => {
      trigger.click();
    });
    expect(screen.getByText('Operação concluída!')).toBeInTheDocument();
  });

  it('throws if useToast is used outside a ToastProvider', () => {
    function Bare() {
      useToast();
      return null;
    }
    expect(() => render(<Bare />)).toThrow('useToast must be used inside <ToastProvider>');
  });
});
```

Create `packages/@zeep/ui/src/components/Skeleton.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonText } from './Skeleton.tsx';

describe('Skeleton', () => {
  it('renders with the requested width and height', () => {
    const { container } = render(<Skeleton width={120} height={20} />);
    const el = container.querySelector('.zeep-skeleton') as HTMLElement;
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('20px');
  });
});

describe('SkeletonText', () => {
  it('renders the requested number of lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll('.zeep-skeleton').length).toBe(4);
  });
});
```

Create `packages/@zeep/ui/src/components/Markdown.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer, SearchHighlight } from './Markdown.tsx';

describe('MarkdownRenderer', () => {
  it('renders parsed markdown as sanitized HTML', () => {
    render(<MarkdownRenderer content="**bold text**" />);
    const strong = screen.getByText('bold text');
    expect(strong.tagName).toBe('STRONG');
  });

  it('strips script tags (XSS-safe)', () => {
    const { container } = render(<MarkdownRenderer content={'<script>alert(1)</script>hello'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('hello');
  });
});

describe('SearchHighlight', () => {
  it('wraps the matching query in a highlight element', () => {
    render(<SearchHighlight text="Hello Zeep world" query="Zeep" />);
    const mark = screen.getByText('Zeep');
    expect(mark.tagName).toBe('MARK');
  });
});
```

Create `packages/@zeep/ui/src/tokens/inject.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { injectTokens } from './inject.ts';

describe('injectTokens', () => {
  it('sets data-theme and base + accent CSS variables on the element', () => {
    const el = document.createElement('div');
    injectTokens(el, 'dark', 'violet');
    expect(el.getAttribute('data-theme')).toBe('dark');
    expect(el.style.getPropertyValue('--zeep-accent')).not.toBe('');
    expect(el.style.getPropertyValue('--zeep-accent-light')).not.toBe('');
    expect(el.style.getPropertyValue('--zeep-accent-dark')).not.toBe('');
    expect(el.style.getPropertyValue('--zeep-glow')).not.toBe('');
  });
});
```

- [ ] **Step 4: Run tests, fix mismatches against real component behavior, run again**

Run: `pnpm --filter @zeep/ui test`
Expected: all test files pass.

Known risk points to check against the actual source before treating a failure as a real bug:
- `MarkdownRenderer`/`SearchHighlight` prop names (`content`/`text`/`query`) — confirm against `Markdown.tsx`'s actual prop interfaces; adjust the test props to match, do not change the component.
- `SkeletonText` prop name for line count (assumed `lines`) — confirm against `Skeleton.tsx`; adjust the test to match.
- `StatusDot` computed `rgb(...)` string — jsdom's `style.backgroundColor` getter normalizes hex to `rgb(...)`; if the assertion fails, log the actual value and match it exactly.

If any assertion fails because the component genuinely behaves differently than assumed here, fix the test to match the real, correct behavior — these are smoke tests describing existing behavior, not a spec the component must be changed to satisfy.

- [ ] **Step 5: Commit**

```bash
git add packages/@zeep/ui/package.json packages/@zeep/ui/vitest.config.ts packages/@zeep/ui/src/test-setup.ts packages/@zeep/ui/src/components/*.test.tsx packages/@zeep/ui/src/tokens/inject.test.ts pnpm-lock.yaml
git commit -m "test(@zeep/ui): add Vitest setup and smoke tests for all 9 components"
```

---

### Task 3: Native Kit section — wire real invoke() calls into the demo app

**Files:**
- Modify: `apps/demo/package.json`
- Modify: `apps/demo/src/pages/UIGallery.tsx`

**Interfaces:**
- Consumes: `@zeep/core`'s `prefsGet`, `prefsSet`, `keychainGet`, `keychainSet`, `shellWhich` (all unchanged); `@zeep/ui`'s `Button`, `GlassCard` (already imported in `UIGallery.tsx`).
- Produces: a UI section manually verifiable by running the demo app end-to-end against the real `zeep-kit:default` capability — no other task depends on this output.

- [ ] **Step 1: Add `@zeep/core` as a dependency of the demo app**

Edit `apps/demo/package.json`, add `"@zeep/core": "workspace:*"` under `dependencies`:

```json
{
  "name": "zeep-demo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@zeep/core": "workspace:*",
    "@zeep/ui": "workspace:*",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "vite": "^5"
  }
}
```

Run: `pnpm install` (from repo root)
Expected: lockfile updates, `apps/demo/node_modules/@zeep/core` resolves to the workspace package.

- [ ] **Step 2: Add the Native Kit section to `UIGallery.tsx`**

Edit `apps/demo/src/pages/UIGallery.tsx`. First, add the import alongside the existing `@zeep/ui` import block near the top of the file:

```tsx
import { prefsGet, prefsSet, keychainGet, keychainSet, shellWhich } from '@zeep/core';
```

Then, inside `GalleryContent`, add state for the section's inputs and results, next to the existing `searchQuery` state:

```tsx
const [prefsValue, setPrefsValue] = useState('');
const [prefsResult, setPrefsResult] = useState<string | null>(null);
const [keychainValue, setKeychainValue] = useState('');
const [keychainResult, setKeychainResult] = useState<string | null>(null);
const [shellResult, setShellResult] = useState<string | null>(null);

async function handlePrefsSet() {
  try {
    await prefsSet('native-kit-demo', prefsValue);
    setPrefsResult(`set ok: "${prefsValue}"`);
  } catch (err) {
    setPrefsResult(`error: ${String(err)}`);
  }
}

async function handlePrefsGet() {
  try {
    const value = await prefsGet('native-kit-demo');
    setPrefsResult(`get: ${JSON.stringify(value)}`);
  } catch (err) {
    setPrefsResult(`error: ${String(err)}`);
  }
}

async function handleKeychainSet() {
  try {
    await keychainSet('native-kit-demo', keychainValue);
    setKeychainResult(`set ok: "${keychainValue}"`);
  } catch (err) {
    setKeychainResult(`error: ${String(err)}`);
  }
}

async function handleKeychainGet() {
  try {
    const value = await keychainGet('native-kit-demo');
    setKeychainResult(`get: ${JSON.stringify(value)}`);
  } catch (err) {
    setKeychainResult(`error: ${String(err)}`);
  }
}

async function handleShellWhich() {
  try {
    const path = await shellWhich('node');
    setShellResult(`node: ${JSON.stringify(path)}`);
  } catch (err) {
    setShellResult(`error: ${String(err)}`);
  }
}
```

Finally, add the section JSX. Place it right after the existing `{/* ── SearchHighlight ── */}` section block (before the closing `</div>` tags at the end of the component's returned markup):

```tsx
{/* ── Native Kit (zeep-kit:default capability) ── */}
<div style={section}>
  <div style={sectionTitle}>Native Kit</div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div>
      <div style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)', marginBottom: '0.5rem' }}>
        Prefs
      </div>
      <div style={row}>
        <input
          type="text"
          value={prefsValue}
          onChange={e => { setPrefsValue(e.target.value); }}
          placeholder="value to store"
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--zeep-radius-md)',
            border: '1px solid var(--zeep-border)',
            background: 'var(--zeep-surface)',
            color: 'var(--zeep-text)',
            fontSize: 'var(--zeep-font-sm)',
            outline: 'none',
          }}
        />
        <Button variant="secondary" size="sm" onClick={handlePrefsSet}>set</Button>
        <Button variant="secondary" size="sm" onClick={handlePrefsGet}>get</Button>
        {prefsResult !== null && (
          <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>{prefsResult}</span>
        )}
      </div>
    </div>

    <div>
      <div style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)', marginBottom: '0.5rem' }}>
        Keychain
      </div>
      <div style={row}>
        <input
          type="text"
          value={keychainValue}
          onChange={e => { setKeychainValue(e.target.value); }}
          placeholder="secret to store"
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--zeep-radius-md)',
            border: '1px solid var(--zeep-border)',
            background: 'var(--zeep-surface)',
            color: 'var(--zeep-text)',
            fontSize: 'var(--zeep-font-sm)',
            outline: 'none',
          }}
        />
        <Button variant="secondary" size="sm" onClick={handleKeychainSet}>set</Button>
        <Button variant="secondary" size="sm" onClick={handleKeychainGet}>get</Button>
        {keychainResult !== null && (
          <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>{keychainResult}</span>
        )}
      </div>
    </div>

    <div>
      <div style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)', marginBottom: '0.5rem' }}>
        Shell
      </div>
      <div style={row}>
        <Button variant="secondary" size="sm" onClick={handleShellWhich}>which node</Button>
        {shellResult !== null && (
          <span style={{ fontSize: 'var(--zeep-font-sm)', color: 'var(--zeep-text-muted)' }}>{shellResult}</span>
        )}
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Type-check and build**

Run: `pnpm --filter zeep-demo build`
Expected: TypeScript compiles with no errors, Vite build succeeds.

- [ ] **Step 4: Manual verification (documented, not automated — see plan's Non-goals)**

Run: `cd apps/demo && pnpm tauri dev` (or `cargo tauri dev` from `apps/demo/src-tauri` if the `tauri` CLI script isn't wired — check `apps/demo/package.json`'s `tauri` script first).

In the running window, scroll to the "Native Kit" section and:
1. Type a value in the Prefs input, click "set", click "get" — confirm the result span shows the value round-tripped.
2. Repeat for Keychain.
3. Click "which node" — confirm it shows a resolved path (or `null` if `node` isn't on `PATH` inside the packaged app's environment — either is an acceptable proof the IPC round-trip works; a thrown/uncaught error is not).

If any action shows `error: ...` instead of a result, that means the `zeep-kit:default` capability or the plugin registration has a real bug — stop and report it; do not modify `capabilities/default.json` or `zeep-kit`'s permission files as a NEEDS_CONTEXT escalation, since backend changes are out of scope for this plan (Non-goals). Report status as BLOCKED with the exact error text.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/package.json apps/demo/src/pages/UIGallery.tsx pnpm-lock.yaml
git commit -m "feat(demo): wire invoke() calls into UIGallery Native Kit section"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers @zeep/core tests goal. Task 2 covers @zeep/ui smoke tests goal. Task 3 covers the Native Kit UI wiring goal. All three design goals are mapped.
- **Placeholder scan:** no TBD/TODO; all code blocks are complete and runnable given current file contents observed during planning.
- **Type consistency:** `@zeep/core` wrapper signatures used in Task 3 match `packages/@zeep/core/src/index.ts` exactly (`prefsGet(key)`, `prefsSet(key, value)`, `keychainGet(key)`, `keychainSet(key, value)`, `shellWhich(program)`).
- **Known unknowns flagged inline for the implementer:** exact prop names on `MarkdownRenderer`/`SearchHighlight`/`SkeletonText` were inferred from usage in `UIGallery.tsx` and file structure, not fully read line-by-line during planning — Task 2 Step 4 explicitly instructs the implementer to reconcile against the real source rather than treating a mismatch as a component bug.
