import { useEffect, useRef } from 'react';

const STYLE_ID = 'zeep-ai-response-stream-styles';

const CSS = `
.zeep-ai-response-stream {
  padding: var(--zeep-space-3, 12px);
  border: 1px solid var(--zeep-border, #333);
  border-radius: var(--zeep-radius-md, 6px);
  background: var(--zeep-surface, #1a1a1e);
  min-height: 60px;
  position: relative;
}
.zeep-ai-response-content {
  color: var(--zeep-text, #e4e4e7);
  font-size: var(--zeep-font-md, 14px);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.zeep-ai-response-empty {
  color: var(--zeep-text-muted, #888);
  font-size: var(--zeep-font-sm, 13px);
}
.zeep-ai-response-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--zeep-accent, #8b5cf6);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: zeep-ai-blink 0.8s step-end infinite;
}
@keyframes zeep-ai-blink {
  50% { opacity: 0; }
}
`;

export interface AIResponseStreamProps {
  text: string;
  isStreaming?: boolean | undefined;
}

export function AIResponseStream({ text, isStreaming = false }: AIResponseStreamProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  const autoScrollRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(text.length);

  useEffect(() => {
    if (isStreaming && text.length > prevLength.current && autoScrollRef.current) {
      autoScrollRef.current.scrollTop = autoScrollRef.current.scrollHeight;
    }
    prevLength.current = text.length;
  }, [text.length, isStreaming]);

  if (!text) {
    return (
      <div className="zeep-ai-response-stream" ref={autoScrollRef}>
        <span className="zeep-ai-response-empty">Waiting for response…</span>
      </div>
    );
  }

  return (
    <div className="zeep-ai-response-stream" ref={autoScrollRef} style={{ overflowY: 'auto', maxHeight: 400 }}>
      <div className="zeep-ai-response-content">
        {text}
        {isStreaming && <span className="zeep-ai-response-cursor" />}
      </div>
    </div>
  );
}
