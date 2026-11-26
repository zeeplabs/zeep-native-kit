import { type CSSProperties, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const STYLE_ID = 'zeep-markdown-styles';
const HLJS_STYLE_ID = 'zeep-hljs-styles';

const MARKDOWN_CSS = `
.zeep-md { color: var(--zeep-text); font-size: var(--zeep-font-md); line-height: 1.7; }
.zeep-md h1, .zeep-md h2, .zeep-md h3, .zeep-md h4, .zeep-md h5, .zeep-md h6 {
  color: var(--zeep-text); font-weight: 600;
  margin-top: var(--zeep-space-6); margin-bottom: var(--zeep-space-2);
}
.zeep-md h1 { font-size: var(--zeep-font-3xl); }
.zeep-md h2 { font-size: var(--zeep-font-2xl); }
.zeep-md h3 { font-size: var(--zeep-font-xl); }
.zeep-md h4 { font-size: var(--zeep-font-lg); }
.zeep-md p { margin-bottom: var(--zeep-space-4); }
.zeep-md code {
  background: var(--zeep-surface); border: 1px solid var(--zeep-border);
  border-radius: var(--zeep-radius-sm); padding: 1px 5px; font-size: 0.875em;
}
.zeep-md pre {
  background: var(--zeep-surface); border: 1px solid var(--zeep-border);
  border-radius: var(--zeep-radius-md); padding: var(--zeep-space-4);
  overflow-x: auto; margin-bottom: var(--zeep-space-4);
}
.zeep-md pre code { background: none; border: none; padding: 0; font-size: var(--zeep-font-sm); }
.zeep-md a { color: var(--zeep-accent); text-decoration: underline; }
.zeep-md a:hover { color: var(--zeep-accent-light); }
.zeep-md ul, .zeep-md ol { padding-left: var(--zeep-space-6); margin-bottom: var(--zeep-space-4); }
.zeep-md li { margin-bottom: var(--zeep-space-1); }
.zeep-md blockquote {
  border-left: 3px solid var(--zeep-accent); padding-left: var(--zeep-space-4);
  margin: var(--zeep-space-4) 0; color: var(--zeep-text-muted);
}
.zeep-md hr { border: none; border-top: 1px solid var(--zeep-border); margin: var(--zeep-space-6) 0; }
.zeep-md table { width: 100%; border-collapse: collapse; margin-bottom: var(--zeep-space-4); }
.zeep-md th, .zeep-md td { border: 1px solid var(--zeep-border); padding: var(--zeep-space-2) var(--zeep-space-3); text-align: left; }
.zeep-md th { background: var(--zeep-surface); font-weight: 600; }
.zeep-md mark { background: var(--zeep-accent-light); color: var(--zeep-bg); border-radius: 2px; padding: 0 2px; }
`;

const HLJS_CSS = `
.hljs { display: block; overflow-x: auto; background: transparent; color: var(--zeep-text); }
.hljs-comment, .hljs-quote { color: var(--zeep-text-muted); font-style: italic; }
.hljs-keyword, .hljs-selector-tag { color: var(--zeep-accent-light); font-weight: bold; }
.hljs-string, .hljs-doctag, .hljs-regexp { color: #86efac; }
.hljs-number, .hljs-literal { color: #fdba74; }
.hljs-title, .hljs-section, .hljs-selector-id { color: var(--zeep-accent); font-weight: bold; }
.hljs-type, .hljs-class .hljs-title { color: #fde68a; font-weight: bold; }
.hljs-built_in, .hljs-builtin-name { color: #7dd3fc; }
.hljs-attr, .hljs-attribute { color: var(--zeep-accent-light); }
.hljs-symbol, .hljs-bullet { color: #c4b5fd; }
.hljs-meta { color: var(--zeep-text-muted); }
.hljs-deletion { background: color-mix(in srgb, var(--zeep-danger, #ef4444) 20%, transparent); }
.hljs-addition { background: rgba(34,197,94,0.2); }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
`;

function applySearchHighlight(html: string, query: string): string {
  if (!query.trim()) return html;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return html.replace(/>([^<]+)</g, (_, text: string) =>
    '>' + text.replace(regex, '<mark>$1</mark>') + '<'
  );
}

async function highlightCodeBlocks(container: HTMLElement): Promise<void> {
  const blocks = container.querySelectorAll('pre code');
  if (!blocks.length) return;
  try {
    const { default: hljs } = await import('highlight.js');
    if (!document.getElementById(HLJS_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = HLJS_STYLE_ID;
      style.textContent = HLJS_CSS;
      document.head.appendChild(style);
    }
    blocks.forEach(el => { hljs.highlightElement(el as HTMLElement); });
  } catch {
    // highlight.js unavailable — skip
  }
}

export interface MarkdownRendererProps {
  content: string;
  searchQuery?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export function MarkdownRenderer({ content, searchQuery, className, style }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = MARKDOWN_CSS;
    document.head.appendChild(el);
  }, []);

  const raw = marked.parse(content, { async: false });
  const sanitized = DOMPurify.sanitize(raw as string, { USE_PROFILES: { html: true } });
  const highlighted = searchQuery ? applySearchHighlight(sanitized, searchQuery) : sanitized;

  useEffect(() => {
    if (containerRef.current) {
      void highlightCodeBlocks(containerRef.current);
    }
  }, [highlighted]);

  return (
    <div
      ref={containerRef}
      className={`zeep-md${className ? ` ${className}` : ''}`}
      style={style}
      // sanitized by DOMPurify
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export interface SearchHighlightProps {
  text: string;
  query: string;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export function SearchHighlight({ text, query, className, style }: SearchHighlightProps) {
  if (!query.trim()) {
    return <span className={className} style={style}>{text}</span>;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <span className={className} style={style}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? (
            <mark
              key={i}
              style={{
                background: 'var(--zeep-accent-light)',
                color: 'inherit',
                borderRadius: 2,
                padding: '0 2px',
              }}
            >
              {part}
            </mark>
          )
          : part
      )}
    </span>
  );
}
