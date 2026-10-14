import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, TextInput, View } from 'react-native';

import { LibraryCard, usePosterGrid } from '@/components/PosterCard';
import { Button, Chip, EmptyState, Header, Screen } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { STATUS_LABEL, STATUSES, type MediaType, type Status } from '@/lib/types';
import { useLibrary } from '@/store/library';

type StatusFilter = 'all' | Status;
type TypeFilter = 'all' | MediaType;

export default function LibraryScreen() {
  const { c } = useTheme();
  const items = useLibrary((s) => s.items);
  const hydrated = useLibrary((s) => s.hydrated);
  const grid = usePosterGrid();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');

  const all = useMemo(
    () => Object.values(items).sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (i) =>
        (status === 'all' || i.status === status) &&
        (type === 'all' || i.type === type) &&
        (q === '' || i.title.toLowerCase().includes(q)),
    );
  }, [all, status, type, query]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: all.length };
    for (const i of all) m[i.status] = (m[i.status] ?? 0) + 1;
    return m;
  }, [all]);

  return (
    <Screen>
      <Header title="Library" subtitle={`${all.length} ${all.length === 1 ? 'title' : 'titles'}`} />

      {all.length > 0 ? (
        <View>
          <View className="px-4 pb-3">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Filter your library"
              placeholderTextColor={c.muted}
              autoCorrect={false}
              clearButtonMode="while-editing"
              className="rounded-xl border border-paper-line bg-paper-card px-4 py-2.5 text-base text-zinc-900 dark:border-ink-line dark:bg-ink-card dark:text-zinc-50"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 pb-2">
            <Chip label={`All ${counts.all ?? 0}`} active={status === 'all'} onPress={() => setStatus('all')} />
            {STATUSES.map((s) => (
              <Chip
                key={s}
                label={`${STATUS_LABEL[s]} ${counts[s] ?? 0}`}
                active={status === s}
                onPress={() => setStatus(s)}
              />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 pb-3">
            <Chip label="Everything" active={type === 'all'} onPress={() => setType('all')} />
            <Chip label="Shows" active={type === 'tv'} onPress={() => setType('tv')} />
            <Chip label="Movies" active={type === 'movie'} onPress={() => setType('movie')} />
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        key={grid.cols}
        data={filtered}
        keyExtractor={(i) => i.key}
        numColumns={grid.cols}
        columnWrapperStyle={grid.columnStyle}
        renderItem={({ item }) => <LibraryCard item={item} width={grid.cardWidth} />}
        contentContainerStyle={grid.contentStyle}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !hydrated ? null : all.length === 0 ? (
            <EmptyState
              icon="film-outline"
              title="Nothing tracked yet"
              body="Search for a movie or show and add it to start tracking."
              action={<Button label="Find something to watch" icon="search" onPress={() => router.navigate('/search')} />}
            />
          ) : (
            <EmptyState icon="funnel-outline" title="No matches" body="Try a different filter." />
          )
        }
      />
    </Screen>
  );
}
