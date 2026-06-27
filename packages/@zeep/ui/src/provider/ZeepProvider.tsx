import { type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { injectTokens } from '../tokens/inject.ts';
import type { AccentTheme, ResolvedTheme, Theme } from '../tokens/types.ts';
import { ZeepContext, type ZeepContextValue } from './ZeepContext.ts';

function resolveSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? resolveSystemTheme() : theme;
}

export interface ZeepProviderProps {
  theme?: Theme | undefined;
  accentTheme?: AccentTheme | undefined;
  brandName?: string | undefined;
  logo?: ReactNode | undefined;
  children: ReactNode;
}

export function ZeepProvider({
  theme: themeProp = 'system',
  accentTheme: accentThemeProp = 'violet',
  brandName,
  logo,
  children,
}: ZeepProviderProps) {
  const parent = useContext(ZeepContext);

  const [controlledTheme, setControlledTheme] = useState<Theme>(themeProp);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(accentThemeProp);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    () => resolveTheme(themeProp),
  );

  useEffect(() => { setControlledTheme(themeProp); }, [themeProp]);
  useEffect(() => { setAccentTheme(accentThemeProp); }, [accentThemeProp]);

  useEffect(() => {
    setResolvedTheme(resolveTheme(controlledTheme));
    if (controlledTheme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => { mq.removeEventListener('change', handler); };
  }, [controlledTheme]);

  useEffect(() => {
    if (parent) return;
    injectTokens(document.documentElement, resolvedTheme, accentTheme);
  }, [parent, resolvedTheme, accentTheme]);

  const setTheme = useCallback((t: Theme) => { setControlledTheme(t); }, []);

  const value = useMemo<ZeepContextValue>(
    () => ({ theme: resolvedTheme, accentTheme, brandName, logo, setTheme, setAccentTheme }),
    [resolvedTheme, accentTheme, brandName, logo, setTheme],
  );

  return <ZeepContext.Provider value={value}>{children}</ZeepContext.Provider>;
}

export function useZeep(): ZeepContextValue {
  const ctx = useContext(ZeepContext);
  if (!ctx) throw new Error('useZeep must be used inside <ZeepProvider>');
  return ctx;
}
