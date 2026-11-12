import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDownloads } from '../services/DownloadContext';
import { colors, space, type, radius } from '../theme/tokens';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Add'>;

export function AddDownloadScreen({ navigation }: Props) {
  const { addDownload } = useDownloads();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    try {
      await addDownload(url.trim(), name.trim() || undefined);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not start', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Link</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.label}>Name (optional)</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Leave empty to guess from URL"
          placeholderTextColor={colors.textSubtle}
        />
        <Pressable
          onPress={onSubmit}
          disabled={busy || !url.trim()}
          style={({ pressed }) => [
            styles.btn,
            (!url.trim() || busy) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.btnText}>{busy ? 'Starting…' : 'Start'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  form: { padding: space[5], gap: space[3] },
  label: { color: colors.textMuted, fontSize: type.sm.fontSize, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    color: colors.text,
    fontSize: type.base.fontSize,
  },
  btn: {
    marginTop: space[4],
    backgroundColor: colors.accent,
    paddingVertical: space[4],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { color: colors.onAccent, fontWeight: '700', fontSize: type.base.fontSize },
});
