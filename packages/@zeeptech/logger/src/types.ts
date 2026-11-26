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
  // Neutral: follows the theme text color so it stays readable on both surfaces
  // (a fixed gray is ~2.9:1 on the light surface).
  Trace: 'var(--zeep-text, #999)',
  Debug: 'var(--zeep-info, #3b82f6)',
  Info: 'var(--zeep-success, #22c55e)',
  Warn: 'var(--zeep-warning, #eab308)',
  Error: 'var(--zeep-danger, #ef4444)',
};

export function parseLevel(s: string): LogLevel | undefined {
  const lower = s.toLowerCase();
  return LOG_LEVELS.find(l => l.toLowerCase() === lower);
}
