import type { ReactNode } from 'react';
import {
  DANGER,
  FOCUS_RING,
  VISUALLY_HIDDEN_CSS,
  useInjectedStyles,
} from '../internal/useInjectedStyles.ts';

const STYLE_ID = 'zeep-stepper-styles';

const STEPPER_CSS = `
.zeep-stepper { list-style: none; margin: 0; padding: 0; display: flex; font-family: inherit; }
.zeep-stepper[data-orientation="horizontal"] { flex-direction: row; align-items: flex-start; gap: var(--zeep-space-2); }
.zeep-stepper[data-orientation="vertical"] { flex-direction: column; align-items: stretch; }
.zeep-stepper-item { display: flex; min-width: 0; }
.zeep-stepper[data-orientation="horizontal"] .zeep-stepper-item { flex: 1 1 0; align-items: center; gap: var(--zeep-space-2); }
.zeep-stepper[data-orientation="horizontal"] .zeep-stepper-item:last-child { flex: 0 0 auto; }
.zeep-stepper[data-orientation="vertical"] .zeep-stepper-item { flex-direction: column; }
.zeep-stepper-step {
  display: inline-flex; align-items: flex-start; gap: var(--zeep-space-3); min-width: 0;
  background: none; border: none; padding: 0; margin: 0; font: inherit; color: inherit; text-align: left;
  border-radius: var(--zeep-radius-sm); outline: none;
}
button.zeep-stepper-step { cursor: pointer; }
button.zeep-stepper-step:focus-visible { box-shadow: ${FOCUS_RING}; }
button.zeep-stepper-step:hover .zeep-stepper-indicator { border-color: var(--zeep-accent); }
.zeep-stepper-indicator {
  box-sizing: border-box; width: 28px; height: 28px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--zeep-radius-full); font-size: var(--zeep-font-xs); font-weight: 600;
  background: var(--zeep-surface); color: var(--zeep-text-muted);
  /* Stronger than --zeep-border (8% alpha): a pending step must stay visible (WCAG 1.4.11). */
  border: 1.5px solid color-mix(in srgb, var(--zeep-text) 40%, transparent);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.zeep-stepper-item[data-status="current"] .zeep-stepper-indicator { border: 2px solid var(--zeep-accent); color: var(--zeep-text); }
.zeep-stepper-item[data-status="complete"] .zeep-stepper-indicator { background: var(--zeep-accent); border-color: var(--zeep-accent); color: #fff; }
.zeep-stepper-item[data-status="error"] .zeep-stepper-indicator { border: 2px solid ${DANGER}; color: ${DANGER}; }
.zeep-stepper-text { display: flex; flex-direction: column; min-width: 0; padding-top: 4px; }
.zeep-stepper-label { font-size: var(--zeep-font-sm); font-weight: 500; line-height: 1.3; color: var(--zeep-text-muted); }
.zeep-stepper-item[data-status="current"] .zeep-stepper-label,
.zeep-stepper-item[data-status="complete"] .zeep-stepper-label,
.zeep-stepper-item[data-status="error"] .zeep-stepper-label { color: var(--zeep-text); }
.zeep-stepper-description { font-size: var(--zeep-font-xs); line-height: 1.4; color: var(--zeep-text-muted); }
.zeep-stepper-item[data-status="error"] .zeep-stepper-description { color: ${DANGER}; }
.zeep-stepper-line { flex: 1 1 auto; background: color-mix(in srgb, var(--zeep-text) 20%, transparent); border-radius: 2px; }
.zeep-stepper-item[data-status="complete"] .zeep-stepper-line { background: var(--zeep-accent); }
.zeep-stepper[data-orientation="horizontal"] .zeep-stepper-line { height: 2px; min-width: var(--zeep-space-4); }
/* 13px = half the 28px indicator (minus half the line) so the line hangs under its center. */
.zeep-stepper[data-orientation="vertical"] .zeep-stepper-line { width: 2px; height: var(--zeep-space-4); margin: var(--zeep-space-1) 0 var(--zeep-space-1) 13px; flex: 0 0 auto; }
.zeep-stepper-sr { ${VISUALLY_HIDDEN_CSS} }
`;

export type StepStatus = 'pending' | 'current' | 'complete' | 'error';

export interface StepItem {
  id: string;
  label: ReactNode;
  description?: ReactNode | undefined;
  /**
   * Overrides the status derived from `current`. Mainly for `'error'` (a step
   * that failed validation); the other values are normally derived.
   */
  status?: StepStatus | undefined;
}

export interface StepperProps {
  steps: readonly StepItem[];
  /**
   * Zero-based index of the current step. Earlier steps are `complete`, later
   * ones `pending`. Out of range is clamped: below 0 every step is pending,
   * at or past the end every step is complete.
   */
  current: number;
  orientation?: 'horizontal' | 'vertical' | undefined;
  /**
   * Makes every step that is not `pending` a button, so users can go back. Pending
   * steps are never clickable: skipping ahead is the caller's decision, not the kit's.
   */
  onStepClick?: ((index: number) => void) | undefined;
  /** Accessible name for the list (e.g. "Onboarding progress"). */
  'aria-label': string;
  /** Screen-reader text for each status. Override to localize. */
  statusLabels?: Partial<Record<StepStatus, string>> | undefined;
  className?: string | undefined;
}

const DEFAULT_STATUS_LABELS: Record<StepStatus, string> = {
  pending: 'Pending',
  current: 'Current step',
  complete: 'Completed',
  error: 'Error',
};

function resolveStatus(step: StepItem, index: number, current: number): StepStatus {
  if (step.status) return step.status;
  if (index < current) return 'complete';
  if (index === current) return 'current';
  return 'pending';
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 7.5l2.5 2.5L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
      <path d="M7 3v5M7 10.6v.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Progress through a multi-step flow (wizard). Renders an ordered list; the
 * current step has `aria-current="step"` and every step exposes its status to
 * screen readers as text (color is never the only signal).
 */
export function Stepper({
  steps,
  current,
  orientation = 'horizontal',
  onStepClick,
  'aria-label': ariaLabel,
  statusLabels,
  className,
}: StepperProps) {
  useInjectedStyles(STYLE_ID, STEPPER_CSS);

  const labels = { ...DEFAULT_STATUS_LABELS, ...statusLabels };

  return (
    <ol
      className={['zeep-stepper', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      data-orientation={orientation}
    >
      {steps.map((step, index) => {
        const status = resolveStatus(step, index, current);
        const isLast = index === steps.length - 1;
        const clickable = onStepClick !== undefined && status !== 'pending';

        const content = (
          <>
            <span className="zeep-stepper-indicator" aria-hidden="true">
              {status === 'complete' ? <CheckIcon /> : status === 'error' ? <ErrorIcon /> : index + 1}
            </span>
            <span className="zeep-stepper-text">
              <span className="zeep-stepper-label">
                {step.label}
                <span className="zeep-stepper-sr"> ({labels[status]})</span>
              </span>
              {step.description !== undefined && (
                <span className="zeep-stepper-description">{step.description}</span>
              )}
            </span>
          </>
        );

        return (
          <li
            key={step.id}
            className="zeep-stepper-item"
            data-status={status}
            aria-current={index === current ? 'step' : undefined}
          >
            {clickable ? (
              <button
                type="button"
                className="zeep-stepper-step"
                onClick={() => { onStepClick(index); }}
              >
                {content}
              </button>
            ) : (
              <div className="zeep-stepper-step">{content}</div>
            )}
            {!isLast && <span className="zeep-stepper-line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
