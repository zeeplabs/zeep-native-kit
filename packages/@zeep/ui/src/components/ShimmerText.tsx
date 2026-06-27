import { type CSSProperties, type ReactNode, createElement, useEffect } from 'react';

const STYLE_ID = 'zeep-shimmer-text-styles';

const KEYFRAMES_CSS = `
@keyframes zeep-shimmer {
  from { background-position: -100% center; }
  to   { background-position: 200% center; }
}
@media (prefers-reduced-motion: reduce) {
  .zeep-shimmer-text {
    animation: none !important;
    background: none !important;
    -webkit-background-clip: unset !important;
    background-clip: unset !important;
    color: var(--zeep-accent) !important;
  }
}
`;

const fontSizeMap: Record<string, string> = {
  xs: 'var(--zeep-font-xs)',
  sm: 'var(--zeep-font-sm)',
  md: 'var(--zeep-font-md)',
  lg: 'var(--zeep-font-lg)',
  xl: 'var(--zeep-font-xl)',
  '2xl': 'var(--zeep-font-2xl)',
  '3xl': 'var(--zeep-font-3xl)',
};

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'p';

export interface ShimmerTextProps {
  children?: ReactNode | undefined;
  size?: keyof typeof fontSizeMap | undefined;
  weight?: CSSProperties['fontWeight'] | undefined;
  as?: HeadingTag | undefined;
  style?: CSSProperties | undefined;
  className?: string | undefined;
}

export function ShimmerText({
  children,
  size = '3xl',
  weight = 'bold',
  as: Tag = 'h1',
  style,
  className,
}: ShimmerTextProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = KEYFRAMES_CSS;
    document.head.appendChild(el);
  }, []);

  const shimmerStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: fontSizeMap[size] ?? size,
    fontWeight: weight,
    backgroundImage: [
      'linear-gradient(90deg,',
      'var(--zeep-text) 0%,',
      'var(--zeep-accent) 35%,',
      'var(--zeep-accent-light) 50%,',
      'var(--zeep-accent) 65%,',
      'var(--zeep-text) 100%)',
    ].join(' '),
    backgroundSize: '200% auto',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    animation: 'zeep-shimmer 2s linear infinite',
    margin: 0,
    ...style,
  };

  return createElement(
    Tag,
    { className: `zeep-shimmer-text${className ? ` ${className}` : ''}`, style: shimmerStyle },
    children,
  );
}
