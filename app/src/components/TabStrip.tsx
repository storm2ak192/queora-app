import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { TabFilter } from '../types/download';
import { colors, space, type, radius } from '../theme/tokens';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'downloading', label: 'Active' },
  { key: 'finished', label: 'Done' },
  { key: 'error', label: 'Issues' },
];

interface Props {
  value: TabFilter;
  counts: Record<TabFilter, number>;
  onChange: (f: TabFilter) => void;
}

export function TabStrip({ value, counts, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
    >
      {TABS.map((t) => {
        const selected = value === t.key;
        const count = counts[t.key] ?? 0;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[styles.tab, selected && styles.tabSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {t.label}
              {count > 0 ? ` (${count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    paddingHorizontal: space[3],
    gap: space[2],
    alignItems: 'center',
    height: 48,
  },
  tab: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
  },
  tabSelected: {
    backgroundColor: colors.accentMuted,
  },
  label: {
    color: colors.textMuted,
    fontSize: type.sm.fontSize,
    fontWeight: '500',
  },
  labelSelected: {
    color: colors.accent,
  },
});
