import { useCallback, useEffect, useState } from 'react';

export interface WatchHistoryEntry {
  episodeSlug: string;
  animeSlug: string;
  animeTitle: string;
  episodeTitle: string;
  poster: string | null;
  watchedAt: string;
}

export interface SeriesMeta {
  slug: string;
  title: string;
  poster: string | null;
  banner?: string | null;
}

const HISTORY_KEY = 'reognime-watch-history-v1';
const SERIES_KEY = 'reognime-series-meta-v1';
const HISTORY_EVENT = 'reognime-watch-history';

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function isHistoryEntry(value: unknown): value is WatchHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<WatchHistoryEntry>;
  return Boolean(
    entry.episodeSlug
      && entry.animeSlug
      && entry.animeTitle
      && entry.episodeTitle
      && entry.watchedAt
      && typeof entry.episodeSlug === 'string'
      && typeof entry.animeSlug === 'string'
      && typeof entry.animeTitle === 'string'
      && typeof entry.episodeTitle === 'string'
      && typeof entry.watchedAt === 'string',
  );
}

export function getWatchHistory(): WatchHistoryEntry[] {
  const value = readJson<unknown>(HISTORY_KEY, []);
  return Array.isArray(value) ? value.filter(isHistoryEntry).slice(0, 8) : [];
}

function emitHistoryChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function recordWatch(entry: Omit<WatchHistoryEntry, 'watchedAt'> & { watchedAt?: string }) {
  if (!entry.episodeSlug || !entry.animeSlug) return;
  const next: WatchHistoryEntry[] = [
    {
      ...entry,
      watchedAt: entry.watchedAt ?? new Date().toISOString(),
    },
    ...getWatchHistory().filter((item) => item.episodeSlug !== entry.episodeSlug),
  ].slice(0, 8);
  writeJson(HISTORY_KEY, next);
  emitHistoryChange();
}

export function removeWatchHistory(episodeSlug: string) {
  writeJson(HISTORY_KEY, getWatchHistory().filter((item) => item.episodeSlug !== episodeSlug));
  emitHistoryChange();
}

export function clearWatchHistory() {
  writeJson(HISTORY_KEY, []);
  emitHistoryChange();
}

export function rememberSeriesMeta(meta: SeriesMeta) {
  if (!meta.slug || !meta.title) return;
  const current = readJson<SeriesMeta[]>(SERIES_KEY, []);
  const next = [
    meta,
    ...(Array.isArray(current) ? current.filter((item) => item?.slug !== meta.slug) : []),
  ].slice(0, 24);
  writeJson(SERIES_KEY, next);
}

export function getSeriesMeta(slug: string): SeriesMeta | null {
  const current = readJson<SeriesMeta[]>(SERIES_KEY, []);
  if (!Array.isArray(current)) return null;
  return current.find((item) => item?.slug === slug) ?? null;
}

export function useWatchHistory() {
  const [items, setItems] = useState<WatchHistoryEntry[]>(getWatchHistory);

  useEffect(() => {
    const update = () => setItems(getWatchHistory());
    window.addEventListener('storage', update);
    window.addEventListener(HISTORY_EVENT, update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener(HISTORY_EVENT, update);
    };
  }, []);

  const remove = useCallback((episodeSlug: string) => removeWatchHistory(episodeSlug), []);
  const clear = useCallback(() => clearWatchHistory(), []);

  return { items, remove, clear };
}
