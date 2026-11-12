import React from 'react';
import { View, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDownloads } from '../services/DownloadContext';
import { DownloadCard } from '../components/DownloadCard';
import { TabStrip } from '../components/TabStrip';
import { EmptyState } from '../components/EmptyState';
import { colors, space, radius } from '../theme/tokens';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'List'>;

export function DownloadListScreen({ navigation }: Props) {
  const { filtered, filter, setFilter, counts } = useDownloads();

  return (
    <View style={styles.root}>
      <TabStrip value={filter} counts={counts} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'Nothing here yet' : 'Nothing here'}
          body={
            filter === 'all'
              ? 'Add a link to start your first transfer.'
              : 'Try another filter or add a new download.'
          }
          actionLabel="New download"
          onAction={() => navigation.navigate('Add')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DownloadCard item={item} onPress={() => navigation.navigate('Detail', { id: item.id })} />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
        onPress={() => navigation.navigate('Add')}
        accessibilityRole="button"
        accessibilityLabel="New download"
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    right: space[5],
    bottom: space[6],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: {
    color: colors.onAccent,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '400',
  },
});
