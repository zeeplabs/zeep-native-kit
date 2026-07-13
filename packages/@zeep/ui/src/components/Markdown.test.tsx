import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer, SearchHighlight } from './Markdown.tsx';

describe('MarkdownRenderer', () => {
  it('renders parsed markdown as sanitized HTML', () => {
    render(<MarkdownRenderer content="**bold text**" />);
    const strong = screen.getByText('bold text');
    expect(strong.tagName).toBe('STRONG');
  });

  it('strips script tags (XSS-safe)', () => {
    const { container } = render(<MarkdownRenderer content={'<script>alert(1)</script>hello'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('hello');
  });
});

describe('SearchHighlight', () => {
  it('wraps the matching query in a highlight element', () => {
    render(<SearchHighlight text="Hello Zeep world" query="Zeep" />);
    const mark = screen.getByText('Zeep');
    expect(mark.tagName).toBe('MARK');
  });
});
