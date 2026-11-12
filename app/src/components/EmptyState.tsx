import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, space, type, radius } from '../theme/tokens';

interface Props {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>⬇️</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    gap: space[2],
  },
  emoji: { fontSize: 40, marginBottom: space[2] },
  title: {
    color: colors.text,
    fontSize: type.lg.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: type.base.fontSize,
    textAlign: 'center',
    maxWidth: 280,
  },
  btn: {
    marginTop: space[4],
    backgroundColor: colors.accent,
    paddingHorizontal: space[5],
    paddingVertical: space[3],
    borderRadius: radius.md,
  },
  btnText: {
    color: colors.onAccent,
    fontSize: type.base.fontSize,
    fontWeight: '600',
  },
});
