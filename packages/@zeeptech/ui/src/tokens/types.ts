export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type AccentTheme = 'violet' | 'ocean' | 'sunset' | 'forest' | 'graphite';
export type TokenMap = Record<string, string>;

export interface BaseTokens {
  dark: TokenMap;
  light: TokenMap;
}

export interface AccentTokens {
  accent: string;
  accentLight: string;
  accentDark: string;
  glow: string;
}
