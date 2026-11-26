import { type ButtonHTMLAttributes, type ReactNode, useEffect } from 'react';

const STYLE_ID = 'zeep-button-styles';

const BUTTON_CSS = `
.zeep-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--zeep-space-2); border: none; cursor: pointer;
  font-family: inherit; font-weight: 500;
  border-radius: var(--zeep-radius-md);
  transition: box-shadow 0.15s ease, transform 0.1s ease, background 0.15s ease, border-color 0.15s ease;
  outline: none; position: relative; white-space: nowrap; user-select: none;
  text-decoration: none; line-height: 1.25;
}
.zeep-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--zeep-bg), 0 0 0 4px var(--zeep-accent);
}
.zeep-btn:active:not(:disabled):not([aria-disabled="true"]) { transform: scale(0.98); }
.zeep-btn:disabled, .zeep-btn[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

.zeep-btn-sm { padding: var(--zeep-space-1) var(--zeep-space-3); font-size: var(--zeep-font-sm); }
.zeep-btn-md { padding: var(--zeep-space-2) var(--zeep-space-4); font-size: var(--zeep-font-md); }
.zeep-btn-lg { padding: var(--zeep-space-3) var(--zeep-space-6); font-size: var(--zeep-font-lg); }

.zeep-btn-primary {
  background: linear-gradient(135deg, var(--zeep-accent), var(--zeep-accent-dark));
  color: #fff; border: 1px solid transparent;
}
.zeep-btn-primary:hover:not(:disabled):not([aria-disabled="true"]) {
  background: linear-gradient(135deg, var(--zeep-accent-light), var(--zeep-accent));
  box-shadow: 0 0 16px var(--zeep-glow);
}
.zeep-btn-secondary {
  background: var(--zeep-surface); color: var(--zeep-text); border: 1px solid var(--zeep-border);
}
.zeep-btn-secondary:hover:not(:disabled):not([aria-disabled="true"]) {
  border-color: var(--zeep-accent); box-shadow: 0 0 8px var(--zeep-glow);
}
.zeep-btn-ghost {
  background: transparent; color: var(--zeep-text); border: 1px solid transparent;
}
.zeep-btn-ghost:hover:not(:disabled):not([aria-disabled="true"]) {
  background: rgba(255,255,255,0.06);
}
.zeep-btn-danger {
  background: linear-gradient(135deg, var(--zeep-danger, #ef4444), color-mix(in srgb, var(--zeep-danger, #ef4444) 70%, #000)); color: #fff; border: 1px solid transparent;
}
.zeep-btn-danger:hover:not(:disabled):not([aria-disabled="true"]) {
  background: linear-gradient(135deg, color-mix(in srgb, var(--zeep-danger, #ef4444) 80%, #fff), var(--zeep-danger, #ef4444));
  box-shadow: 0 0 16px color-mix(in srgb, var(--zeep-danger, #ef4444) 40%, transparent);
}

@keyframes zeep-spin { to { transform: rotate(360deg); } }
.zeep-btn-spinner { animation: zeep-spin 0.8s linear infinite; flex-shrink: 0; }
`;

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="zeep-btn-spinner" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 1-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  isLoading?: boolean | undefined;
  leftIcon?: ReactNode | undefined;
  rightIcon?: ReactNode | undefined;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = BUTTON_CSS;
    document.head.appendChild(el);
  }, []);

  const isDisabled = disabled ?? isLoading;
  const classes = [
    'zeep-btn',
    `zeep-btn-${size}`,
    `zeep-btn-${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
