import { useEffect } from 'react';

/**
 * Injects a component's stylesheet into `document.head` once, keyed by `id`.
 * Same mechanism the existing components use inline; shared by the form/list
 * components so each one doesn't repeat the effect.
 */
export function useInjectedStyles(id: string, css: string): void {
  useEffect(() => {
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Shared focus ring, matches `.zeep-btn:focus-visible`. */
export const FOCUS_RING = '0 0 0 2px var(--zeep-bg), 0 0 0 4px var(--zeep-accent)';

/** Error color. No dedicated token yet; `--zeep-danger` can override it. */
export const DANGER = 'var(--zeep-danger, #ef4444)';

/** Visually hidden but still read by screen readers. */
export const VISUALLY_HIDDEN_CSS =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
