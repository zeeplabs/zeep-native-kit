import { type CSSProperties, useEffect } from 'react';
import type { DetectedProvider } from './useAI.ts';

const STYLE_ID = 'zeep-ai-provider-status-styles';

const CSS = `
.zeep-ai-provider-status {
  display: flex;
  flex-direction: column;
  gap: var(--zeep-space-2, 8px);
}
.zeep-ai-provider-row {
  display: flex;
  align-items: center;
  gap: var(--zeep-space-3, 12px);
  padding: var(--zeep-space-2, 8px) var(--zeep-space-3, 12px);
  border-radius: var(--zeep-radius-md, 6px);
  background: var(--zeep-surface, #1a1a1e);
  border: 1px solid var(--zeep-border, #333);
}
.zeep-ai-provider-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.zeep-ai-provider-dot.online { background: #22c55e; }
.zeep-ai-provider-dot.offline { background: #ef4444; }
.zeep-ai-provider-name {
  font-weight: 600;
  color: var(--zeep-text, #e4e4e7);
  font-size: var(--zeep-font-sm, 13px);
}
.zeep-ai-provider-version {
  margin-left: auto;
  color: var(--zeep-text-muted, #888);
  font-size: var(--zeep-font-xs, 11px);
  font-family: ui-monospace, monospace;
}
`;

export interface AIProviderStatusProps {
  providers: DetectedProvider[];
  style?: CSSProperties | undefined;
}

export function AIProviderStatus({ providers, style }: AIProviderStatusProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  if (providers.length === 0) {
    return (
      <div className="zeep-ai-provider-status" style={style}>
        <span style={{ color: 'var(--zeep-text-muted, #888)', fontSize: 'var(--zeep-font-sm, 13px)' }}>
          No AI providers detected.
        </span>
      </div>
    );
  }

  return (
    <div className="zeep-ai-provider-status" style={style}>
      {providers.map((p) => (
        <div key={p.name} className="zeep-ai-provider-row">
          <span className={`zeep-ai-provider-dot ${p.version ? 'online' : 'offline'}`} />
          <span className="zeep-ai-provider-name">{p.name}</span>
          {p.version && <span className="zeep-ai-provider-version">{p.version}</span>}
        </div>
      ))}
    </div>
  );
}
