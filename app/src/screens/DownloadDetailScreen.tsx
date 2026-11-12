import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { useDownloads } from '../services/DownloadContext';
import { formatBytes, formatSpeed, statusLabel } from '../services/urlUtils';
import { colors, space, type, radius } from '../theme/tokens';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

export function DownloadDetailScreen({ route, navigation }: Props) {
  const { getById, pause, resume, cancel, remove } = useDownloads();
  const item = getById(route.params.id);

  if (!item) {
    return (
      <View style={styles.root}>
        <Text style={styles.meta}>Transfer not found</Text>
      </View>
    );
  }

  const pct =
    item.totalSize && item.totalSize > 0
      ? Math.min(100, Math.round((item.downloaded / item.totalSize) * 100))
      : item.status === 'completed'
        ? 100
        : 0;

  const onShare = async () => {
    if (item.status === 'completed' && item.path) {
      try {
        await Sharing.shareAsync(item.path);
      } catch (e: any) {
        Alert.alert('Share failed', e?.message || 'Unknown error');
      }
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title} numberOfLines={2}>
        {item.displayName || item.filename}
      </Text>
      <Text style={styles.meta}>{statusLabel(item.status)}</Text>
      <Text style={styles.meta}>
        {formatBytes(item.downloaded)}
        {item.totalSize ? ` / ${formatBytes(item.totalSize)}` : ''}
        {item.speedBps ? ` · ${formatSpeed(item.speedBps)}` : ''}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={styles.pct}>{pct}%</Text>

      <View style={styles.actions}>
        {(item.status === 'downloading' || item.status === 'queued') && (
          <Pressable style={styles.btn} onPress={() => pause(item.id)}>
            <Text style={styles.btnText}>Pause</Text>
          </Pressable>
        )}
        {(item.status === 'paused' || item.status === 'error') && (
          <Pressable style={styles.btn} onPress={() => resume(item.id)}>
            <Text style={styles.btnText}>Resume</Text>
          </Pressable>
        )}
        {item.status === 'completed' && item.path && (
          <Pressable style={styles.btn} onPress={onShare}>
            <Text style={styles.btnText}>Share</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.btn, styles.danger]}
          onPress={() => {
            cancel(item.id);
            remove(item.id).then(() => navigation.goBack());
          }}
        >
          <Text style={styles.btnText}>Remove</Text>
        </Pressable>
      </View>

      {item.errorMessage ? (
        <Text style={styles.error}>{item.errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: space[5], gap: space[3] },
  title: { color: colors.text, fontSize: type.lg.fontSize, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: type.sm.fontSize },
  track: {
    height: 8,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginTop: space[2],
  },
  fill: { height: 8, backgroundColor: colors.accent },
  pct: { color: colors.textSubtle, fontSize: type.xs.fontSize },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginTop: space[4] },
  btn: {
    backgroundColor: colors.accent,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
  },
  danger: { backgroundColor: colors.danger },
  btnText: { color: colors.onAccent, fontWeight: '700' },
  error: { color: colors.danger, marginTop: space[3] },
});
