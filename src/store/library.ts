import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ItemMeta } from '@/lib/tmdb';
import {
  epKey,
  type Settings,
  type Status,
  type ThemePreference,
  type TrackedItem,
} from '@/lib/types';

/* ---------- Derived helpers (pure) ---------- */

export const airedTotal = (item: TrackedItem) =>
  item.seasons.reduce((sum, s) => sum + s.airedCount, 0);

export const episodeTotal = (item: TrackedItem) =>
  item.seasons.reduce((sum, s) => sum + s.episodeCount, 0);

export const watchedCount = (item: TrackedItem) => Object.keys(item.watched).length;

export const seasonWatchedCount = (item: TrackedItem, season: number) =>
  Object.keys(item.watched).filter((k) => k.startsWith(`${season}:`)).length;

/** 0..1 progress. Movies are 0 or 1; shows are watched / aired episodes. */
export function progressOf(item: TrackedItem): number {
  if (item.type === 'movie') return item.watchedAt ? 1 : 0;
  const total = airedTotal(item);
  if (total === 0) return 0;
  return Math.min(1, watchedCount(item) / total);
}

/** Next unwatched aired episode, or null. */
export function nextToWatch(item: TrackedItem): { season: number; episode: number } | null {
  for (const s of item.seasons) {
    for (let e = 1; e <= s.airedCount; e++) {
      if (!item.watched[epKey(s.number, e)]) return { season: s.number, episode: e };
    }
  }
  return null;
}

/** Total minutes watched for a single item. */
export function minutesWatched(item: TrackedItem): number {
  const rt = item.runtime ?? (item.type === 'movie' ? 100 : 40);
  if (item.type === 'movie') return item.watchedAt ? rt : 0;
  return watchedCount(item) * rt;
}

function reconcileStatus(item: TrackedItem): TrackedItem {
  if (item.type !== 'tv') return item;
  const watched = watchedCount(item);
  const aired = airedTotal(item);
  const finished = item.tvStatus === 'Ended' || item.tvStatus === 'Canceled';

  if (aired > 0 && watched >= aired && finished) return { ...item, status: 'completed' };
  if (watched > 0 && (item.status === 'planned' || item.status === 'completed')) {
    return { ...item, status: 'watching' };
  }
  return item;
}

/* ---------- Store ---------- */

interface LibraryState {
  items: Record<string, TrackedItem>;
  settings: Settings;
  hydrated: boolean;

  addItem: (meta: ItemMeta, status?: Status) => void;
  removeItem: (key: string) => void;
  refreshMeta: (meta: ItemMeta) => void;

  setStatus: (key: string, status: Status) => void;
  setRating: (key: string, rating: number | null) => void;
  setNotes: (key: string, notes: string) => void;

  toggleMovieWatched: (key: string) => void;
  toggleEpisode: (key: string, season: number, episode: number) => void;
  /** Marks every aired episode of a season watched / unwatched. */
  setSeasonWatched: (key: string, season: number, watched: boolean) => void;
  /** Marks everything aired up to and including this episode as watched. */
  markUpTo: (key: string, season: number, episode: number) => void;
  setAllWatched: (key: string, watched: boolean) => void;

  setTheme: (theme: ThemePreference) => void;
  importItems: (items: TrackedItem[], settings: Settings | null, mode: 'merge' | 'replace') => void;
  clearAll: () => void;
}

const update = (
  state: LibraryState,
  key: string,
  fn: (item: TrackedItem) => TrackedItem,
): Pick<LibraryState, 'items'> | LibraryState => {
  const current = state.items[key];
  if (!current) return state;
  const next = fn(current);
  return { items: { ...state.items, [key]: { ...next, updatedAt: Date.now() } } };
};

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      items: {},
      settings: { theme: 'dark' },
      hydrated: false,

      addItem: (meta, status = 'planned') =>
        set((state) => {
          if (state.items[meta.key]) return state;
          const now = Date.now();
          const item: TrackedItem = {
            ...meta,
            status,
            rating: null,
            notes: '',
            addedAt: now,
            updatedAt: now,
            watchedAt: meta.type === 'movie' && status === 'completed' ? now : null,
            watched: {},
            checkedAt: now,
          };
          return { items: { ...state.items, [meta.key]: item } };
        }),

      removeItem: (key) =>
        set((state) => {
          const { [key]: _removed, ...rest } = state.items;
          return { items: rest };
        }),

      refreshMeta: (meta) =>
        set((state) =>
          update(state, meta.key, (item) =>
            reconcileStatus({ ...item, ...meta, checkedAt: Date.now() }),
          ),
        ),

      setStatus: (key, status) =>
        set((state) =>
          update(state, key, (item) => ({
            ...item,
            status,
            watchedAt:
              item.type === 'movie'
                ? status === 'completed'
                  ? (item.watchedAt ?? Date.now())
                  : item.watchedAt
                : item.watchedAt,
          })),
        ),

      setRating: (key, rating) => set((state) => update(state, key, (item) => ({ ...item, rating }))),

      setNotes: (key, notes) => set((state) => update(state, key, (item) => ({ ...item, notes }))),

      toggleMovieWatched: (key) =>
        set((state) =>
          update(state, key, (item) => {
            if (item.watchedAt) {
              return {
                ...item,
                watchedAt: null,
                status: item.status === 'completed' ? 'planned' : item.status,
              };
            }
            return { ...item, watchedAt: Date.now(), status: 'completed' };
          }),
        ),

      toggleEpisode: (key, season, episode) =>
        set((state) =>
          update(state, key, (item) => {
            const k = epKey(season, episode);
            const watched = { ...item.watched };
            if (watched[k]) delete watched[k];
            else watched[k] = Date.now();
            const next = reconcileStatus({ ...item, watched });
            // Un-watching an episode of a completed show moves it back to "watching".
            if (!watched[k] && next.status === 'completed' && airedTotal(next) > Object.keys(watched).length) {
              return { ...next, status: 'watching' };
            }
            return next;
          }),
        ),

      setSeasonWatched: (key, season, value) =>
        set((state) =>
          update(state, key, (item) => {
            const meta = item.seasons.find((s) => s.number === season);
            if (!meta) return item;
            const watched = { ...item.watched };
            const now = Date.now();
            for (let e = 1; e <= meta.airedCount; e++) {
              const k = epKey(season, e);
              if (value) watched[k] ??= now;
              else delete watched[k];
            }
            const next = reconcileStatus({ ...item, watched });
            if (!value && next.status === 'completed') return { ...next, status: 'watching' };
            return next;
          }),
        ),

      markUpTo: (key, season, episode) =>
        set((state) =>
          update(state, key, (item) => {
            const watched = { ...item.watched };
            const now = Date.now();
            for (const s of item.seasons) {
              if (s.number > season) break;
              const last = s.number === season ? Math.min(episode, s.airedCount) : s.airedCount;
              for (let e = 1; e <= last; e++) watched[epKey(s.number, e)] ??= now;
            }
            return reconcileStatus({ ...item, watched });
          }),
        ),

      setAllWatched: (key, value) =>
        set((state) =>
          update(state, key, (item) => {
            if (item.type === 'movie') {
              return value
                ? { ...item, watchedAt: item.watchedAt ?? Date.now(), status: 'completed' }
                : { ...item, watchedAt: null, status: item.status === 'completed' ? 'planned' : item.status };
            }
            const watched: Record<string, number> = {};
            if (value) {
              const now = Date.now();
              for (const s of item.seasons) {
                for (let e = 1; e <= s.airedCount; e++) watched[epKey(s.number, e)] = item.watched[epKey(s.number, e)] ?? now;
              }
            }
            const next = reconcileStatus({ ...item, watched });
            if (!value && next.status === 'completed') return { ...next, status: 'planned' };
            return next;
          }),
        ),

      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),

      importItems: (incoming, settings, mode) =>
        set((state) => {
          const base = mode === 'replace' ? {} : { ...state.items };
          for (const item of incoming) {
            const existing = base[item.key];
            if (!existing || item.updatedAt >= existing.updatedAt) base[item.key] = item;
          }
          return {
            items: base,
            settings: settings ? { ...state.settings, ...settings } : state.settings,
          };
        }),

      clearAll: () => set({ items: {} }),
    }),
    {
      name: 'sceneo-library',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items, settings: state.settings }),
      onRehydrateStorage: () => () => {
        useLibrary.setState({ hydrated: true });
      },
    },
  ),
);
