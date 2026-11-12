import { Category } from '../types/download';

export function guessFilename(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'download';
    return decodeURIComponent(last.split('?')[0]) || 'download.bin';
  } catch {
    return 'download.bin';
  }
}

export function guessCategory(filename: string): Category {
  const lower = filename.toLowerCase();
  if (/\.(mp4|mkv|avi|mov|webm|m3u8|ts)$/.test(lower)) return 'videos';
  if (/\.(mp3|m4a|flac|wav|aac|ogg)$/.test(lower)) return 'music';
  if (/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx)$/.test(lower)) return 'documents';
  if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return 'compressed';
  if (/\.(jpg|jpeg|png|gif|webp|heic)$/.test(lower)) return 'photos';
  if (/\.(apk|exe|dmg|msi)$/.test(lower)) return 'programs';
  if (/\.(srt|vtt|ass)$/.test(lower)) return 'subtitles';
  if (/\.torrent$/.test(lower) || lower.startsWith('magnet:')) return 'torrents';
  return 'others';
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatSpeed(bps?: number): string {
  if (!bps || bps <= 0) return '';
  return `${formatBytes(bps)}/s`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'downloading':
      return 'Downloading';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Done';
    case 'error':
      return 'Couldn’t finish';
    case 'merging':
      return 'Merging parts…';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}
