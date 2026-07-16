import { useEffect, useRef, useState } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { LogEntry } from './types';

const LOG_EVENT = 'log://log';
const MAX_ENTRIES = 1000;

export interface UseLogEventsOptions {
  maxEntries?: number;
}

export interface UseLogEventsReturn {
  entries: LogEntry[];
  clear: () => void;
}

export function useLogEvents(opts?: UseLogEventsOptions): UseLogEventsReturn {
  const maxEntries = opts?.maxEntries ?? MAX_ENTRIES;
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    let cancelled = false;

    listen<LogEntry>(LOG_EVENT, (event) => {
      if (cancelled) return;
      setEntries(prev => {
        const next = [...prev, event.payload];
        return next.length > maxEntries ? next.slice(next.length - maxEntries) : next;
      });
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    });

    return () => {
      cancelled = true;
      unlistenRef.current?.();
    };
  }, [maxEntries]);

  return {
    entries,
    clear: () => setEntries([]),
  };
}
