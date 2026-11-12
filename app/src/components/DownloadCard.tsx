import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DownloadRow } from '../types/download';
import { colors, radius, space, type } from '../theme/tokens';
import { formatBytes, formatSpeed, statusLabel } from '../services/urlUtils';

interface Props {
  item: DownloadRow;
  onPress: () => void;
}

function categoryEmoji(cat?: string): string {
  switch (cat) {
    case 'videos': return '🎬';
    case 'music': return '🎵';
    case 'documents': return '📄';
    case 'compressed': return '📦';
    case 'photos': return '🖼';
    case 'programs': return '📱';
    case 'torrents': return '🧲';
    default: return '📁';
  }
}

export function DownloadCard({ item, onPress }: Props) {
  const pct =
    item.totalSize && item.totalSize > 0
      ? Math.min(100, Math.round((item.downloaded / item.totalSize) * 100))
      : item.status === 'completed'
        ? 100
        : 0;

  const meta: string[] = [];
  if (item.status === 'downloading' || item.status === 'paused') {
    meta.push(`${pct}%`);
    meta.push(formatBytes(item.downloaded) + (item.totalSize ? ` / ${formatBytes(item.totalSize)}` : ''));
    if (item.speedBps) meta.push(formatSpeed(item.speedBps));
  } else if (item.status === 'completed') {
    meta.push(formatBytes(item.totalSize ?? item.downloaded));
    meta.push(statusLabel(item.status));
  } else {
    meta.push(statusLabel(item.status));
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.displayName || item.filename}, ${statusLabel(item.status)}`}
    >
      <Text style={styles.icon}>{categoryEmoji((item as any).category)}</Text>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.displayName || item.filename}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta.join(' · ')}
        </Text>
        {(item.status === 'downloading' || item.status === 'paused' || item.status === 'queued') && (
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${pct}%` as any,
                  backgroundColor: item.status === 'paused' ? colors.textSubtle : colors.accent,
                },
              ]}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surface2 },
  icon: { fontSize: 22, width: 36, textAlign: 'center', marginRight: space[3] },
  body: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: type.base.fontSize, fontWeight: '500' },
  meta: { color: colors.textMuted, fontSize: type.sm.fontSize },
  track: {
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    marginTop: space[1],
    overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: radius.sm },
});
