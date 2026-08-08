export interface UpdateMetadata {
  rid: number;
  currentVersion: string;
  version: string;
  date: string | null;
  body: string | null;
  rawJson: unknown;
}

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdaterState {
  status: UpdaterStatus;
  updateInfo: UpdateMetadata | null;
  error: string | null;
  contentLength: number | null;
  downloaded: number;
  /** Hide the update banner for this session (dismiss). */
  dismissed: boolean;
}
