import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from 'react';
import { FOCUS_RING, useInjectedStyles } from '../internal/useInjectedStyles.ts';

const STYLE_ID = 'zeep-tabs-styles';

const TABS_CSS = `
.zeep-tabs { display: flex; flex-direction: column; gap: var(--zeep-space-4); font-family: inherit; }
.zeep-tabs-list {
  display: flex; gap: var(--zeep-space-1); border-bottom: 1px solid var(--zeep-border);
  overflow-x: auto; scrollbar-width: none;
}
.zeep-tabs-tab {
  position: relative; background: none; border: none; cursor: pointer;
  font: inherit; font-size: var(--zeep-font-sm); font-weight: 500;
  color: var(--zeep-text-muted); white-space: nowrap;
  padding: var(--zeep-space-2) var(--zeep-space-3);
  border-radius: var(--zeep-radius-sm) var(--zeep-radius-sm) 0 0;
  outline: none; transition: color 0.15s ease, background 0.15s ease;
}
.zeep-tabs-tab:hover:not(:disabled) { color: var(--zeep-text); background: color-mix(in srgb, var(--zeep-accent) 6%, transparent); }
.zeep-tabs-tab:focus-visible { box-shadow: ${FOCUS_RING}; }
.zeep-tabs-tab[aria-selected="true"] { color: var(--zeep-text); }
.zeep-tabs-tab[aria-selected="true"]::after {
  content: ''; position: absolute; left: var(--zeep-space-2); right: var(--zeep-space-2); bottom: -1px;
  height: 2px; border-radius: 2px; background: var(--zeep-accent);
}
.zeep-tabs-tab:disabled { opacity: 0.5; cursor: not-allowed; }
.zeep-tabs-panel { outline: none; }
.zeep-tabs-panel:focus-visible { box-shadow: ${FOCUS_RING}; border-radius: var(--zeep-radius-sm); }
`;

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean | undefined;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** Controlled selected tab id. */
  value?: string | undefined;
  /** Initial tab when uncontrolled. Defaults to the first enabled tab. */
  defaultValue?: string | undefined;
  onChange?: ((id: string) => void) | undefined;
  /** Accessible name for the tab list (e.g. "Sections"). */
  'aria-label': string;
  /** Keep inactive panels mounted (hidden) to preserve their state. */
  keepMounted?: boolean | undefined;
  className?: string | undefined;
}

/**
 * WAI-ARIA tabs with automatic activation: Arrow Left/Right move and select,
 * Home/End jump to the first/last tab, disabled tabs are skipped. Only the
 * selected tab is in the tab order (roving tabindex).
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  'aria-label': ariaLabel,
  keepMounted = false,
  className,
}: TabsProps) {
  useInjectedStyles(STYLE_ID, TABS_CSS);

  const baseId = useId();
  const firstEnabled = items.find(i => !i.disabled)?.id;
  const [internal, setInternal] = useState<string | undefined>(defaultValue ?? firstEnabled);
  const isControlled = value !== undefined;
  const requested = isControlled ? value : internal;
  // Fall back to the first enabled tab when the selection is unknown or disabled.
  const selected = items.some(i => i.id === requested && !i.disabled) ? requested : firstEnabled;

  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  function select(id: string) {
    if (!isControlled) setInternal(id);
    if (id !== selected) onChange?.(id);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter(i => !i.disabled);
    if (enabled.length === 0) return;
    const current = enabled.findIndex(i => i.id === selected);
    let next: number;
    switch (e.key) {
      case 'ArrowRight': next = (current + 1) % enabled.length; break;
      case 'ArrowLeft': next = (current - 1 + enabled.length) % enabled.length; break;
      case 'Home': next = 0; break;
      case 'End': next = enabled.length - 1; break;
      default: return;
    }
    e.preventDefault();
    const target = enabled[next];
    if (!target) return;
    select(target.id);
    tabRefs.current.get(target.id)?.focus();
  }

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  return (
    <div className={['zeep-tabs', className].filter(Boolean).join(' ')}>
      <div role="tablist" aria-label={ariaLabel} className="zeep-tabs-list" onKeyDown={handleKeyDown}>
        {items.map(item => {
          const isSelected = item.id === selected;
          return (
            <button
              key={item.id}
              ref={el => {
                if (el) tabRefs.current.set(item.id, el);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={isSelected}
              aria-controls={panelId(item.id)}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              className="zeep-tabs-tab"
              onClick={() => { select(item.id); }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map(item => {
        const isSelected = item.id === selected;
        if (!isSelected && !keepMounted) return null;
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={panelId(item.id)}
            aria-labelledby={tabId(item.id)}
            hidden={!isSelected}
            tabIndex={0}
            className="zeep-tabs-panel"
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
