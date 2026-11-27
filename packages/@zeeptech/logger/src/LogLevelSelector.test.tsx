import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Lazy-import to let the mock take effect
async function mount() {
  const { LogLevelSelector } = await import('./LogLevelSelector.tsx');
  return render(<LogLevelSelector />);
}

describe('LogLevelSelector', () => {
  it('renders level buttons', async () => {
    await mount();
    expect(screen.getByText('Trace')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('highlights the active level', async () => {
    const { LogLevelSelector } = await import('./LogLevelSelector.tsx');
    const { container } = render(<LogLevelSelector initialLevel="Info" />);
    const btns = container.querySelectorAll('button');
    const infoBtn = Array.from(btns).find(b => b.textContent === 'Info');
    expect(infoBtn).toBeDefined();
    expect(infoBtn!.style.background).not.toBe('');
  });

  it('uses a theme-aware text color (not white) on the active button', async () => {
    const { LogLevelSelector } = await import('./LogLevelSelector.tsx');
    const { container } = render(<LogLevelSelector initialLevel="Warn" />);
    const warn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Warn');
    expect(warn!.style.color).toContain('--zeep-bg');
    expect(warn!.style.color).not.toBe('#fff');
  });
});
