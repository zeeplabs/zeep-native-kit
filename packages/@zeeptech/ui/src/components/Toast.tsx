import {
  type CSSProperties,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const STYLE_ID = 'zeep-toast-styles';

const TOAST_CSS = `
.zeep-toast-container {
  position: fixed; bottom: var(--zeep-space-4); right: var(--zeep-space-4);
  display: flex; flex-direction: column-reverse; gap: var(--zeep-space-2);
  z-index: 9999; pointer-events: none;
  max-width: 360px; width: calc(100vw - var(--zeep-space-8));
}
.zeep-toast {
  pointer-events: auto;
  display: flex; align-items: flex-start; gap: var(--zeep-space-3);
  padding: var(--zeep-space-3) var(--zeep-space-4);
  background: var(--zeep-surface); border: 1px solid var(--zeep-border);
  border-radius: var(--zeep-radius-md);
  box-shadow: var(--zeep-shadow-lg);
  font-size: var(--zeep-font-sm); color: var(--zeep-text);
  transition: transform 0.2s ease, opacity 0.2s ease;
  cursor: grab; user-select: none;
  touch-action: pan-y;
}
.zeep-toast:active { cursor: grabbing; }
.zeep-toast-icon { flex-shrink: 0; margin-top: 1px; }
.zeep-toast-body { flex: 1; min-width: 0; }
.zeep-toast-close {
  flex-shrink: 0; background: none; border: none; cursor: pointer;
  color: var(--zeep-text-muted); padding: 0; line-height: 1;
  font-size: 16px; opacity: 0.7;
}
.zeep-toast-close:hover { opacity: 1; }
`;

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const ICON_COLORS: Record<string, string> = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
  warning: '#eab308',
};

let nextId = 1;

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  duration?: number | undefined;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

export interface ToastContextValue {
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
  warning: (message: string, opts?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItemEl({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const startXRef = useRef<number | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => { onDismiss(item.id); }, item.duration);
    return () => { clearTimeout(timer); };
  }, [item.id, item.duration, onDismiss]);

  const iconStyle: CSSProperties = {
    color: ICON_COLORS[item.type],
    fontWeight: 'bold',
    fontSize: '14px',
  };

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startXRef.current = e.clientX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (startXRef.current === null || !elRef.current) return;
    const dx = e.clientX - startXRef.current;
    elRef.current.style.transform = `translateX(${dx}px)`;
    elRef.current.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 200));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (startXRef.current === null || !elRef.current) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(dx) > 50) {
      onDismiss(item.id);
    } else {
      elRef.current.style.transform = '';
      elRef.current.style.opacity = '';
    }
  }

  return (
    <div
      ref={elRef}
      className="zeep-toast"
      role="status"
      aria-live="polite"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <span className="zeep-toast-icon" style={iconStyle} aria-hidden="true">
        {ICONS[item.type]}
      </span>
      <span className="zeep-toast-body">{item.message}</span>
      <button
        className="zeep-toast-close"
        onClick={() => { onDismiss(item.id); }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export interface ToastProviderProps {
  children?: ReactNode | undefined;
  maxToasts?: number | undefined;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = TOAST_CSS;
    document.head.appendChild(el);
  }, []);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string, opts?: ToastOptions) => {
    const id = String(nextId++);
    const duration = opts?.duration ?? 3000;
    setToasts(prev => {
      const next = [...prev, { id, type, message, duration }];
      return next.length > maxToasts ? next.slice(next.length - maxToasts) : next;
    });
  }, [maxToasts]);

  const ctx: ToastContextValue = {
    success: (msg, opts) => { add('success', msg, opts); },
    error: (msg, opts) => { add('error', msg, opts); },
    info: (msg, opts) => { add('info', msg, opts); },
    warning: (msg, opts) => { add('warning', msg, opts); },
    dismiss,
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {createPortal(
        <div className="zeep-toast-container" aria-live="polite" aria-atomic="false">
          {toasts.map(t => (
            <ToastItemEl key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
