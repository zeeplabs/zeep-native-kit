import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LOG_LEVELS, LOG_LEVEL_COLORS, parseLevel } from './types';
import type { LogEntry, LogLevel } from './types';
import type { UseLogEventsReturn } from './useLogEvents';

const STYLE_ID = 'zeep-logviewer-styles';

const CSS = `
.zeep-logviewer {
  font-family: ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid var(--zeep-border, #333);
  border-radius: var(--zeep-radius-md, 6px);
  overflow: hidden;
  background: var(--zeep-bg, #0d0d0f);
  color: var(--zeep-text, #e4e4e7);
}
.zeep-logviewer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--zeep-border, #333);
  background: var(--zeep-surface, #1a1a1e);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--zeep-text-muted, #888);
}
.zeep-logviewer-body {
  overflow-y: auto;
  max-height: 400px;
}
.zeep-logviewer-row {
  display: flex;
  gap: 8px;
  padding: 2px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  cursor: pointer;
  transition: background 0.1s;
}
.zeep-logviewer-row:hover {
  background: rgba(255,255,255,0.04);
}
.zeep-logviewer-row.selected {
  background: rgba(59,130,246,0.1);
}
.zeep-logviewer-time {
  flex-shrink: 0;
  width: 140px;
  color: var(--zeep-text-muted, #888);
  font-size: 11px;
}
.zeep-logviewer-level {
  flex-shrink: 0;
  width: 52px;
  font-weight: 600;
  font-size: 11px;
}
.zeep-logviewer-target {
  flex-shrink: 0;
  width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--zeep-text-muted, #888);
  font-size: 11px;
}
.zeep-logviewer-message {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}
.zeep-logviewer-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--zeep-border, #333);
  background: var(--zeep-surface, #1a1a1e);
}
.zeep-logviewer-filter {
  flex: 1;
  padding: 3px 6px;
  border: 1px solid var(--zeep-border, #333);
  border-radius: 4px;
  background: var(--zeep-bg, #0d0d0f);
  color: var(--zeep-text, #e4e4e7);
  font-size: 11px;
  font-family: inherit;
  outline: none;
}
.zeep-logviewer-filter:focus {
  border-color: var(--zeep-accent, #8b5cf6);
}
.zeep-logviewer-level-chip {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s;
  user-select: none;
}
.zeep-logviewer-level-chip.active {
  border-color: currentColor;
  opacity: 1;
}
.zeep-logviewer-level-chip.inactive {
  opacity: 0.3;
}
.zeep-logviewer-level-chip:hover {
  opacity: 0.8;
}
`;

export interface LogViewerProps {
  logEvents: UseLogEventsReturn;
  maxHeight?: string | number;
  style?: CSSProperties;
}

export function LogViewer({ logEvents, maxHeight = 400, style }: LogViewerProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  const [textFilter, setTextFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(
    new Set(LOG_LEVELS),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const filtered = useMemo(() => {
    return logEvents.entries.filter((entry) => {
      if (levelFilter.size > 0 && !levelFilter.has(parseLevel(entry.level) as LogLevel)) {
        return false;
      }
      if (textFilter) {
        const q = textFilter.toLowerCase();
        return (
          entry.message.toLowerCase().includes(q) ||
          entry.target.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logEvents.entries, textFilter, levelFilter]);

  const latestCountRef = useRef(filtered.length);
  useEffect(() => {
    if (isAutoScroll && bodyRef.current && filtered.length > latestCountRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
    latestCountRef.current = filtered.length;
  }, [filtered.length, isAutoScroll]);

  const handleScroll = useCallback(() => {
    if (!bodyRef.current) return;
    const el = bodyRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setIsAutoScroll(atBottom);
  }, []);

  const toggleLevel = useCallback((level: LogLevel) => {
    setLevelFilter(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size > 1) next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  const copyEntry = useCallback((entry: LogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2)).catch(() => {});
  }, []);

  const exportAll = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(filtered, null, 2)).catch(() => {});
  }, [filtered]);

  const levelChips: ReactNode[] = LOG_LEVELS.map((level) => {
    const active = levelFilter.has(level);
    return (
      <span
        key={level}
        className={`zeep-logviewer-level-chip ${active ? 'active' : 'inactive'}`}
        style={{ color: LOG_LEVEL_COLORS[level] }}
        onClick={() => { toggleLevel(level); }}
        role="checkbox"
        aria-checked={active}
      >
        {level.toUpperCase()}
      </span>
    );
  });

  const rows = filtered.map((entry, i) => {
    const level = parseLevel(entry.level) ?? 'Info';
    const color = LOG_LEVEL_COLORS[level];
    const isSelected = selected === i;

    return (
      <div
        key={`${entry.timestamp}-${i}`}
        className={`zeep-logviewer-row ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          setSelected(isSelected ? null : i);
          copyEntry(entry);
        }}
        title="Click to copy"
      >
        <span className="zeep-logviewer-time">{entry.timestamp}</span>
        <span className="zeep-logviewer-level" style={{ color }}>
          {entry.level}
        </span>
        <span className="zeep-logviewer-target">{entry.target}</span>
        <span className="zeep-logviewer-message">{entry.message}</span>
      </div>
    );
  });

  return (
    <div className="zeep-logviewer" style={style}>
      <div className="zeep-logviewer-header">
        <span>Logs ({filtered.length})</span>
        <button
          onClick={exportAll}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: '1px solid var(--zeep-border, #333)',
            borderRadius: 4,
            color: 'var(--zeep-text-muted, #888)',
            cursor: 'pointer',
            fontSize: 10,
            padding: '2px 6px',
          }}
          title="Copy all visible as JSON"
        >
          Export
        </button>
        <button
          onClick={() => { logEvents.clear(); }}
          style={{
            background: 'none',
            border: '1px solid var(--zeep-border, #333)',
            borderRadius: 4,
            color: 'var(--zeep-text-muted, #888)',
            cursor: 'pointer',
            fontSize: 10,
            padding: '2px 6px',
          }}
        >
          Clear
        </button>
      </div>

      <div className="zeep-logviewer-toolbar">
        <input
          type="text"
          className="zeep-logviewer-filter"
          placeholder="Filter..."
          value={textFilter}
          onChange={(e) => { setTextFilter(e.target.value); }}
        />
        {levelChips}
      </div>

      <div
        ref={bodyRef}
        className="zeep-logviewer-body"
        style={{ maxHeight }}
        onScroll={handleScroll}
      >
        {rows.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--zeep-text-muted, #666)' }}>
            No log entries match the current filters.
          </div>
        ) : rows}
      </div>
    </div>
  );
}
