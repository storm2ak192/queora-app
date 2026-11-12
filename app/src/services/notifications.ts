import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'queora-downloads';
const ONGOING_ID = 'queora-ongoing';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let ready = false;

export async function ensureNotificationSetup(): Promise<void> {
  if (ready) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Downloads',
      importance: Notifications.AndroidImportance.LOW,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
  ready = true;
}

export async function showOngoingProgress(opts: {
  activeCount: number;
  filename?: string;
  percent?: number;
}): Promise<void> {
  await ensureNotificationSetup();
  const title =
    opts.activeCount <= 0
      ? 'Queora'
      : opts.activeCount === 1
        ? 'Downloading'
        : `Downloading ${opts.activeCount} files`;
  const body =
    opts.activeCount <= 0
      ? 'All transfers finished'
      : opts.filename
        ? `${opts.filename}${opts.percent != null ? ` · ${opts.percent}%` : ''}`
        : 'Transfer in progress';

  await Notifications.scheduleNotificationAsync({
    identifier: ONGOING_ID,
    content: {
      title,
      body,
      sticky: opts.activeCount > 0,
      autoDismiss: opts.activeCount <= 0,
      ...(Platform.OS === 'android'
        ? {
            channelId: CHANNEL_ID,
            priority: Notifications.AndroidNotificationPriority.LOW,
          }
        : {}),
    },
    trigger: null,
  });
}

export async function clearOngoing(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(ONGOING_ID);
  } catch {
    /* ignore */
  }
}

export async function notifyCompleted(filename: string): Promise<void> {
  await ensureNotificationSetup();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Download done',
      body: filename,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}
