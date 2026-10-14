export type MediaType = 'movie' | 'tv';

export type Status = 'watching' | 'planned' | 'completed' | 'on_hold' | 'dropped';

export const STATUSES: Status[] = ['watching', 'planned', 'completed', 'on_hold', 'dropped'];

export const STATUS_LABEL: Record<Status, string> = {
  watching: 'Watching',
  planned: 'Plan to watch',
  completed: 'Completed',
  on_hold: 'On hold',
  dropped: 'Dropped',
};

export interface SeasonMeta {
  number: number;
  name: string;
  /** Total episodes listed by TMDB for the season. */
  episodeCount: number;
  /** Episodes that have already aired (<= episodeCount). */
  airedCount: number;
  airDate: string | null;
}

export interface NextEpisode {
  season: number;
  episode: number;
  name: string;
  airDate: string | null;
}

export interface TrackedItem {
  /** `${type}:${id}` */
  key: string;
  id: number;
  type: MediaType;
  title: string;
  year: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  /** Movie runtime or average TV episode runtime, in minutes. */
  runtime: number | null;
  /** Movies: release date. TV: first air date. */
  releaseDate: string | null;

  status: Status;
  /** 1-10 personal rating. */
  rating: number | null;
  notes: string;
  addedAt: number;
  updatedAt: number;

  /** Movies: timestamp when marked watched. */
  watchedAt: number | null;

  /** TV only */
  tvStatus: string | null;
  seasons: SeasonMeta[];
  /** Watched episodes: `"season:episode"` -> timestamp watched. */
  watched: Record<string, number>;
  nextEpisode: NextEpisode | null;
  /** Last time metadata was refreshed from TMDB. */
  checkedAt: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
}

export interface BackupFile {
  app: 'sceneo';
  version: 1;
  exportedAt: string;
  settings: Settings;
  items: TrackedItem[];
}

/** Lightweight shape used by search / trending lists. */
export interface SearchResult {
  id: number;
  type: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  voteAverage: number;
}

export interface EpisodeInfo {
  episode: number;
  name: string;
  airDate: string | null;
  runtime: number | null;
  overview: string;
}

export const epKey = (season: number, episode: number) => `${season}:${episode}`;
export const itemKey = (type: MediaType, id: number) => `${type}:${id}`;
