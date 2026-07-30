import { useCallback, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface DetectedProvider {
  name: string;
  binary: string;
  version: string | null;
}

export type AIStatus = 'idle' | 'detecting' | 'running' | 'done' | 'error';

export interface UseAIReturn {
  providers: DetectedProvider[];
  status: AIStatus;
  output: string;
  error: string | null;
  detect: () => Promise<void>;
  run: (provider: string, prompt: string) => Promise<void>;
  cancel: () => Promise<void>;
}

export function useAI(): UseAIReturn {
  const [providers, setProviders] = useState<DetectedProvider[]>([]);
  const [status, setStatus] = useState<AIStatus>('idle');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const currentRunId = useRef<number | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  const detect = useCallback(async () => {
    setStatus('detecting');
    try {
      const result = await invoke<DetectedProvider[]>('plugin:zeep-ai|ai_detect_providers');
      setProviders(result);
      setStatus('idle');
    } catch (err) {
      setError(String(err));
      setStatus('error');
    }
  }, []);

  const run = useCallback(async (provider: string, prompt: string) => {
    setOutput('');
    setError(null);
    setStatus('running');

    try {
      const unlisten = await listen<{ runId: number; text: string }>('ai:chunk', (event) => {
        setOutput(prev => prev + event.payload.text + '\n');
      });
      unlistenRef.current = unlisten;

      void listen<{ runId: number }>('ai:done', () => {
        setStatus('done');
      });

      const runId = await invoke<number>('plugin:zeep-ai|ai_run_stream', {
        provider,
        prompt,
      });
      currentRunId.current = runId;
    } catch (err) {
      setError(String(err));
      setStatus('error');
    }
  }, []);

  const cancel = useCallback(async () => {
    if (currentRunId.current !== null) {
      try {
        await invoke('plugin:zeep-ai|ai_cancel', { runId: currentRunId.current });
      } catch (err) {
        setError(String(err));
      }
    }
  }, []);

  return { providers, status, output, error, detect, run, cancel };
}
