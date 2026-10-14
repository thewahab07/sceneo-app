import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';

import { openTitle, PosterAction, PosterCard, usePosterGrid } from '@/components/PosterCard';
import { useAddToLibrary } from '@/components/useAddToLibrary';
import { EmptyState, Header, Screen } from '@/components/ui';
import { getTrending, searchMulti } from '@/lib/tmdb';
import { useTheme } from '@/lib/theme';
import { itemKey, type SearchResult } from '@/lib/types';
import { useLibrary } from '@/store/library';

export default function SearchScreen() {
  const { c } = useTheme();
  const grid = usePosterGrid();
  const items = useLibrary((s) => s.items);
  const { add, busyKey } = useAddToLibrary();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = setTimeout(
      async () => {
        try {
          const data = trimmed ? await searchMulti(trimmed) : await getTrending();
          if (!cancelled) setResults(data);
        } catch (e) {
          if (!cancelled) {
            setResults([]);
            setError(e instanceof Error ? e.message : 'Search failed.');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      trimmed ? 350 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return (
    <Screen>
      <Header title="Search" subtitle={trimmed ? undefined : 'Trending this week'} />
      <View className="px-4 pb-4">
        <View className="flex-row items-center rounded-2xl bg-paper-card px-4 dark:bg-ink-card">
          <Ionicons name="search" size={18} color={c.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Movies and shows"
            placeholderTextColor={c.muted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            className="ml-2 flex-1 py-3.5 text-base text-zinc-900 dark:text-zinc-50"
          />
          {loading ? <ActivityIndicator size="small" color={c.muted} /> : null}
          {query.length > 0 && !loading ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        key={grid.cols}
        data={results}
        keyExtractor={(r) => itemKey(r.type, r.id)}
        numColumns={grid.cols}
        columnWrapperStyle={grid.columnStyle}
        contentContainerStyle={grid.contentStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          loading ? null : error ? (
            <EmptyState icon="cloud-offline-outline" title="Something went wrong" body={error} />
          ) : trimmed ? (
            <EmptyState icon="search-outline" title="No results" body={`Nothing found for "${trimmed}".`} />
          ) : null
        }
        renderItem={({ item: r }) => {
          const key = itemKey(r.type, r.id);
          const tracked = !!items[key];
          const busy = busyKey === key;
          return (
            <PosterCard
              title={r.title}
              subtitle={`${r.type === 'tv' ? 'Show' : 'Movie'}${r.year ? ` · ${r.year}` : ''}`}
              posterPath={r.posterPath}
              width={grid.cardWidth}
              badge={r.voteAverage > 0 ? `★ ${r.voteAverage.toFixed(1)}` : null}
              onPress={() => openTitle(r.type, r.id)}
              action={
                <PosterAction
                  active={tracked}
                  icon={tracked ? 'checkmark' : 'add'}
                  label={tracked ? 'In library' : 'Add to library'}
                  onPress={tracked || busy ? undefined : () => add(r.type, r.id)}>
                  {busy ? <ActivityIndicator size="small" color="#ffffff" /> : undefined}
                </PosterAction>
              }
            />
          );
        }}
      />
    </Screen>
  );
}
