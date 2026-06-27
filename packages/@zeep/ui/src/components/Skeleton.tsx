import { type CSSProperties, useEffect } from 'react';

const STYLE_ID = 'zeep-skeleton-styles';

const SKELETON_CSS = `
@keyframes zeep-skeleton-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.zeep-skeleton {
  background: linear-gradient(
    90deg,
    var(--zeep-border) 25%,
    var(--zeep-surface) 50%,
    var(--zeep-border) 75%
  );
  background-size: 200% 100%;
  animation: zeep-skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--zeep-radius-sm);
}
@media (prefers-reduced-motion: reduce) {
  .zeep-skeleton {
    animation: none;
    background: var(--zeep-border);
  }
}
`;

const radiusMap: Record<string, string> = {
  sm: 'var(--zeep-radius-sm)',
  md: 'var(--zeep-radius-md)',
  lg: 'var(--zeep-radius-lg)',
  full: 'var(--zeep-radius-full)',
};

export interface SkeletonProps {
  width?: number | string | undefined;
  height?: number | string | undefined;
  radius?: keyof typeof radiusMap | (string & {}) | undefined;
  style?: CSSProperties | undefined;
  className?: string | undefined;
}

export function Skeleton({ width = '100%', height = 16, radius = 'sm', style, className }: SkeletonProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = SKELETON_CSS;
    document.head.appendChild(el);
  }, []);

  const resolvedRadius = radiusMap[radius] ?? radius;

  return (
    <div
      className={`zeep-skeleton${className ? ` ${className}` : ''}`}
      style={{
        width,
        height,
        borderRadius: resolvedRadius,
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

const LINE_WIDTHS = ['100%', '80%', '60%', '40%', '90%', '70%', '50%'];

export interface SkeletonTextProps {
  lines?: number | undefined;
  lineHeight?: number | undefined;
  gap?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export function SkeletonText({ lines = 3, lineHeight = 16, gap = 8, className, style }: SkeletonTextProps) {
  const count = Math.max(1, lines);

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap, ...style }}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          width={LINE_WIDTHS[i % LINE_WIDTHS.length]}
          height={lineHeight}
        />
      ))}
    </div>
  );
}
