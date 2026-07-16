import { useEffect } from 'react';

const STYLE_ID = 'zeep-updater-progress-styles';

const CSS = `
.zeep-updater-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--zeep-surface, #1a1a1e);
  border: 1px solid var(--zeep-border, #333);
  border-radius: var(--zeep-radius-md, 8px);
  font-size: 13px;
  color: var(--zeep-text, #e4e4e7);
}
.zeep-updater-progress-bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}
.zeep-updater-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--zeep-accent, #8b5cf6), #a78bfa);
  border-radius: 4px;
  transition: width 0.2s ease;
}
.zeep-updater-progress-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--zeep-text-muted, #888);
  min-width: 50px;
  text-align: right;
}
`;

export interface UpdateProgressProps {
  downloaded: number;
  contentLength: number | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdateProgress({ downloaded, contentLength }: UpdateProgressProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  const pct = contentLength && contentLength > 0
    ? Math.min(100, Math.round((downloaded / contentLength) * 100))
    : null;

  return (
    <div className="zeep-updater-progress" role="progressbar" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ flexShrink: 0 }}>Downloading update…</span>
      <div className="zeep-updater-progress-bar-track">
        <div className="zeep-updater-progress-bar-fill" style={{ width: pct ? `${pct}%` : 0 }} />
      </div>
      <span className="zeep-updater-progress-label">
        {pct !== null ? `${pct}%` : formatBytes(downloaded)}
      </span>
    </div>
  );
}
