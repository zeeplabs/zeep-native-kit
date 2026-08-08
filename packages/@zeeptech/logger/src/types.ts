export interface LogEntry {
  timestamp: string;
  level: string;
  target: string;
  message: string;
}

export type LogLevel = 'Trace' | 'Debug' | 'Info' | 'Warn' | 'Error';

export const LOG_LEVELS: LogLevel[] = ['Trace', 'Debug', 'Info', 'Warn', 'Error'];

export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  Trace: 1,
  Debug: 2,
  Info: 3,
  Warn: 4,
  Error: 5,
};

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  Trace: '#999',
  Debug: '#3b82f6',
  Info: '#22c55e',
  Warn: '#eab308',
  Error: '#ef4444',
};

export function parseLevel(s: string): LogLevel | undefined {
  const lower = s.toLowerCase();
  return LOG_LEVELS.find(l => l.toLowerCase() === lower);
}
