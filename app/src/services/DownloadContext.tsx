import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Download, TabFilter } from '../types/download';
import * as db from './db';
import * as engine from './DownloadEngine';
import * as notify from './notifications';
import { createId } from './id';
import { guessFilename, guessCategory } from './urlUtils';

interface Ctx {
  ready: boolean;
  downloads: Download[];
  filtered: Download[];
  filter: TabFilter;
  setFilter: (f: TabFilter) => void;
  counts: Record<TabFilter, number>;
  refresh: () => Promise<void>;
  addDownload: (url: string, name?: string) => Promise<string>;
  pause: (id: string) => void;
  resume: (id: string) => void;
  cancel: (id: string) => void;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => Download | undefined;
}

const DownloadContext = createContext<Ctx | null>(null);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [filter, setFilter] = useState<TabFilter>('all');

  const refresh = useCallback(async () => {
    const list = await db.listDownloads();
    setDownloads(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await db.getDb();
      if (cancelled) return;
      await refresh();
      setReady(true);
      const list = await db.listDownloads();
      for (const d of list) {
        if (d.status === 'downloading' || d.status === 'queued' || d.status === 'merging') {
          engine.startDownload(d.id);
        }
      }
      notify.ensureNotificationSetup().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    return engine.onEngineEvent((ev) => {
      setDownloads((prev) => {
        const idx = prev.findIndex((x) => x.id === ev.id);
        if (idx < 0) return prev;
        const next = [...prev];
        const cur = { ...next[idx] };
        if (ev.type === 'progress') {
          cur.downloaded = ev.downloaded;
          cur.totalSize = ev.total;
          cur.speedBps = ev.speedBps;
          cur.status = 'downloading';
        } else if (ev.type === 'status') {
          cur.status = ev.status as any;
          if (ev.error) cur.errorMessage = ev.error;
        } else if (ev.type === 'done') {
          cur.status = 'completed';
          cur.path = ev.path;
          cur.speedBps = 0;
          cur.finishedAt = new Date().toISOString();
        }
        next[idx] = cur;
        return next;
      });
    });
  }, []);

  const addDownload = useCallback(
    async (url: string, name?: string) => {
      const trimmed = url.trim();
      if (!trimmed) throw new Error('URL required');
      if (trimmed.startsWith('magnet:')) {
        throw new Error('Magnet links aren’t supported yet');
      }
      const filename = name || guessFilename(trimmed);
      const now = new Date().toISOString();
      const row: Download = {
        id: createId(),
        url: trimmed,
        filename,
        displayName: filename,
        category: guessCategory(filename),
        totalSize: null,
        downloaded: 0,
        status: 'queued',
        parts: 8,
        retryCount: 0,
        isHidden: false,
        wifiOnly: false,
        createdAt: now,
        updatedAt: now,
      };
      await db.insertDownload(row);
      await refresh();
      engine.enqueueDownload(row.id);
      return row.id;
    },
    [refresh]
  );

  const pause = useCallback((id: string) => {
    engine.pauseDownload(id);
  }, []);

  const resume = useCallback((id: string) => {
    engine.startDownload(id);
  }, []);

  const cancel = useCallback((id: string) => {
    engine.cancelDownload(id);
  }, []);

  const remove = useCallback(
    async (id: string) => {
      engine.cancelDownload(id);
      await db.deleteDownload(id);
      await refresh();
    },
    [refresh]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case 'downloading':
        return downloads.filter((d) =>
          ['downloading', 'queued', 'merging', 'paused'].includes(d.status)
        );
      case 'finished':
        return downloads.filter((d) => d.status === 'completed');
      case 'error':
        return downloads.filter((d) => d.status === 'error' || d.status === 'cancelled');
      default:
        return downloads;
    }
  }, [downloads, filter]);

  const counts = useMemo(
    () => ({
      all: downloads.length,
      downloading: downloads.filter((d) =>
        ['downloading', 'queued', 'merging', 'paused'].includes(d.status)
      ).length,
      finished: downloads.filter((d) => d.status === 'completed').length,
      error: downloads.filter((d) => d.status === 'error' || d.status === 'cancelled').length,
    }),
    [downloads]
  );

  const getById = useCallback(
    (id: string) => downloads.find((d) => d.id === id),
    [downloads]
  );

  const value: Ctx = {
    ready,
    downloads,
    filtered,
    filter,
    setFilter,
    counts,
    refresh,
    addDownload,
    pause,
    resume,
    cancel,
    remove,
    getById,
  };

  return (
    <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownloads outside provider');
  return ctx;
}
