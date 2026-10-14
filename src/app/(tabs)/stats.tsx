import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  Card,
  EmptyState,
  formatMinutes,
  Header,
  Muted,
  ProgressBar,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { STATUS_LABEL, STATUSES } from "@/lib/types";
import { minutesWatched, useLibrary, watchedCount } from "@/store/library";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-w-[44%] flex-1 p-4">
      <Text className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </Text>
      <Muted className="mt-1">{label}</Muted>
    </Card>
  );
}

export default function StatsScreen() {
  const items = useLibrary((s) => s.items);

  const stats = useMemo(() => {
    const list = Object.values(items);
    const movies = list.filter((i) => i.type === "movie");
    const shows = list.filter((i) => i.type === "tv");
    const moviesWatched = movies.filter((m) => m.watchedAt).length;
    const episodes = shows.reduce((sum, s) => sum + watchedCount(s), 0);
    const minutes = list.reduce((sum, i) => sum + minutesWatched(i), 0);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
      string,
      number
    >;
    for (const i of list) byStatus[i.status] += 1;

    const genreCount = new Map<string, number>();
    for (const i of list)
      for (const g of i.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    const genres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      total: list.length,
      shows: shows.length,
      movies: movies.length,
      moviesWatched,
      episodes,
      minutes,
      byStatus,
      genres,
    };
  }, [items]);

  if (stats.total === 0) {
    return (
      <Screen>
        <Header title="Stats" />
        <EmptyState
          icon="stats-chart-outline"
          title="No stats yet"
          body="Add and watch a few titles to see your numbers."
        />
      </Screen>
    );
  }

  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));
  const maxGenre = Math.max(1, ...stats.genres.map(([, n]) => n));

  return (
    <Screen>
      <Header
        title="Stats"
        subtitle={`${stats.shows} shows · ${stats.movies} movies`}
      />
      <ScrollView contentContainerClassName="pb-10">
        <View className="flex-row flex-wrap gap-3 px-4">
          <Stat label="Time watched" value={formatMinutes(stats.minutes)} />
          <Stat label="Episodes watched" value={String(stats.episodes)} />
          <Stat
            label="Movies watched"
            value={`${stats.moviesWatched}/${stats.movies}`}
          />
          <Stat label="Titles tracked" value={String(stats.total)} />
        </View>

        <SectionTitle>By status</SectionTitle>
        <Card className="mx-4 p-4">
          {STATUSES.map((s, idx) => (
            <View key={s} className={idx > 0 ? "mt-4" : ""}>
              <View className="mb-1.5 flex-row justify-between">
                <Text className="text-sm text-zinc-800 dark:text-zinc-200">
                  {STATUS_LABEL[s]}
                </Text>
                <Muted>{stats.byStatus[s]}</Muted>
              </View>
              <ProgressBar value={stats.byStatus[s] / maxStatus} />
            </View>
          ))}
        </Card>

        {stats.genres.length > 0 ? (
          <>
            <SectionTitle>Top genres</SectionTitle>
            <Card className="mx-4 p-4">
              {stats.genres.map(([name, n], idx) => (
                <View key={name} className={idx > 0 ? "mt-4" : ""}>
                  <View className="mb-1.5 flex-row justify-between">
                    <Text className="text-sm text-zinc-800 dark:text-zinc-200">
                      {name}
                    </Text>
                    <Muted>{n}</Muted>
                  </View>
                  <ProgressBar value={n / maxGenre} />
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
