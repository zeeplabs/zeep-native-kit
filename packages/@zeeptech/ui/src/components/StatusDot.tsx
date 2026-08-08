import { type CSSProperties, useEffect } from 'react';

const STYLE_ID = 'zeep-status-dot-styles';

const DOT_CSS = `
@keyframes zeep-dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--zeep-dot-color, #22c55e); }
  50%       { box-shadow: 0 0 0 4px transparent; }
}
.zeep-dot-pulse { animation: zeep-dot-pulse 2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .zeep-dot-pulse { animation: none; }
}
`;

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  offline: '#6b7280',
  busy: '#ef4444',
  away: '#eab308',
};

export type DotStatus = keyof typeof STATUS_COLORS;

export interface StatusDotProps {
  status?: DotStatus | undefined;
  color?: string | undefined;
  pulse?: boolean | undefined;
  size?: number | undefined;
}

export function StatusDot({ status = 'online', color, pulse = false, size = 8 }: StatusDotProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = DOT_CSS;
    document.head.appendChild(el);
  }, []);

  const dotColor = color ?? STATUS_COLORS[status];

  const style: CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: dotColor,
    flexShrink: 0,
    ['--zeep-dot-color' as string]: dotColor,
  };

  return (
    <span
      style={style}
      className={pulse ? 'zeep-dot-pulse' : undefined}
      role="img"
      aria-label={`Status: ${status}`}
    />
  );
}
