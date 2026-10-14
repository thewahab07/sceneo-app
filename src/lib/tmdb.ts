import type {
  EpisodeInfo,
  MediaType,
  NextEpisode,
  SearchResult,
  SeasonMeta,
  TrackedItem,
} from './types';
import { itemKey } from './types';

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE = 'https://api.themoviedb.org/3';

export const IMG = {
  poster: (path: string | null, size: 'w185' | 'w342' | 'w500' = 'w342') =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null,
  backdrop: (path: string | null) => (path ? `https://image.tmdb.org/t/p/w780${path}` : null),
};

async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  if (!API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_TMDB_API_KEY. Add it to your .env file.');
  }
  const qs = new URLSearchParams({
    api_key: API_KEY,
    language: 'en-US',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${BASE}${path}?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

const year = (date?: string | null) => (date && date.length >= 4 ? date.slice(0, 4) : null);

/* ---------- Search & trending ---------- */

interface RawListItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
}

function toResult(raw: RawListItem, forcedType?: MediaType): SearchResult | null {
  const type = forcedType ?? (raw.media_type as MediaType | undefined);
  if (type !== 'movie' && type !== 'tv') return null;
  return {
    id: raw.id,
    type,
    title: (type === 'movie' ? raw.title : raw.name) ?? 'Untitled',
    year: year(type === 'movie' ? raw.release_date : raw.first_air_date),
    posterPath: raw.poster_path ?? null,
    overview: raw.overview ?? '',
    voteAverage: raw.vote_average ?? 0,
  };
}

export async function searchMulti(query: string): Promise<SearchResult[]> {
  const data = await get<{ results: RawListItem[] }>('/search/multi', {
    query,
    include_adult: 'false',
  });
  return data.results.map((r) => toResult(r)).filter((r): r is SearchResult => r !== null);
}

export async function getTrending(): Promise<SearchResult[]> {
  const data = await get<{ results: RawListItem[] }>('/trending/all/week');
  return data.results.map((r) => toResult(r)).filter((r): r is SearchResult => r !== null);
}

/* ---------- Details ---------- */

interface RawEpisodeRef {
  season_number: number;
  episode_number: number;
  name?: string;
  air_date?: string | null;
}

interface RawTv {
  id: number;
  name: string;
  overview: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  episode_run_time?: number[];
  status?: string;
  seasons: {
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
  }[];
  last_episode_to_air: RawEpisodeRef | null;
  next_episode_to_air: RawEpisodeRef | null;
}

interface RawMovie {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  runtime: number | null;
}

/** Metadata that is safe to overwrite when refreshing an existing tracked item. */
export type ItemMeta = Pick<
  TrackedItem,
  | 'key'
  | 'id'
  | 'type'
  | 'title'
  | 'year'
  | 'overview'
  | 'posterPath'
  | 'backdropPath'
  | 'genres'
  | 'runtime'
  | 'releaseDate'
  | 'tvStatus'
  | 'seasons'
  | 'nextEpisode'
>;

function buildSeasons(raw: RawTv): SeasonMeta[] {
  const last = raw.last_episode_to_air;
  return raw.seasons
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .map((s) => {
      let aired = 0;
      if (!last) aired = 0;
      else if (s.season_number < last.season_number) aired = s.episode_count;
      else if (s.season_number === last.season_number)
        aired = Math.min(s.episode_count, last.episode_number);
      return {
        number: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        airedCount: aired,
        airDate: s.air_date,
      };
    });
}

export async function getMeta(type: MediaType, id: number): Promise<ItemMeta> {
  if (type === 'movie') {
    const m = await get<RawMovie>(`/movie/${id}`);
    return {
      key: itemKey('movie', m.id),
      id: m.id,
      type: 'movie',
      title: m.title,
      year: year(m.release_date),
      overview: m.overview ?? '',
      posterPath: m.poster_path,
      backdropPath: m.backdrop_path,
      genres: m.genres.map((g) => g.name),
      runtime: m.runtime && m.runtime > 0 ? m.runtime : null,
      releaseDate: m.release_date || null,
      tvStatus: null,
      seasons: [],
      nextEpisode: null,
    };
  }

  const t = await get<RawTv>(`/tv/${id}`);
  const next: NextEpisode | null = t.next_episode_to_air
    ? {
        season: t.next_episode_to_air.season_number,
        episode: t.next_episode_to_air.episode_number,
        name: t.next_episode_to_air.name ?? '',
        airDate: t.next_episode_to_air.air_date ?? null,
      }
    : null;
  const runtimes = t.episode_run_time ?? [];
  const avg = runtimes.length ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : null;
  return {
    key: itemKey('tv', t.id),
    id: t.id,
    type: 'tv',
    title: t.name,
    year: year(t.first_air_date),
    overview: t.overview ?? '',
    posterPath: t.poster_path,
    backdropPath: t.backdrop_path,
    genres: t.genres.map((g) => g.name),
    runtime: avg,
    releaseDate: t.first_air_date || null,
    tvStatus: t.status ?? null,
    seasons: buildSeasons(t),
    nextEpisode: next,
  };
}

/* ---------- Episodes ---------- */

const seasonCache = new Map<string, EpisodeInfo[]>();

export async function getSeasonEpisodes(tvId: number, season: number): Promise<EpisodeInfo[]> {
  const cacheKey = `${tvId}:${season}`;
  const cached = seasonCache.get(cacheKey);
  if (cached) return cached;
  const data = await get<{
    episodes: {
      episode_number: number;
      name: string;
      air_date: string | null;
      runtime: number | null;
      overview: string;
    }[];
  }>(`/tv/${tvId}/season/${season}`);
  const episodes = data.episodes.map((e) => ({
    episode: e.episode_number,
    name: e.name,
    airDate: e.air_date,
    runtime: e.runtime,
    overview: e.overview,
  }));
  seasonCache.set(cacheKey, episodes);
  return episodes;
}
