export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'merging'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface DownloadRow {
  id: string;
  url: string;
  filename: string;
  displayName: string;
  status: DownloadStatus;
  totalSize: number | null;
  downloaded: number;
  parts: number;
  speedBps: number;
  error: string | null;
  path: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface PartRow {
  id: string;
  downloadId: string;
  index: number;
  start: number;
  end: number;
  downloaded: number;
  status: string;
  path: string | null;
}
