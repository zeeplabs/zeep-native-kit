import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

const STYLE_ID = 'zeep-ai-prompt-input-styles';

const CSS = `
.zeep-ai-prompt-input-wrapper {
  display: flex;
  gap: var(--zeep-space-2, 8px);
  align-items: flex-end;
}
.zeep-ai-prompt-textarea {
  flex: 1;
  resize: none;
  padding: var(--zeep-space-3, 12px);
  border: 1px solid var(--zeep-border, #333);
  border-radius: var(--zeep-radius-md, 6px);
  background: var(--zeep-surface, #1a1a1e);
  color: var(--zeep-text, #e4e4e7);
  font-family: inherit;
  font-size: var(--zeep-font-md, 14px);
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s ease;
  min-height: 48px;
  max-height: 200px;
}
.zeep-ai-prompt-textarea:focus {
  border-color: var(--zeep-accent, #8b5cf6);
}
.zeep-ai-prompt-textarea::placeholder {
  color: var(--zeep-text-muted, #888);
}
.zeep-ai-prompt-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.zeep-ai-prompt-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--zeep-space-2, 8px) var(--zeep-space-4, 16px);
  border: none;
  border-radius: var(--zeep-radius-md, 6px);
  background: linear-gradient(135deg, var(--zeep-accent, #8b5cf6), var(--zeep-accent-dark, #7c3aed));
  color: #fff;
  font-family: inherit;
  font-size: var(--zeep-font-sm, 13px);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
  white-space: nowrap;
  height: 48px;
}
.zeep-ai-prompt-send:hover:not(:disabled) {
  opacity: 0.9;
}
.zeep-ai-prompt-send:active:not(:disabled) {
  transform: scale(0.98);
}
.zeep-ai-prompt-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;

export interface AIPromptInputProps {
  onSend: (prompt: string) => void;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
}

export function AIPromptInput({ onSend, disabled = false, placeholder = 'Ask AI…' }: AIPromptInputProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="zeep-ai-prompt-input-wrapper">
      <textarea
        ref={textareaRef}
        className="zeep-ai-prompt-textarea"
        value={value}
        onChange={(e) => { setValue(e.target.value); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
      />
      <button
        className="zeep-ai-prompt-send"
        onClick={handleSend}
        disabled={disabled || value.trim().length === 0}
        type="button"
      >
        Send
      </button>
    </div>
  );
}
