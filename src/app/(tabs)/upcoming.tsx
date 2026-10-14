import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native';

import { openTitle } from '@/components/PosterCard';
import { EmptyState, Header, Muted, Poster, Screen, formatDate, relativeDay } from '@/components/ui';
import { getMeta } from '@/lib/tmdb';
import { useTheme } from '@/lib/theme';
import type { TrackedItem } from '@/lib/types';
import { useLibrary } from '@/store/library';

const STALE_MS = 12 * 60 * 60 * 1000;

interface Entry {
  item: TrackedItem;
  date: string;
  label: string;
}

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const daysUntil = (date: string) => {
  const t = new Date(`${date}T00:00:00`).getTime();
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.round((t - n.getTime()) / 86_400_000);
};

export default function UpcomingScreen() {
  const { c } = useTheme();
  const items = useLibrary((s) => s.items);
  const refreshMeta = useLibrary((s) => s.refreshMeta);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async (force: boolean) => {
      const now = Date.now();
      const targets = Object.values(useLibrary.getState().items).filter((i) => {
        if (i.type !== 'tv') return false;
        if (i.status === 'dropped') return false;
        const done = i.tvStatus === 'Ended' || i.tvStatus === 'Canceled';
        if (done) return false;
        return force || now - i.checkedAt > STALE_MS;
      });
      await Promise.allSettled(
        targets.map(async (i) => {
          const meta = await getMeta('tv', i.id);
          refreshMeta(meta);
        }),
      );
    },
    [refreshMeta],
  );

  // Quietly refresh stale shows when the screen first opens.
  useEffect(() => {
    refresh(false);
  }, [refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh(true);
    setRefreshing(false);
  };

  const sections = useMemo(() => {
    const today = todayStr();
    const entries: Entry[] = [];
    for (const item of Object.values(items)) {
      if (item.status === 'dropped') continue;
      if (item.type === 'tv' && item.nextEpisode?.airDate && item.nextEpisode.airDate >= today) {
        const n = item.nextEpisode;
        entries.push({
          item,
          date: n.airDate!,
          label: `S${n.season} · E${n.episode}${n.name ? `  ${n.name}` : ''}`,
        });
      } else if (item.type === 'movie' && !item.watchedAt && item.releaseDate && item.releaseDate >= today) {
        entries.push({ item, date: item.releaseDate, label: 'Release' });
      }
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));

    const buckets: { title: string; data: Entry[] }[] = [
      { title: 'Today', data: [] },
      { title: 'This week', data: [] },
      { title: 'Later', data: [] },
    ];
    for (const e of entries) {
      const d = daysUntil(e.date);
      (d <= 0 ? buckets[0] : d <= 7 ? buckets[1] : buckets[2]).data.push(e);
    }
    return buckets.filter((b) => b.data.length > 0);
  }, [items]);

  const hasItems = Object.keys(items).length > 0;

  return (
    <Screen>
      <Header title="Upcoming" subtitle="New episodes and releases you track" />
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.item.key}
        stickySectionHeadersEnabled={false}
        contentContainerClassName="pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.muted} />}
        renderSectionHeader={({ section }) => (
          <Text className="px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            {section.title}
          </Text>
        )}
        renderItem={({ item: e }) => (
          <Pressable
            onPress={() => openTitle(e.item.type, e.item.id)}
            className="mx-4 mb-3 flex-row items-center rounded-2xl border border-paper-line bg-paper-card p-3 active:opacity-80 dark:border-ink-line dark:bg-ink-card">
            <Poster path={e.item.posterPath} width={48} />
            <View className="ml-3 flex-1">
              <Text numberOfLines={1} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {e.item.title}
              </Text>
              <Muted className="mt-0.5" >{e.label}</Muted>
            </View>
            <View className="ml-2 items-end">
              <Text className="text-sm font-semibold text-accent">{relativeDay(e.date)}</Text>
              <Muted className="text-xs">{formatDate(e.date)}</Muted>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nothing scheduled"
            body={
              hasItems
                ? 'No upcoming episodes or releases for the titles you track. Pull down to refresh.'
                : 'Track a show or an unreleased movie and its air dates will show up here.'
            }
          />
        }
      />
    </Screen>
  );
}
