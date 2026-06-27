import { type CSSProperties, type MouseEvent, type ReactNode, useCallback, useRef, useState } from 'react';

const PARALLAX_MAX = 4;

const paddingMap: Record<string, string> = {
  xs: 'var(--zeep-space-2)',
  sm: 'var(--zeep-space-3)',
  md: 'var(--zeep-space-4)',
  lg: 'var(--zeep-space-6)',
  xl: 'var(--zeep-space-8)',
};

const radiusMap: Record<string, string> = {
  sm: 'var(--zeep-radius-sm)',
  md: 'var(--zeep-radius-md)',
  lg: 'var(--zeep-radius-lg)',
  full: 'var(--zeep-radius-full)',
};

export interface GlassCardProps {
  padding?: keyof typeof paddingMap | (string & {}) | undefined;
  radius?: keyof typeof radiusMap | (string & {}) | undefined;
  blur?: number | undefined;
  children?: ReactNode | undefined;
  style?: CSSProperties | undefined;
  className?: string | undefined;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function GlassCard({
  padding = 'md',
  radius = 'lg',
  blur = 12,
  children,
  style,
  className,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion() || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ((e.clientX - cx) / (rect.width / 2)) * PARALLAX_MAX;
    const dy = ((e.clientY - cy) / (rect.height / 2)) * PARALLAX_MAX;
    setTranslate({ x: dx, y: dy });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    setHovered(false);
  }, []);

  const resolvedPadding = paddingMap[padding] ?? padding;
  const resolvedRadius = radiusMap[radius] ?? radius;

  const cardStyle: CSSProperties = {
    position: 'relative',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    background: 'rgba(var(--zeep-surface-rgb, 22 22 26), 0.6)',
    border: `1px solid var(--zeep-border)`,
    borderRadius: resolvedRadius,
    boxShadow: hovered
      ? `0 0 0 1px var(--zeep-accent), var(--zeep-shadow-md)`
      : 'var(--zeep-shadow-sm)',
    transition: 'box-shadow 0.2s ease',
    overflow: 'hidden',
    ...style,
  };

  const contentStyle: CSSProperties = {
    padding: resolvedPadding,
    transform: `translate(${translate.x}px, ${translate.y}px)`,
    transition: translate.x === 0 && translate.y === 0 ? 'transform 0.3s ease' : 'none',
    willChange: hovered ? 'transform' : 'auto',
  };

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      className={className}
      onMouseMove={onMouseMove}
      onMouseEnter={() => { setHovered(true); }}
      onMouseLeave={onMouseLeave}
    >
      <div style={contentStyle}>{children}</div>
    </div>
  );
}
