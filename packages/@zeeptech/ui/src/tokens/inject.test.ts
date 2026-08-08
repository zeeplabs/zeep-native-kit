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
