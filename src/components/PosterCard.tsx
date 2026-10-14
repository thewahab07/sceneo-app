import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { STATUS_LABEL, type TrackedItem } from "@/lib/types";
import {
  airedTotal,
  nextToWatch,
  progressOf,
  useLibrary,
} from "@/store/library";
import { Poster } from "./ui";

const MAX_WIDTH = 768; // matches the max-w-3xl column used by <Screen>
const PADDING = 16;
const GAP = 12;

export function openTitle(type: "movie" | "tv", id: number) {
  router.push({
    pathname: "/title/[type]/[id]",
    params: { type, id: String(id) },
  });
}

/** Responsive poster grid: 3 columns on phones, 4 on tablets / landscape. */
export function usePosterGrid() {
  const { width } = useWindowDimensions();
  const container = Math.min(width, MAX_WIDTH);
  const cols = container >= 640 ? 4 : 3;
  const cardWidth = Math.floor(
    (container - PADDING * 2 - GAP * (cols - 1)) / cols,
  );
  return {
    cols,
    cardWidth,
    contentStyle: { paddingHorizontal: PADDING, paddingBottom: 32 },
    columnStyle: { gap: GAP, marginBottom: 18 },
  };
}

export function PosterCard({
  title,
  subtitle,
  posterPath,
  width,
  badge,
  progress,
  action,
  onPress,
}: {
  title: string;
  subtitle?: string;
  posterPath: string | null;
  width: number;
  badge?: string | null;
  /** 0..1 — draws a thin progress bar along the bottom edge of the poster. */
  progress?: number;
  action?: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width }}
      className="active:opacity-80"
    >
      <View style={{ width, borderRadius: 14, overflow: "hidden" }}>
        <Poster
          path={posterPath}
          width={width}
          size={width > 130 ? "w342" : "w185"}
          radius={14}
        />
        {badge ? (
          <View className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5">
            <Text className="text-[11px] font-semibold text-white">
              {badge}
            </Text>
          </View>
        ) : null}
        {action ? (
          <View className="absolute bottom-2 right-2">{action}</View>
        ) : null}
        {progress !== undefined && progress > 0 ? (
          <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <View
              className="h-full bg-accent"
              style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
            />
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        className="mt-2 text-[13px] font-semibold text-zinc-900 dark:text-zinc-50"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          numberOfLines={1}
          className="text-xs text-zinc-500 dark:text-zinc-400"
        >
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Small round button that sits on a poster corner. */
export function PosterAction({
  icon,
  active,
  onPress,
  label,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress?: () => void;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={label}
      className={`h-8 w-8 items-center justify-center rounded-full ${active ? "bg-accent" : "bg-black/70"}`}
    >
      {children ??
        (icon ? <Ionicons name={icon} size={18} color="#ffffff" /> : null)}
    </Pressable>
  );
}

/** Library entry: poster with next-episode badge, progress bar and a quick action. */
export function LibraryCard({
  item,
  width,
}: {
  item: TrackedItem;
  width: number;
}) {
  const toggleEpisode = useLibrary((s) => s.toggleEpisode);
  const toggleMovieWatched = useLibrary((s) => s.toggleMovieWatched);

  const isTv = item.type === "tv";
  const next = isTv ? nextToWatch(item) : null;

  let badge: string | null = null;
  if (isTv) {
    if (next) badge = `S${next.season} · E${next.episode}`;
    else if (airedTotal(item) > 0) badge = "Up to date";
  } else if (item.watchedAt) {
    badge = "Watched";
  }

  const onQuick = () => {
    Haptics.selectionAsync();
    if (isTv) {
      if (next) toggleEpisode(item.key, next.season, next.episode);
    } else {
      toggleMovieWatched(item.key);
    }
  };

  const action = isTv ? (
    next ? (
      <PosterAction
        icon="add"
        active
        onPress={onQuick}
        label="Mark next episode watched"
      />
    ) : null
  ) : (
    <PosterAction
      icon="checkmark"
      active={!!item.watchedAt}
      onPress={onQuick}
      label="Toggle watched"
    />
  );

  return (
    <PosterCard
      title={item.title}
      subtitle={STATUS_LABEL[item.status]}
      posterPath={item.posterPath}
      width={width}
      badge={badge}
      progress={isTv ? progressOf(item) : undefined}
      action={action}
      onPress={() => openTitle(item.type, item.id)}
    />
  );
}
