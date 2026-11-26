import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from 'react';
import { DANGER, FOCUS_RING, useInjectedStyles } from '../internal/useInjectedStyles.ts';

const STYLE_ID = 'zeep-checkbox-styles';

const CHECKBOX_CSS = `
.zeep-checkbox { display: inline-flex; flex-direction: column; gap: 2px; font-family: inherit; }
.zeep-checkbox-row { display: inline-flex; align-items: flex-start; gap: var(--zeep-space-2); cursor: pointer; }
.zeep-checkbox-disabled .zeep-checkbox-row { cursor: not-allowed; opacity: 0.5; }
.zeep-checkbox-box { position: relative; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
.zeep-checkbox-input {
  appearance: none; -webkit-appearance: none; margin: 0;
  width: 18px; height: 18px; cursor: inherit;
  /* Stronger than --zeep-border (8% alpha): an unchecked box must stay visible (WCAG 1.4.11). */
  border: 1.5px solid color-mix(in srgb, var(--zeep-text) 40%, transparent);
  border-radius: var(--zeep-radius-sm);
  background: var(--zeep-surface);
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}
.zeep-checkbox-row:hover .zeep-checkbox-input:not(:disabled) { border-color: var(--zeep-accent); }
.zeep-checkbox-input:focus-visible { box-shadow: ${FOCUS_RING}; }
.zeep-checkbox-input:checked, .zeep-checkbox-input:indeterminate {
  background: var(--zeep-accent); border-color: var(--zeep-accent);
}
.zeep-checkbox-input[aria-invalid="true"] { border-color: ${DANGER}; }
.zeep-checkbox-mark {
  position: absolute; inset: 0; pointer-events: none; color: #fff;
  display: none; align-items: center; justify-content: center;
}
.zeep-checkbox-input:checked:not(:indeterminate) ~ .zeep-checkbox-check { display: flex; }
.zeep-checkbox-input:indeterminate ~ .zeep-checkbox-dash { display: flex; }
.zeep-checkbox-label { font-size: var(--zeep-font-sm); color: var(--zeep-text); line-height: 1.4; }
.zeep-checkbox-hint { font-size: var(--zeep-font-xs); color: var(--zeep-text-muted); padding-left: calc(18px + var(--zeep-space-2)); }
.zeep-checkbox-error { font-size: var(--zeep-font-xs); color: ${DANGER}; padding-left: calc(18px + var(--zeep-space-2)); }
`;

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  /**
   * Mixed state ("some children selected"). Sets the DOM `indeterminate`
   * property, which browsers expose to assistive tech as "mixed".
   * Takes precedence over `checked` for display; clicking still fires `onChange`
   * and the parent decides the next state.
   */
  indeterminate?: boolean | undefined;
  hint?: ReactNode | undefined;
  error?: ReactNode | undefined;
  wrapperClassName?: string | undefined;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    indeterminate = false,
    hint,
    error,
    wrapperClassName,
    className,
    id,
    disabled,
    'aria-describedby': describedByProp,
    ...rest
  },
  ref,
) {
  useInjectedStyles(STYLE_ID, CHECKBOX_CSS);

  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

  // `indeterminate` only exists as a DOM property, not an HTML attribute.
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const autoId = useId();
  const inputId = id ?? `zeep-checkbox-${autoId}`;
  const messageId = `${inputId}-message`;
  const hasError = error !== undefined && error !== null && error !== false;
  const message = hasError ? error : hint;
  const describedBy = [describedByProp, message ? messageId : undefined].filter(Boolean).join(' ') || undefined;

  const wrapperClasses = ['zeep-checkbox', disabled && 'zeep-checkbox-disabled', wrapperClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      <label className="zeep-checkbox-row" htmlFor={inputId}>
        <span className="zeep-checkbox-box">
          <input
            ref={innerRef}
            id={inputId}
            type="checkbox"
            className={['zeep-checkbox-input', className].filter(Boolean).join(' ')}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            {...rest}
          />
          <span className="zeep-checkbox-mark zeep-checkbox-check" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="zeep-checkbox-mark zeep-checkbox-dash" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        <span className="zeep-checkbox-label">{label}</span>
      </label>
      {message && (
        <span id={messageId} className={hasError ? 'zeep-checkbox-error' : 'zeep-checkbox-hint'}>
          {message}
        </span>
      )}
    </div>
  );
});
