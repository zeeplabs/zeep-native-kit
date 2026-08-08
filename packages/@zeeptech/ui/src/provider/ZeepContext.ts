import type { ReactNode } from 'react';
import { createContext } from 'react';
import type { AccentTheme, ResolvedTheme, Theme } from '../tokens/types.ts';

export interface ZeepContextValue {
  theme: ResolvedTheme;
  accentTheme: AccentTheme;
  brandName?: string | undefined;
  logo?: ReactNode | undefined;
  setTheme: (theme: Theme) => void;
  setAccentTheme: (accent: AccentTheme) => void;
}

export const ZeepContext = createContext<ZeepContextValue | null>(null);
