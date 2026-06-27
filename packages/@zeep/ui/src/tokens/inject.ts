import { baseTokens } from './base.ts';
import { accentForest } from './accent-forest.ts';
import { accentGraphite } from './accent-graphite.ts';
import { accentOcean } from './accent-ocean.ts';
import { accentSunset } from './accent-sunset.ts';
import { accentViolet } from './accent-violet.ts';
import type { AccentTheme, AccentTokens, ResolvedTheme } from './types.ts';

const accentMap: Record<AccentTheme, AccentTokens> = {
  violet: accentViolet,
  ocean: accentOcean,
  sunset: accentSunset,
  forest: accentForest,
  graphite: accentGraphite,
};

export function injectTokens(
  element: HTMLElement,
  resolvedTheme: ResolvedTheme,
  accentTheme: AccentTheme,
): void {
  element.setAttribute('data-theme', resolvedTheme);

  const base = baseTokens[resolvedTheme];
  for (const [prop, value] of Object.entries(base)) {
    element.style.setProperty(prop, value);
  }

  const accent = accentMap[accentTheme];
  element.style.setProperty('--zeep-accent', accent.accent);
  element.style.setProperty('--zeep-accent-light', accent.accentLight);
  element.style.setProperty('--zeep-accent-dark', accent.accentDark);
  element.style.setProperty('--zeep-glow', accent.glow);
}
