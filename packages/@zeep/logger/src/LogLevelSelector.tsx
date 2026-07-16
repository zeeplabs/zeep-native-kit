import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LOG_LEVELS, LOG_LEVEL_VALUES, LOG_LEVEL_COLORS } from './types';
import type { LogLevel } from './types';

const PLUGIN = 'plugin:zeep-logger|';

export interface LogLevelSelectorProps {
  initialLevel?: LogLevel;
}

export function LogLevelSelector({ initialLevel = 'Debug' }: LogLevelSelectorProps) {
  const [current, setCurrent] = useState<LogLevel>(initialLevel);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    setCurrent(initialLevel);
  }, [initialLevel]);

  async function handleChange(level: LogLevel) {
    setChanging(true);
    setCurrent(level);
    try {
      await invoke(`${PLUGIN}logger_set_level`, { level: LOG_LEVEL_VALUES[level] });
    } catch (err) {
      console.error('zeep-logger: failed to set level', err);
    } finally {
      setChanging(false);
    }
  }

  const options = LOG_LEVELS.map((level) => (
    <button
      key={level}
      onClick={() => { handleChange(level); }}
      disabled={changing}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${current === level ? LOG_LEVEL_COLORS[level] : 'var(--zeep-border, #333)'}`,
        borderRadius: 4,
        background: current === level
          ? LOG_LEVEL_COLORS[level]
          : 'var(--zeep-surface, #1a1a1e)',
        color: current === level ? '#fff' : LOG_LEVEL_COLORS[level],
        cursor: 'pointer',
        opacity: changing ? 0.5 : 1,
        transition: 'all 0.1s',
      }}
    >
      {level}
    </button>
  ));

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <span
        style={{
          fontSize: 11,
          color: 'var(--zeep-text-muted, #888)',
          marginRight: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Level:
      </span>
      {options}
    </div>
  );
}
