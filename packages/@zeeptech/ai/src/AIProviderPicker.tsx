import { type ChangeEvent, useEffect } from 'react';
import type { DetectedProvider } from './useAI.ts';

const STYLE_ID = 'zeep-ai-provider-picker-styles';

const CSS = `
.zeep-ai-provider-picker {
  display: flex;
  flex-direction: column;
  gap: var(--zeep-space-1, 4px);
}
.zeep-ai-provider-picker-label {
  font-size: var(--zeep-font-xs, 11px);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--zeep-text-muted, #888);
}
.zeep-ai-provider-picker-select {
  padding: var(--zeep-space-2, 8px) var(--zeep-space-3, 12px);
  border: 1px solid var(--zeep-border, #333);
  border-radius: var(--zeep-radius-md, 6px);
  background: var(--zeep-surface, #1a1a1e);
  color: var(--zeep-text, #e4e4e7);
  font-family: inherit;
  font-size: var(--zeep-font-md, 14px);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.zeep-ai-provider-picker-select:focus {
  border-color: var(--zeep-accent, #8b5cf6);
}
.zeep-ai-provider-picker-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;

export interface AIProviderPickerProps {
  providers: DetectedProvider[];
  value: string;
  onChange: (name: string) => void;
}

export function AIProviderPicker({ providers, value, onChange }: AIProviderPickerProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="zeep-ai-provider-picker">
      <label className="zeep-ai-provider-picker-label" htmlFor="zeep-ai-provider-select">
        AI Provider
      </label>
      <select
        id="zeep-ai-provider-select"
        className="zeep-ai-provider-picker-select"
        value={value}
        onChange={handleChange}
        disabled={providers.length === 0}
      >
        {providers.length === 0 && (
          <option value="">No providers available</option>
        )}
        {providers.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}{p.version ? ` (${p.version})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
