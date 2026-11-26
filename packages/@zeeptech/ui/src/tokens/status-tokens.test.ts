import { describe, expect, it } from 'vitest';
import { baseTokens } from './base.ts';
import { injectTokens } from './inject.ts';

const STATUS = ['--zeep-danger', '--zeep-success', '--zeep-warning', '--zeep-info'] as const;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('status color tokens', () => {
  for (const theme of ['dark', 'light'] as const) {
    describe(theme, () => {
      const tokens = baseTokens[theme];

      it.each(STATUS)('%s is defined as a hex color', token => {
        expect(tokens[token]).toMatch(/^#[0-9a-f]{6}$/i);
      });

      // Error/success text must stay readable (WCAG AA, 4.5:1) on both surfaces.
      it.each(STATUS)('%s has AA contrast on surface and bg', token => {
        const color = tokens[token] as string;
        expect(contrast(color, tokens['--zeep-surface'] as string)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(color, tokens['--zeep-bg'] as string)).toBeGreaterThanOrEqual(4.5);
      });

      // @zeeptech/logger's LogLevelSelector renders `--zeep-bg` text on a filled status
      // color (active level); keep that pair readable too.
      it.each(STATUS)('%s is readable under --zeep-bg text (active level button)', token => {
        expect(contrast(tokens['--zeep-bg'] as string, tokens[token] as string)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it('injects the status tokens for the resolved theme', () => {
    const el = document.createElement('div');
    injectTokens(el, 'light', 'sunset');
    expect(el.style.getPropertyValue('--zeep-danger')).toBe(baseTokens.light['--zeep-danger']);
    injectTokens(el, 'dark', 'sunset');
    expect(el.style.getPropertyValue('--zeep-danger')).toBe(baseTokens.dark['--zeep-danger']);
  });
});
