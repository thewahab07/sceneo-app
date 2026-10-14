import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Button,
  Card,
  Chip,
  FadeToBg,
  IconButton,
  Muted,
  Poster,
  ProgressBar,
  Screen,
  SectionTitle,
  formatDate,
  formatMinutes,
} from '@/components/ui';
import { useAddToLibrary } from '@/components/useAddToLibrary';
import { getMeta, getSeasonEpisodes, IMG, type ItemMeta } from '@/lib/tmdb';
import { useTheme } from '@/lib/theme';
import {
  epKey,
  itemKey,
  STATUS_LABEL,
  STATUSES,
  type EpisodeInfo,
  type MediaType,
  type SeasonMeta,
  type TrackedItem,
} from '@/lib/types';
import {
  airedTotal,
  progressOf,
  seasonWatchedCount,
  useLibrary,
  watchedCount,
} from '@/store/library';

const STALE_MS = 12 * 60 * 60 * 1000;

export default function TitleScreen() {
  const params = useLocalSearchParams<{ type: string; id: string }>();
  const type: MediaType = params.type === 'movie' ? 'movie' : 'tv';
  const id = Number(params.id);
  const key = itemKey(type, id);

  const { c } = useTheme();
  const item = useLibrary((s) => s.items[key]);
  const refreshMeta = useLibrary((s) => s.refreshMeta);
  const removeItem = useLibrary((s) => s.removeItem);
  const setStatus = useLibrary((s) => s.setStatus);
  const setRating = useLibrary((s) => s.setRating);
  const setNotes = useLibrary((s) => s.setNotes);
  const toggleMovieWatched = useLibrary((s) => s.toggleMovieWatched);
  const setAllWatched = useLibrary((s) => s.setAllWatched);
  const { add, busyKey } = useAddToLibrary();

  const [remote, setRemote] = useState<ItemMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotesLocal] = useState(item?.notes ?? '');

  // Load metadata for titles that aren't in the library yet.
  useEffect(() => {
    if (item || remote) return;
    let cancelled = false;
    getMeta(type, id)
      .then((m) => !cancelled && setRemote(m))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load title.'));
    return () => {
      cancelled = true;
    };
  }, [item, remote, type, id]);

  // Quietly refresh tracked titles whose metadata is stale (also restores imported items).
  const needsRefresh = !!item && Date.now() - item.checkedAt > STALE_MS;
  useEffect(() => {
    if (!needsRefresh) return;
    getMeta(type, id)
      .then(refreshMeta)
      .catch(() => {});
  }, [needsRefresh, type, id, refreshMeta]);

  const data: (ItemMeta & Partial<TrackedItem>) | null = item ?? remote;

  if (!data) {
    return (
      <Screen>
        <View className="px-4 pt-3">
          <IconButton name="arrow-back" onPress={() => router.back()} label="Back" />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          {error ? <Muted className="text-center">{error}</Muted> : <ActivityIndicator color={c.muted} />}
        </View>
      </Screen>
    );
  }

  const backdrop = IMG.backdrop(data.backdropPath);
  const isTv = data.type === 'tv';
  const adding = busyKey === key;

  const confirmRemove = () =>
    Alert.alert('Remove from library?', `${data.title} and all its progress will be deleted from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeItem(key);
          router.back();
        },
      },
    ]);

  return (
    <Screen topInset={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-16">
          {/* Backdrop */}
          <View className="h-64 w-full bg-zinc-200 dark:bg-ink-card">
            {backdrop ? <Image source={{ uri: backdrop }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
            <FadeToBg height={140} />
            <View className="absolute left-4 top-12">
              <IconButton name="arrow-back" onPress={() => router.back()} label="Back" />
            </View>
          </View>

          {/* Title block */}
          <View className="-mt-20 flex-row px-5">
            <Poster path={data.posterPath} width={104} size="w342" radius={14} />
            <View className="ml-4 flex-1 justify-end pb-1 pt-14">
              <Text className="text-xl font-bold leading-6 text-zinc-900 dark:text-zinc-50">{data.title}</Text>
              <Muted className="mt-1">
                {isTv ? 'Show' : 'Movie'}
                {data.year ? ` · ${data.year}` : ''}
                {data.runtime ? ` · ${isTv ? `${data.runtime} min/ep` : formatMinutes(data.runtime)}` : ''}
              </Muted>
              {isTv && data.tvStatus ? <Muted className="mt-0.5">{data.tvStatus}</Muted> : null}
            </View>
          </View>

          {data.genres.length > 0 ? (
            <Text className="mt-4 px-5 text-sm text-accent">{data.genres.join(' · ')}</Text>
          ) : null}
          {data.overview ? (
            <Text className="mt-3 px-5 text-[15px] leading-6 text-zinc-700 dark:text-zinc-300">{data.overview}</Text>
          ) : null}

          {isTv && data.nextEpisode?.airDate ? (
            <Card className="mx-5 mt-4 flex-row items-center p-3">
              <Ionicons name="calendar-outline" size={20} color={c.accent} />
              <Text className="ml-2 flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                Next: S{data.nextEpisode.season} · E{data.nextEpisode.episode} airs {formatDate(data.nextEpisode.airDate)}
              </Text>
            </Card>
          ) : null}

          {!item ? (
            /* ---------- Not tracked ---------- */
            <View className="mt-6 gap-3 px-5">
              <Button label="Add to library" icon="add" onPress={() => add(type, id, 'planned')} disabled={adding} />
              {isTv ? (
                <Button label="Start watching" icon="play" variant="secondary" onPress={() => add(type, id, 'watching')} disabled={adding} />
              ) : (
                <Button label="Add as watched" icon="checkmark" variant="secondary" onPress={() => add(type, id, 'completed')} disabled={adding} />
              )}
            </View>
          ) : (
            /* ---------- Tracked ---------- */
            <>
              <SectionTitle>Status</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5">
                {STATUSES.map((s) => (
                  <Chip key={s} label={STATUS_LABEL[s]} active={item.status === s} onPress={() => setStatus(key, s)} />
                ))}
              </ScrollView>

              {item.type === 'movie' ? (
                <View className="mt-5 px-5">
                  <Button
                    label={item.watchedAt ? `Watched ${formatDate(new Date(item.watchedAt).toISOString().slice(0, 10))}` : 'Mark as watched'}
                    icon={item.watchedAt ? 'checkmark-circle' : 'checkmark'}
                    variant={item.watchedAt ? 'secondary' : 'primary'}
                    onPress={() => {
                      Haptics.selectionAsync();
                      toggleMovieWatched(key);
                    }}
                  />
                </View>
              ) : (
                <ShowProgress item={item} onAll={(v) => setAllWatched(key, v)} />
              )}

              <SectionTitle>Your rating</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const active = item.rating === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setRating(key, active ? null : n)}
                      className={`mr-2 h-10 w-10 items-center justify-center rounded-full border ${
                        active ? 'border-accent bg-accent' : 'border-paper-line bg-paper-card dark:border-ink-line dark:bg-ink-card'
                      }`}>
                      <Text className={`font-semibold ${active ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{n}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <SectionTitle>Notes</SectionTitle>
              <View className="px-5">
                <TextInput
                  value={notes}
                  onChangeText={setNotesLocal}
                  onBlur={() => setNotes(key, notes)}
                  placeholder="Thoughts, where you stopped, who recommended it…"
                  placeholderTextColor={c.muted}
                  multiline
                  textAlignVertical="top"
                  className="min-h-[96px] rounded-xl border border-paper-line bg-paper-card p-3 text-[15px] text-zinc-900 dark:border-ink-line dark:bg-ink-card dark:text-zinc-50"
                />
              </View>

              {item.type === 'tv' && item.seasons.length > 0 ? (
                <>
                  <SectionTitle>Seasons</SectionTitle>
                  {item.seasons.map((s) => (
                    <SeasonSection key={s.number} item={item} season={s} />
                  ))}
                </>
              ) : null}

              <View className="mt-8 px-5">
                <Button label="Remove from library" icon="trash-outline" variant="danger" onPress={confirmRemove} />
              </View>
            </>
          )}

          {!item && isTv && data.seasons.length > 0 ? (
            <Muted className="mt-5 px-5">
              {data.seasons.length} {data.seasons.length === 1 ? 'season' : 'seasons'} · add it to your library to track episodes.
            </Muted>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ---------- TV progress summary ---------- */

function ShowProgress({ item, onAll }: { item: TrackedItem; onAll: (watched: boolean) => void }) {
  const watched = watchedCount(item);
  const aired = airedTotal(item);
  const progress = progressOf(item);
  const mins = watched * (item.runtime ?? 40);

  return (
    <Card className="mx-5 mt-5 p-4">
      <View className="mb-2 flex-row items-end justify-between">
        <Text className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {Math.round(progress * 100)}%
        </Text>
        <Muted>
          {watched}/{aired} episodes{mins > 0 ? ` · ${formatMinutes(mins)}` : ''}
        </Muted>
      </View>
      <ProgressBar value={progress} />
      <View className="mt-4 flex-row gap-3">
        <Button className="flex-1" label="Mark all watched" icon="checkmark-done" onPress={() => onAll(true)} disabled={watched >= aired} />
        <Button className="flex-1" label="Reset" icon="refresh" variant="secondary" onPress={() => onAll(false)} disabled={watched === 0} />
      </View>
    </Card>
  );
}

/* ---------- Season with per-episode tracking ---------- */

function SeasonSection({ item, season }: { item: TrackedItem; season: SeasonMeta }) {
  const { c } = useTheme();
  const toggleEpisode = useLibrary((s) => s.toggleEpisode);
  const setSeasonWatched = useLibrary((s) => s.setSeasonWatched);
  const markUpTo = useLibrary((s) => s.markUpTo);

  const [open, setOpen] = useState(false);
  const [episodes, setEpisodes] = useState<EpisodeInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watched = seasonWatchedCount(item, season.number);
  const complete = season.airedCount > 0 && watched >= season.airedCount;

  useEffect(() => {
    if (!open || episodes || loading) return;
    setLoading(true);
    setError(null);
    getSeasonEpisodes(item.id, season.number)
      .then(setEpisodes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load episodes.'))
      .finally(() => setLoading(false));
  }, [open, episodes, loading, item.id, season.number]);

  return (
    <Card className="mx-5 mb-3 overflow-hidden">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center p-4 active:opacity-80">
        <View className="flex-1">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{season.name || `Season ${season.number}`}</Text>
          <Muted className="mt-0.5">
            {watched}/{season.airedCount} watched
            {season.airedCount < season.episodeCount ? ` · ${season.episodeCount - season.airedCount} upcoming` : ''}
          </Muted>
        </View>
        <Pressable
          hitSlop={8}
          disabled={season.airedCount === 0}
          onPress={() => {
            Haptics.selectionAsync();
            setSeasonWatched(item.key, season.number, !complete);
          }}
          className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${
            complete ? 'bg-accent' : 'border border-paper-line dark:border-ink-line'
          } ${season.airedCount === 0 ? 'opacity-40' : ''}`}
          accessibilityLabel={complete ? 'Mark season unwatched' : 'Mark season watched'}>
          <Ionicons name="checkmark-done" size={18} color={complete ? '#ffffff' : c.text} />
        </Pressable>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
      </Pressable>

      {open ? (
        <View className="border-t border-paper-line dark:border-ink-line">
          {loading ? <ActivityIndicator className="py-5" color={c.muted} /> : null}
          {error ? <Muted className="p-4">{error}</Muted> : null}
          {episodes?.map((ep) => {
            const aired = ep.episode <= season.airedCount;
            const isWatched = !!item.watched[epKey(season.number, ep.episode)];
            return (
              <Pressable
                key={ep.episode}
                disabled={!aired}
                onPress={() => {
                  Haptics.selectionAsync();
                  toggleEpisode(item.key, season.number, ep.episode);
                }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  markUpTo(item.key, season.number, ep.episode);
                }}
                className={`flex-row items-center px-4 py-3 active:opacity-70 ${aired ? '' : 'opacity-50'}`}>
                <Ionicons
                  name={isWatched ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isWatched ? c.accent : c.muted}
                />
                <View className="ml-3 flex-1">
                  <Text numberOfLines={1} className="text-[15px] text-zinc-900 dark:text-zinc-50">
                    {ep.episode}. {ep.name}
                  </Text>
                  <Muted className="text-xs">
                    {aired ? formatDate(ep.airDate) : `Airs ${formatDate(ep.airDate)}`}
                    {ep.runtime ? ` · ${ep.runtime} min` : ''}
                  </Muted>
                </View>
              </Pressable>
            );
          })}
          {episodes && episodes.length > 0 ? (
            <Muted className="px-4 pb-3 pt-1 text-xs">Long-press an episode to mark everything up to it as watched.</Muted>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
