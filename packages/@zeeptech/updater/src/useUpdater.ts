import { useCallback, useRef, useState } from 'react';
import { Channel, invoke } from '@tauri-apps/api/core';
import type { UpdateMetadata, UpdaterState } from './types';

export interface UseUpdaterReturn {
  state: UpdaterState;
  check: () => Promise<void>;
  install: () => Promise<void>;
  restart: () => Promise<void>;
  dismiss: () => void;
  reset: () => void;
}

function initialState(): UpdaterState {
  return {
    status: 'idle',
    updateInfo: null,
    error: null,
    contentLength: null,
    downloaded: 0,
    dismissed: false,
  };
}

export function useUpdater(): UseUpdaterReturn {
  const [state, setState] = useState<UpdaterState>(initialState);
  const checkRef = useRef(false);

  const check = useCallback(async () => {
    if (checkRef.current) return;
    checkRef.current = true;

    setState(prev => ({ ...prev, status: 'checking', error: null }));

    try {
      const result = await invoke<UpdateMetadata | null>('plugin:updater|check');

      if (result) {
        setState(prev => ({
          ...prev,
          status: 'available',
          updateInfo: result,
          dismissed: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'idle',
          updateInfo: null,
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: String(err),
      }));
    } finally {
      checkRef.current = false;
    }
  }, []);

  const install = useCallback(async () => {
    const rid = state.updateInfo?.rid;
    if (!rid) return;

    setState(prev => ({
      ...prev,
      status: 'downloading',
      downloaded: 0,
      contentLength: null,
    }));

    try {
      const channel = new Channel<{
        event: string;
        data?: { contentLength?: number; chunkLength?: number };
      }>();

      channel.onmessage = (msg) => {
        switch (msg.event) {
          case 'Started':
            setState(prev => ({
              ...prev,
              contentLength: msg.data?.contentLength ?? null,
            }));
            break;
          case 'Progress':
            setState(prev => ({
              ...prev,
              downloaded: prev.downloaded + (msg.data?.chunkLength ?? 0),
            }));
            break;
          case 'Finished':
            setState(prev => ({ ...prev, status: 'ready' }));
            break;
        }
      };

      await invoke('plugin:updater|download_and_install', {
        rid,
        onEvent: channel,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: String(err),
      }));
    }
  }, [state.updateInfo?.rid]);

  const restart = useCallback(async () => {
    await invoke('plugin:updater|install', {});
  }, []);

  const dismiss = useCallback(() => {
    setState(prev => ({ ...prev, dismissed: true }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState());
  }, []);

  return { state, check, install, restart, dismiss, reset };
}
