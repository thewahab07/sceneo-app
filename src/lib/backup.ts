import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { useLibrary } from "@/store/library";
import {
  STATUSES,
  type BackupFile,
  type MediaType,
  type Settings,
  type Status,
  type ThemePreference,
  type TrackedItem,
} from "./types";

/* ---------- Export ---------- */

export function buildBackup(): BackupFile {
  const { items, settings } = useLibrary.getState();
  return {
    app: "sceneo",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    items: Object.values(items),
  };
}

export async function exportBackup(): Promise<void> {
  const backup = buildBackup();
  const date = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `sceneo-backup-${date}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Export Sceneo backup",
    UTI: "public.json",
  });
}

/* ---------- Import ---------- */

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const strOrNull = (v: unknown) => (typeof v === "string" ? v : null);
const numOrNull = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function sanitizeItem(raw: unknown): TrackedItem | null {
  if (!isObj(raw)) return null;
  const type = raw.type as MediaType;
  const id = raw.id;
  if ((type !== "movie" && type !== "tv") || typeof id !== "number")
    return null;

  const status: Status = STATUSES.includes(raw.status as Status)
    ? (raw.status as Status)
    : "planned";
  const now = Date.now();

  const watched: Record<string, number> = {};
  if (isObj(raw.watched)) {
    for (const [k, v] of Object.entries(raw.watched)) {
      if (/^\d+:\d+$/.test(k)) watched[k] = typeof v === "number" ? v : now;
    }
  }

  const seasons = Array.isArray(raw.seasons)
    ? raw.seasons
        .filter(isObj)
        .map((s) => ({
          number: typeof s.number === "number" ? s.number : 0,
          name: str(s.name),
          episodeCount: typeof s.episodeCount === "number" ? s.episodeCount : 0,
          airedCount: typeof s.airedCount === "number" ? s.airedCount : 0,
          airDate: strOrNull(s.airDate),
        }))
        .filter((s) => s.number > 0)
    : [];

  let nextEpisode: TrackedItem["nextEpisode"] = null;
  if (
    isObj(raw.nextEpisode) &&
    typeof raw.nextEpisode.season === "number" &&
    typeof raw.nextEpisode.episode === "number"
  ) {
    nextEpisode = {
      season: raw.nextEpisode.season,
      episode: raw.nextEpisode.episode,
      name: str(raw.nextEpisode.name),
      airDate: strOrNull(raw.nextEpisode.airDate),
    };
  }

  return {
    key: `${type}:${id}`,
    id,
    type,
    title: str(raw.title, "Untitled"),
    year: strOrNull(raw.year),
    overview: str(raw.overview),
    posterPath: strOrNull(raw.posterPath),
    backdropPath: strOrNull(raw.backdropPath),
    genres: Array.isArray(raw.genres)
      ? raw.genres.filter((g): g is string => typeof g === "string")
      : [],
    runtime: numOrNull(raw.runtime),
    releaseDate: strOrNull(raw.releaseDate),
    status,
    addedAt: numOrNull(raw.addedAt) ?? now,
    updatedAt: numOrNull(raw.updatedAt) ?? now,
    watchedAt: numOrNull(raw.watchedAt),
    tvStatus: strOrNull(raw.tvStatus),
    seasons,
    watched,
    nextEpisode,
    checkedAt: numOrNull(raw.checkedAt) ?? 0,
  };
}

export interface ParsedBackup {
  items: TrackedItem[];
  settings: Settings | null;
  skipped: number;
}

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!isObj(data) || data.app !== "sceneo" || !Array.isArray(data.items)) {
    throw new Error("That file is not a Sceneo backup.");
  }
  const items = data.items
    .map(sanitizeItem)
    .filter((i): i is TrackedItem => i !== null);

  let settings: Settings | null = null;
  if (
    isObj(data.settings) &&
    ["system", "light", "dark"].includes(data.settings.theme as string)
  ) {
    settings = { theme: data.settings.theme as ThemePreference };
  }
  return { items, settings, skipped: data.items.length - items.length };
}

/** Opens the system file picker and returns the parsed backup, or null if cancelled. */
export async function pickBackup(): Promise<ParsedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const text = await new File(asset.uri).text();
  return parseBackup(text);
}
