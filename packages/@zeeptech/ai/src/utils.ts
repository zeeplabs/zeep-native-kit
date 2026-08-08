export function stripFences(text: string): string {
  return text.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
}

export function firstLine(text: string): string {
  return text.split('\n').find(l => l.trim().length > 0) ?? '';
}

export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const trimmed = text.slice(0, maxChars);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + '…';
}

export function extractJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/{[\s\S]*?}/);
  if (!match) throw new Error('no JSON found');
  return JSON.parse(match[1] ?? match[0]);
}
