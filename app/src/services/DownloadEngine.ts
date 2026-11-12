/**
 * Multi-part download engine (clean-room) for Queora.
 */
import * as FileSystem from 'expo-file-system';
import {
  getDownload,
  updateDownload,
  insertParts,
  listParts,
  updatePart,
  planParts,
} from './db';
import * as appSettings from './settings';
import * as notify from './notifications';

const MAX_ACTIVE_DOWNLOADS = 3;
const waitQueue: string[] = [];
const activeIds = new Set<string>();

export function enqueueDownload(id: string) {
  if (activeIds.has(id) || waitQueue.includes(id)) return;
  waitQueue.push(id);
  pumpQueue();
}

/** Alias used by DownloadContext */
export function startDownload(id: string) {
  enqueueDownload(id);
}

function pumpQueue() {
  while (activeIds.size < MAX_ACTIVE_DOWNLOADS && waitQueue.length > 0) {
    const next = waitQueue.shift()!;
    activeIds.add(next);
    runDownload(next)
      .catch(() => {})
      .finally(() => {
        activeIds.delete(next);
        pumpQueue();
      });
  }
}

export function getQueueSnapshot() {
  return { active: [...activeIds], waiting: [...waitQueue] };
}

export type EngineEvent =
  | { type: 'progress'; id: string; downloaded: number; total: number | null; speedBps: number }
  | { type: 'status'; id: string; status: string; error?: string }
  | { type: 'done'; id: string; path: string };

type Listener = (e: EngineEvent) => void;
const listeners = new Set<Listener>();
const abortControllers = new Map<string, AbortController>();

export function onEngineEvent(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(e: EngineEvent) {
  listeners.forEach((fn) => {
    try {
      fn(e);
    } catch {
      /* ignore */
    }
  });
}

async function ensureDir(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function ensureLocalDownloadDir(): Promise<string> {
  const root = FileSystem.documentDirectory;
  if (!root) throw new Error('No writable document directory');
  const dir = root + 'downloads/';
  await ensureDir(dir);
  return dir;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // @ts-ignore
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64');
}

async function probe(url: string, signal?: AbortSignal) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal });
    if (!res.ok) throw new Error(`HEAD ${res.status}`);
    const len = res.headers.get('content-length');
    const ar = res.headers.get('accept-ranges');
    return {
      size: len ? parseInt(len, 10) : null,
      acceptsRanges: ar === 'bytes',
    };
  } catch {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal,
      });
      const cr = res.headers.get('content-range');
      const size = cr?.includes('/') ? parseInt(cr.split('/')[1], 10) : null;
      return {
        size: Number.isFinite(size as number) ? size : null,
        acceptsRanges: res.status === 206 || !!cr,
      };
    } catch {
      return { size: null, acceptsRanges: false };
    }
  }
}

async function downloadPart(
  url: string,
  partId: string,
  start: number,
  end: number,
  dest: string,
  signal: AbortSignal,
  onBytes: (n: number) => void
) {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
    signal,
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Part failed: HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  const b64 = arrayBufferToBase64(buf);
  await FileSystem.writeAsStringAsync(dest, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  onBytes(buf.byteLength);
  await updatePart(partId, { downloaded: end - start + 1, status: 'completed' });
}

async function maybeCopyToSaf(localPath: string, filename: string) {
  try {
    const safDir = await appSettings.getDownloadDirUri();
    if (!safDir) return;
    const SAF = (FileSystem as any).StorageAccessFramework;
    if (!SAF?.createFileAsync) return;
    const lower = filename.toLowerCase();
    let mime = 'application/octet-stream';
    if (lower.endsWith('.mp')) mime = 'video/mp4';
    else if (lower.endsWith('.pdf')) mime = 'application/pdf';
    else if (lower.endsWith('.zip')) mime = 'application/zip';
    else if (lower.endsWith('.mp3')) mime = 'audio/mpeg';
    const target = await SAF.createFileAsync(safDir, filename, mime);
    const b64 = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(target, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    /* non-fatal */
  }
}

async function runDownload(id: string) {
  const d = await getDownload(id);
  if (!d) return;
  if (d.status === 'completed' || d.status === 'cancelled') return;

  const controller = new AbortController();
  abortControllers.set(id, controller);

  try {
    emit({ type: 'status', id, status: 'downloading' });
    await updateDownload(id, { status: 'downloading', startedAt: new Date().toISOString() });

    const dir = await ensureLocalDownloadDir();
    const partDir = `${dir}${id}/`;
    await ensureDir(partDir);

    const info = await probe(d.url, controller.signal);
    const totalSize = info.size;
    const partCount = d.parts || (await appSettings.getDefaultParts());

    if (totalSize && info.acceptsRanges && partCount > 1) {
      await updateDownload(id, { totalSize, parts: partCount });
      let parts = await listParts(id);
      if (!parts.length) {
        parts = planParts(id, totalSize, partCount);
        await insertParts(parts);
      }

      let downloaded = parts.reduce((s, p) => s + (p.downloaded || 0), 0);
      let lastAt = Date.now();
      let lastBytes = downloaded;

      const pending = parts.filter((p) => p.status !== 'completed');
      for (const p of pending) {
        if (controller.signal.aborted) throw new Error('Cancelled');
        const dest = `${partDir}part_${p.partIndex}.bin`;
        await updatePart(p.id, { status: 'downloading' });
        await downloadPart(
          d.url,
          p.id,
          p.startByte,
          p.endByte,
          dest,
          controller.signal,
          (n) => {
            downloaded += n;
            const now = Date.now();
            const dt = (now - lastAt) / 1000;
            const speed = dt > 0 ? (downloaded - lastBytes) / dt : 0;
            if (now - lastAt > 300) {
              lastAt = now;
              lastBytes = downloaded;
              emit({ type: 'progress', id, downloaded, total: totalSize, speedBps: speed });
              updateDownload(id, { downloaded }).catch(() => {});
            }
          }
        );
      }

      emit({ type: 'status', id, status: 'merging' });
      await updateDownload(id, { status: 'merging', downloaded: totalSize });

      const ordered = (await listParts(id)).sort((a, b) => a.partIndex - b.partIndex);
      const chunks: Uint8Array[] = [];
      let totalLen = 
      for (const p of ordered) {
        const dest = `${partDir}part_${p.partIndex}.bin`;
        const b64 = await FileSystem.readAsStringAsync(dest, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // @ts-ignore
        const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        chunks.push(bytes);
        totalLen += bytes.length;
      }
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      const mergedB64 = arrayBufferToBase64(merged.buffer);
      const finalPath = `${dir}${d.filename}`;
      await FileSystem.writeAsStringAsync(finalPath, mergedB64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await updateDownload(id, {
        status: 'completed',
        downloaded: totalSize,
        path: finalPath,
        finishedAt: new Date().toISOString(),
      });
      emit({ type: 'done', id, path: finalPath });
      emit({ type: 'status', id, status: 'completed' });
      notify.notifyCompleted(d.displayName || d.filename).catch(() => {});
      await maybeCopyToSaf(finalPath, d.filename);
    } else {
      const res = await fetch(d.url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const finalPath = `${dir}${d.filename}`;
      await FileSystem.writeAsStringAsync(finalPath, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await updateDownload(id, {
        status: 'completed',
        totalSize: buf.byteLength,
        downloaded: buf.byteLength,
        path: finalPath,
        finishedAt: new Date().toISOString(),
      });
      emit({ type: 'done', id, path: finalPath });
      emit({ type: 'status', id, status: 'completed' });
      notify.notifyCompleted(d.displayName || d.filename).catch(() => {});
      await maybeCopyToSaf(finalPath, d.filename);
    }
  } catch (e: any) {
    const msg = e?.message || 'Download failed';
    if (msg.includes('Abort') || msg.includes('Cancelled')) {
      await updateDownload(id, { status: 'cancelled' });
      emit({ type: 'status', id, status: 'cancelled' });
    } else {
      await updateDownload(id, { status: 'error', errorMessage: msg });
      emit({ type: 'status', id, status: 'error', error: msg });
    }
  } finally {
    abortControllers.delete(id);
  }
}

export function pauseDownload(id: string) {
  const c = abortControllers.get(id);
  if (c) c.abort();
  updateDownload(id, { status: 'paused' }).catch(() => {});
  emit({ type: 'status', id, status: 'paused' });
}

export function cancelDownload(id: string) {
  const c = abortControllers.get(id);
  if (c) c.abort();
  const qi = waitQueue.indexOf(id);
  if (qi >= 0) waitQueue.splice(qi, 1);
  updateDownload(id, { status: 'cancelled' }).catch(() => {});
  emit({ type: 'status', id, status: 'cancelled' });
}
