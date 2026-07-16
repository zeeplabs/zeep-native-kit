import { useEffect } from 'react';

const STYLE_ID = 'zeep-updater-styles';

const CSS = `
.zeep-updater-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--zeep-accent-dark, #5b21b6), var(--zeep-accent, #8b5cf6));
  color: #fff;
  font-size: 13px;
  border-radius: var(--zeep-radius-md, 8px);
  box-shadow: var(--zeep-shadow-lg, 0 4px 16px rgba(0,0,0,0.3));
}
.zeep-updater-banner-text {
  flex: 1;
}
.zeep-updater-banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.zeep-updater-banner-btn {
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.zeep-updater-banner-btn:hover {
  background: rgba(255,255,255,0.25);
}
.zeep-updater-banner-btn-primary {
  background: #fff;
  color: var(--zeep-accent-dark, #5b21b6);
  border-color: #fff;
}
.zeep-updater-banner-btn-primary:hover {
  background: rgba(255,255,255,0.9);
}
`;

export interface UpdateBannerProps {
  version: string;
  notes: string | null;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, notes, onInstall, onDismiss }: UpdateBannerProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  return (
    <div className="zeep-updater-banner" role="alert">
      <div className="zeep-updater-banner-text">
        <strong>Update available</strong> — version {version}
        {notes && (
          <span style={{ opacity: 0.85, marginLeft: 8, fontSize: 12 }}>
            {notes.length > 120 ? notes.slice(0, 120) + '…' : notes}
          </span>
        )}
      </div>
      <div className="zeep-updater-banner-actions">
        <button className="zeep-updater-banner-btn zeep-updater-banner-btn-primary" onClick={onInstall}>
          Update Now
        </button>
        <button className="zeep-updater-banner-btn" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
