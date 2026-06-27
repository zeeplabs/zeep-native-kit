import { useEffect } from 'react';

const STYLE_ID = 'zeep-animated-bg-styles';

const KEYFRAMES_CSS = `
@keyframes zeep-bg-drift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .zeep-animated-bg-inner { animation: none !important; }
}
`;

const intensityMap = {
  subtle: { opacity: 0.25, blur: '80px' },
  medium: { opacity: 0.45, blur: '60px' },
  strong: { opacity: 0.65, blur: '40px' },
} as const;

export type BgIntensity = keyof typeof intensityMap;

export interface AnimatedBackgroundProps {
  intensity?: BgIntensity | undefined;
}

export function AnimatedBackground({ intensity = 'medium' }: AnimatedBackgroundProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = KEYFRAMES_CSS;
    document.head.appendChild(style);
  }, []);

  const { opacity, blur } = intensityMap[intensity];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      <div
        className="zeep-animated-bg-inner"
        style={{
          position: 'absolute',
          inset: '-20%',
          opacity,
          filter: `blur(${blur})`,
          willChange: 'background-position',
          backgroundImage: [
            'radial-gradient(ellipse at 20% 50%, var(--zeep-accent) 0%, transparent 55%)',
            'radial-gradient(ellipse at 80% 20%, var(--zeep-accent-dark) 0%, transparent 55%)',
            'radial-gradient(ellipse at 60% 80%, var(--zeep-glow) 0%, transparent 55%)',
          ].join(', '),
          backgroundSize: '200% 200%',
          animation: 'zeep-bg-drift 8s ease-in-out infinite',
        }}
      />
    </div>
  );
}
