export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'merging'
  | 'cancelled';

export type Category =
  | 'videos'
  | 'music'
  | 'documents'
  | 'compressed'
  | 'photos'
  | 'programs'
  | 'subtitles'
  | 'torrents'
  | 'others';

export interface DownloadPart {
  id: string;
  downloadId: string;
  partIndex: number;
  startByte: number;
  endByte: number;
  downloaded: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

export interface Download {
  id: string;
  url: string;
  originalUrl?: string;
  filename: string;
  displayName?: string;
  mimeType?: string;
  category: Category;
  totalSize: number | null;
  downloaded: number;
  status: DownloadStatus;
  parts: number;
  errorMessage?: string;
  retryCount: number;
  path?: string;
  isHidden: boolean;
  wifiOnly: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  speedBps?: number;
  etaSeconds?: number;
}

export type TabFilter = 'all' | 'downloading' | 'finished' | 'error';

// Alias used by some UI modules
export type DownloadRow = Download;
