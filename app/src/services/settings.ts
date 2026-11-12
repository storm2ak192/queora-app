import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as db from './db';

const KEY_DIR = 'download_dir_uri';
const KEY_DIR_NAME = 'download_dir_name';
const KEY_WIFI = 'wifi_only_default';
const KEY_PARTS = 'default_parts';

export async function getDownloadDirUri(): Promise<string | null> {
  return db.getSetting(KEY_DIR);
}

export async function getDownloadDirLabel(): Promise<string> {
  const name = await db.getSetting(KEY_DIR_NAME);
  if (name) return name;
  const uri = await getDownloadDirUri();
  if (uri) return 'Custom folder';
  return 'App storage (default)';
}

export async function pickDownloadFolder(): Promise<{ uri: string; name: string } | null> {
  if (Platform.OS === 'web') {
    throw new Error('Folder picker is not available on web');
  }
  const SAF = (FileSystem as any).StorageAccessFramework;
  if (!SAF?.requestDirectoryPermissionsAsync) {
    throw new Error('Storage Access Framework is not available on this build');
  }
  const res = await SAF.requestDirectoryPermissionsAsync();
  if (!res.granted || !res.directoryUri) {
    return null;
  }
  const uri: string = res.directoryUri;
  const name = decodeURIComponent(uri.split('/').pop() || 'Selected folder');
  await db.setSetting(KEY_DIR, uri);
  await db.setSetting(KEY_DIR_NAME, name);
  return { uri, name };
}

export async function clearDownloadFolder(): Promise<void> {
  await db.setSetting(KEY_DIR, '');
  await db.setSetting(KEY_DIR_NAME, '');
}

export async function getWifiOnlyDefault(): Promise<boolean> {
  const v = await db.getSetting(KEY_WIFI);
  return v === '1';
}

export async function setWifiOnlyDefault(on: boolean): Promise<void> {
  await db.setSetting(KEY_WIFI, on ? '1' : '0');
}

export async function getDefaultParts(): Promise<number> {
  const v = await db.getSetting(KEY_PARTS);
  const n = v ? parseInt(v, 10) : 8;
  return Number.isFinite(n) ? Math.min(16, Math.max(1, n)) : 8;
}

export async function setDefaultParts(n: number): Promise<void> {
  await db.setSetting(KEY_PARTS, String(Math.min(16, Math.max(1, n))));
}

export async function resolveDownloadPath(filename: string): Promise<{
  path: string;
  usingSaf: boolean;
  safDir?: string;
}> {
  const saf = await getDownloadDirUri();
  if (saf) {
    return { path: `${saf}/${filename}`, usingSaf: true, safDir: saf };
  }
  const root = FileSystem.documentDirectory;
  if (!root) throw new Error('No writable document directory');
  const dir = root + 'downloads/';
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return { path: dir + filename, usingSaf: false };
}
