import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogViewer } from './LogViewer.tsx';

function mockLogEvents(entries: Array<{ level: string; message: string; target: string }>) {
  return {
    entries: entries.map((e, i) => ({
      timestamp: `2026-07-16T10:00:0${i}Z`,
      level: e.level,
      target: e.target,
      message: e.message,
    })),
    clear: () => {},
  };
}

describe('LogViewer', () => {
  it('renders log entries', () => {
    const events = mockLogEvents([
      { level: 'INFO', message: 'app started', target: 'app' },
      { level: 'ERROR', message: 'connection failed', target: 'network' },
    ]);
    render(<LogViewer logEvents={events} />);

    expect(screen.getByText('app started')).toBeInTheDocument();
    expect(screen.getByText('connection failed')).toBeInTheDocument();
    expect(screen.getByText(/Logs \(2\)/)).toBeInTheDocument();
  });

  it('shows empty state when no entries match', () => {
    const events = mockLogEvents([]);
    render(<LogViewer logEvents={events} />);

    expect(screen.getByText(/No log entries match/)).toBeInTheDocument();
  });

  it('filters entries by text', async () => {
    const events = mockLogEvents([
      { level: 'INFO', message: 'app ready', target: 'app' },
      { level: 'WARN', message: 'disk low', target: 'system' },
    ]);
    render(<LogViewer logEvents={events} />);

    const input = screen.getByPlaceholderText('Filter...');
    expect(input).toBeInTheDocument();
  });
});
