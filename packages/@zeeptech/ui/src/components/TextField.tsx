import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';
import { DANGER, FOCUS_RING, VISUALLY_HIDDEN_CSS, useInjectedStyles } from '../internal/useInjectedStyles.ts';

const STYLE_ID = 'zeep-textfield-styles';

const TEXTFIELD_CSS = `
.zeep-field { display: flex; flex-direction: column; gap: var(--zeep-space-1); font-family: inherit; }
.zeep-field-label { font-size: var(--zeep-font-sm); font-weight: 500; color: var(--zeep-text); }
.zeep-field-label-hidden { ${VISUALLY_HIDDEN_CSS} }
.zeep-field-required { color: ${DANGER}; margin-left: 2px; }
.zeep-field-control {
  display: flex; align-items: center; gap: var(--zeep-space-2);
  background: var(--zeep-surface); color: var(--zeep-text);
  border: 1px solid var(--zeep-border); border-radius: var(--zeep-radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.zeep-field-control:hover { border-color: var(--zeep-accent); }
.zeep-field-control:focus-within { border-color: var(--zeep-accent); box-shadow: ${FOCUS_RING}; }
.zeep-field-sm .zeep-field-control { padding: 0 var(--zeep-space-2); }
.zeep-field-md .zeep-field-control { padding: 0 var(--zeep-space-3); }
.zeep-field-input {
  flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  color: inherit; font: inherit; padding: var(--zeep-space-2) 0;
}
.zeep-field-sm .zeep-field-input { font-size: var(--zeep-font-sm); padding: var(--zeep-space-1) 0; }
.zeep-field-md .zeep-field-input { font-size: var(--zeep-font-md); }
.zeep-field-input::placeholder { color: var(--zeep-text-muted); }
.zeep-field-adornment { display: inline-flex; color: var(--zeep-text-muted); flex-shrink: 0; }
.zeep-field-hint { font-size: var(--zeep-font-xs); color: var(--zeep-text-muted); }
.zeep-field-error-text { font-size: var(--zeep-font-xs); color: ${DANGER}; }
.zeep-field-invalid .zeep-field-control { border-color: ${DANGER}; }
.zeep-field-disabled .zeep-field-control { opacity: 0.5; cursor: not-allowed; }
.zeep-field-disabled .zeep-field-control:hover { border-color: var(--zeep-border); }
.zeep-field-disabled .zeep-field-input { cursor: not-allowed; }
`;

export type TextFieldSize = 'sm' | 'md';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visible label. Always rendered for screen readers, even when `hideLabel`. */
  label: ReactNode;
  /** Keep the label for assistive tech but hide it visually (e.g. search filters). */
  hideLabel?: boolean | undefined;
  /** Helper text below the input. Replaced by `error` when both are set. */
  hint?: ReactNode | undefined;
  /** Error message. Sets `aria-invalid` and links the message via `aria-describedby`. */
  error?: ReactNode | undefined;
  size?: TextFieldSize | undefined;
  leftAdornment?: ReactNode | undefined;
  rightAdornment?: ReactNode | undefined;
  /** Class for the outer wrapper. `className` goes to the `<input>`. */
  wrapperClassName?: string | undefined;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    hideLabel = false,
    hint,
    error,
    size = 'md',
    leftAdornment,
    rightAdornment,
    wrapperClassName,
    className,
    id,
    disabled,
    required,
    type = 'text',
    'aria-describedby': describedByProp,
    ...rest
  },
  ref,
) {
  useInjectedStyles(STYLE_ID, TEXTFIELD_CSS);

  const autoId = useId();
  const inputId = id ?? `zeep-field-${autoId}`;
  const messageId = `${inputId}-message`;
  const hasError = error !== undefined && error !== null && error !== false;
  const message = hasError ? error : hint;
  const describedBy = [describedByProp, message ? messageId : undefined].filter(Boolean).join(' ') || undefined;

  const wrapperClasses = [
    'zeep-field',
    `zeep-field-${size}`,
    hasError && 'zeep-field-invalid',
    disabled && 'zeep-field-disabled',
    wrapperClassName,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      <label htmlFor={inputId} className={hideLabel ? 'zeep-field-label-hidden' : 'zeep-field-label'}>
        {label}
        {required && <span className="zeep-field-required" aria-hidden="true">*</span>}
      </label>
      <div className="zeep-field-control">
        {leftAdornment && <span className="zeep-field-adornment">{leftAdornment}</span>}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={['zeep-field-input', className].filter(Boolean).join(' ')}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {rightAdornment && <span className="zeep-field-adornment">{rightAdornment}</span>}
      </div>
      {message && (
        <span id={messageId} className={hasError ? 'zeep-field-error-text' : 'zeep-field-hint'}>
          {message}
        </span>
      )}
    </div>
  );
});
