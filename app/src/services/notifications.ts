/** Local stubs — native notifications removed to unblock Android Gradle build. */

export async function ensureNotificationSetup(): Promise<void> {
  return;
}

export async function showOngoingProgress(_opts: {
  activeCount: number;
  filename?: string;
  percent?: number;
}): Promise<void> {
  return;
}

export async function clearOngoing(): Promise<void> {
  return;
}

export async function notifyCompleted(_filename: string): Promise<void> {
  return;
}
