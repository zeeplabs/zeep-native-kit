import { describe, expect, it } from 'vitest';
import { stripFences, firstLine, truncate, extractJson } from './utils.ts';

describe('stripFences', () => {
  it('removes leading and trailing code fences', () => {
    expect(stripFences('```ts\nconst x = 1;\n```')).toBe('const x = 1;');
  });

  it('returns trimmed text when no fences exist', () => {
    expect(stripFences('  hello  ')).toBe('hello');
  });
});

describe('firstLine', () => {
  it('returns the first non-empty line', () => {
    expect(firstLine('\n\nhello world\nfoo')).toBe('hello world');
  });

  it('returns empty string when no non-empty lines exist', () => {
    expect(firstLine('   \n\n  ')).toBe('');
  });
});

describe('truncate', () => {
  it('returns text unchanged when under maxChars', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('truncates at word boundary and appends ellipsis', () => {
    const result = truncate('hello world foo bar', 12);
    expect(result).toBe('hello world…');
  });
});

describe('extractJson', () => {
  it('extracts JSON from a code block', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('extracts bare JSON object', () => {
    expect(extractJson('some text {"b":2} more')).toEqual({ b: 2 });
  });

  it('throws when no JSON is found', () => {
    expect(() => extractJson('no json here')).toThrow('no JSON found');
  });
});
