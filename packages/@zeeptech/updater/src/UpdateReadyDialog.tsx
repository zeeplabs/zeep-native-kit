import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const STYLE_ID = 'zeep-updater-dialog-styles';

const CSS = `
.zeep-updater-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
.zeep-updater-dialog {
  background: var(--zeep-surface, #1a1a1e);
  border: 1px solid var(--zeep-border, #333);
  border-radius: var(--zeep-radius-lg, 12px);
  padding: 24px;
  max-width: 400px;
  width: calc(100vw - 32px);
  box-shadow: var(--zeep-shadow-xl, 0 8px 32px rgba(0,0,0,0.5));
  color: var(--zeep-text, #e4e4e7);
}
.zeep-updater-dialog h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}
.zeep-updater-dialog p {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--zeep-text-muted, #888);
  line-height: 1.5;
}
.zeep-updater-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.zeep-updater-dialog-btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--zeep-border, #333);
  background: var(--zeep-bg, #0d0d0f);
  color: var(--zeep-text, #e4e4e7);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.zeep-updater-dialog-btn:hover {
  background: var(--zeep-surface-hover, #2a2a2e);
}
.zeep-updater-dialog-btn-primary {
  background: var(--zeep-accent, #8b5cf6);
  color: #fff;
  border-color: var(--zeep-accent, #8b5cf6);
}
.zeep-updater-dialog-btn-primary:hover {
  background: var(--zeep-accent-light, #a78bfa);
}
`;

export interface UpdateReadyDialogProps {
  onRestart: () => void;
  onDismiss: () => void;
}

export function UpdateReadyDialog({ onRestart, onDismiss }: UpdateReadyDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="zeep-updater-overlay" onClick={onDismiss}>
      <div className="zeep-updater-dialog" onClick={(e) => { e.stopPropagation(); }}>
        <h2>Update Ready</h2>
        <p>
          The update has been downloaded and is ready to install.
          Restart the app to apply the update.
        </p>
        <div className="zeep-updater-dialog-actions">
          <button className="zeep-updater-dialog-btn" onClick={onDismiss}>
            Later
          </button>
          <button className="zeep-updater-dialog-btn zeep-updater-dialog-btn-primary" onClick={onRestart}>
            Restart &amp; Update
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
