/**
 * Local SQLite data layer (expo-sqlite).
 * Replaces the in-memory store from the vertical slice.
 * Schema mirrors replica/schema.sql.
 */

import * as SQLite from 'expo-sqlite';
import { Download, DownloadPart, DownloadStatus, Category } from '../types/download';
import { createId } from './id';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('queora.db');
  await migrate(db);
  return db;
}

async function migrate(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS downloads (
      id            TEXT PRIMARY KEY,
      url           TEXT NOT NULL,
      original_url  TEXT,
      filename      TEXT NOT NULL,
      display_name  TEXT,
      mime_type     TEXT,
      category      TEXT NOT NULL DEFAULT 'others',
      total_size    INTEGER,
      downloaded    INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'queued',
      parts         INTEGER NOT NULL DEFAULT 8,
      error_message TEXT,
      retry_count   INTEGER NOT NULL DEFAULT 0,
      path          TEXT,
      is_hidden     INTEGER NOT NULL DEFAULT 0,
      wifi_only     INTEGER NOT NULL DEFAULT 0,
      headers       TEXT,
      referrer      TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      started_at    TEXT,
      finished_at   TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
    CREATE INDEX IF NOT EXISTS idx_downloads_category ON downloads(category);
    CREATE INDEX IF NOT EXISTS idx_downloads_created ON downloads(created_at DESC);

    CREATE TABLE IF NOT EXISTS download_parts (
      id            TEXT PRIMARY KEY,
      download_id   TEXT NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
      part_index    INTEGER NOT NULL,
      start_byte    INTEGER NOT NULL,
      end_byte      INTEGER NOT NULL,
      downloaded    INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'pending',
      UNIQUE(download_id, part_index)
    );

    CREATE INDEX IF NOT EXISTS idx_parts_download ON download_parts(download_id);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function rowToDownload(row: any): Download {
  return {
    id: row.id,
    url: row.url,
    originalUrl: row.original_url ?? undefined,
    filename: row.filename,
    displayName: row.display_name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    category: row.category as Category,
    totalSize: row.total_size,
    downloaded: row.downloaded,
    status: row.status as DownloadStatus,
    parts: row.parts,
    errorMessage: row.error_message ?? undefined,
    retryCount: row.retry_count,
    path: row.path ?? undefined,
    isHidden: !!row.is_hidden,
    wifiOnly: !!row.wifi_only,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
  };
}

export async function listDownloads(): Promise<Download[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM downloads ORDER BY created_at DESC'
  );
  return rows.map(rowToDownload);
}

export async function getDownload(id: string): Promise<Download | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM downloads WHERE id = ?',
    [id]
  );
  return row ? rowToDownload(row) : null;
}

export async function insertDownload(d: Download): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO downloads (
      id, url, original_url, filename, display_name, mime_type, category,
      total_size, downloaded, status, parts, error_message, retry_count,
      path, is_hidden, wifi_only, headers, referrer,
      created_at, updated_at, started_at, finished_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      d.id,
      d.url,
      d.originalUrl ?? null,
      d.filename,
      d.displayName ?? null,
      d.mimeType ?? null,
      d.category,
      d.totalSize,
      d.downloaded,
      d.status,
      d.parts,
      d.errorMessage ?? null,
      d.retryCount,
      d.path ?? null,
      d.isHidden ? 1 : 0,
      d.wifiOnly ? 1 : 0,
      null,
      null,
      d.createdAt,
      d.updatedAt,
      d.startedAt ?? null,
      d.finishedAt ?? null,
    ]
  );
}

export async function updateDownload(
  id: string,
  patch: Partial<Download>
): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: any[] = [];

  const map: Record<string, string> = {
    url: 'url',
    originalUrl: 'original_url',
    filename: 'filename',
    displayName: 'display_name',
    mimeType: 'mime_type',
    category: 'category',
    totalSize: 'total_size',
    downloaded: 'downloaded',
    status: 'status',
    parts: 'parts',
    errorMessage: 'error_message',
    retryCount: 'retry_count',
    path: 'path',
    isHidden: 'is_hidden',
    wifiOnly: 'wifi_only',
    startedAt: 'started_at',
    finishedAt: 'finished_at',
  };

  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      fields.push(`${col} = ?`);
      let v = (patch as any)[k];
      if (k === 'isHidden' || k === 'wifiOnly') v = v ? 1 : 0;
      values.push(v ?? null);
    }
  }

  fields.push(`updated_at = ?`);
  values.push(new Date().toISOString());
  values.push(id);

  if (fields.length === 1) return;

  await database.runAsync(
    `UPDATE downloads SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteDownload(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM downloads WHERE id = ?', [id]);
}

export async function insertParts(parts: DownloadPart[]): Promise<void> {
  const database = await getDb();
  for (const p of p) {
    await database.runAsync(
      `INSERT OR REPLACE INTO download_parts
        (id, download_id, part_index, start_byte, end_byte, downloaded, status)
       VALUES (?,?,?,?,?,?,?)`,
      [p.id, p.downloadId, p.partIndex, p.startByte, p.endByte, p.downloaded, p.status]
    );
  }
}

export async function listParts(downloadId: string): Promise<DownloadPart[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM download_parts WHERE download_id = ? ORDER BY part_index',
    [downloadId]
  );
  return rows.map((r) => ({
    id: r.id,
    downloadId: r.download_id,
    partIndex: r.part_index,
    startByte: r.start_byte,
    endByte: r.end_byte,
    downloaded: r.downloaded,
    status: r.status,
  }));
}

export async function updatePart(
  id: string,
  patch: Partial<Pick<DownloadPart, 'downloaded' | 'status'>>
): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (patch.downloaded !== undefined) {
    fields.push('downloaded = ?');
    values.push(patch.downloaded);
  }
  if (patch.status !== undefined) {
    fields.push('status = ?');
    values.push(patch.status);
  }
  if (!fields.length) return;
  values.push(id);
  await database.runAsync(
    `UPDATE download_parts SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export function planParts(
  downloadId: string,
  totalSize: number,
  partCount: number
): DownloadPart[] {
  const size = Math.max(1, totalSize);
  const n = Math.max(1, Math.min(partCount, 16));
  const chunk = Math.floor(size / n);
  const parts: DownloadPart[] = [];
  for (let i = 0; i < n; i++) {
    const start = i * chunk;
    const end = i === n - 1 ? size - 1 : start + chunk - 1;
    parts.push({
      id: createId(),
      downloadId,
      partIndex: i,
      startByte: start,
      endByte: end,
      downloaded: 0,
      status: 'pending',
    });
  }
  return parts;
}
