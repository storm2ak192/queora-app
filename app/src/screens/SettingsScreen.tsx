import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, space, type, radius } from '../theme/tokens';
import * as settings from '../services/settings';

export function SettingsScreen() {
  const [dirLabel, setDirLabel] = useState('App storage (default)');
  const [wifiOnly, setWifiOnly] = useState(false);
  const [parts, setParts] = useState(8);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setDirLabel(await settings.getDownloadDirLabel());
    setWifiOnly(await settings.getWifiOnlyDefault());
    setParts(await settings.getDefaultParts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onPickFolder = async () => {
    setBusy(true);
    try {
      const res = await settings.pickDownloadFolder();
      if (res) {
        setDirLabel(res.name);
      }
    } catch (e: any) {
      Alert.alert('Could not open folder picker', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const onResetFolder = async () => {
    await settings.clearDownloadFolder();
    setDirLabel('App storage (default)');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Storage</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Download folder</Text>
        <Text style={styles.value}>{dirLabel}</Text>
        <View style={styles.row}>
          <Pressable
            onPress={onPickFolder}
            disabled={busy}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{busy ? 'Opening…' : 'Choose folder'}</Text>
          </Pressable>
          <Pressable onPress={onResetFolder} style={styles.linkBtn}>
            <Text style={styles.linkText}>Use app storage</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          On Android this uses the system folder picker (SAF). No SD card is required.
        </Text>
      </View>

      <Text style={styles.section}>Transfers</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Wi‑Fi only by default</Text>
            <Text style={styles.hint}>New downloads prefer Wi‑Fi when this is on.</Text>
          </View>
          <Switch
            value={wifiOnly}
            onValueChange={async (v) => {
              setWifiOnly(v);
              await settings.setWifiOnlyDefault(v);
            }}
            trackColor={{ true: colors.accentMuted, false: colors.surface2 }}
            thumbColor={wifiOnly ? colors.accent : colors.textMuted}
          />
        </View>

        <Text style={[styles.label, { marginTop: space[4] }]}>Default connections</Text>
        <View style={styles.partsRow}>
          {[4, 8, 12, 16].map((n) => (
            <Pressable
              key={n}
              onPress={async () => {
                setParts(n);
                await settings.setDefaultParts(n);
              }}
              style={[styles.chip, parts === n && styles.chipOn]}
            >
              <Text style={[styles.chipText, parts === n && styles.chipTextOn]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <Text style={styles.value}>Queora</Text>
        <Text style={styles.hint}>
          Free download manager. Transfers stay on your device. Background survival uses an
          ongoing notification; some OEMs still need unrestricted battery for long jobs.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space[5], gap: space[2], paddingBottom: space[8] },
  section: {
    color: colors.textMuted,
    fontSize: type.sm.fontSize,
    fontWeight: '600',
    marginTop: space[4],
    marginBottom: space[2],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space[4],
    gap: space[2],
  },
  label: { color: colors.text, fontSize: type.base.fontSize, fontWeight: '600' },
  value: { color: colors.textMuted, fontSize: type.sm.fontSize },
  hint: { color: colors.textSubtle, fontSize: type.xs.fontSize, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[2] },
  btn: {
    backgroundColor: colors.accent,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
  },
  btnText: { color: colors.onAccent, fontWeight: '700' },
  linkBtn: { padding: space[2] },
  linkText: { color: colors.accent, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  partsRow: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  chip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  chipOn: { backgroundColor: colors.accentMuted },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextOn: { color: colors.accent },
});
