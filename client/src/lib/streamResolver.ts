import { api } from './api';
import type { Anime, OtakuCard } from '../types';

export interface StreamMatch {
  seriesSlug: string;
  seriesTitle: string;
  episodeSlug?: string;
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|season|part|movie)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleScore(candidate: OtakuCard, anime: Pick<Anime, 'title' | 'originalTitle' | 'nativeTitle'>): number {
  const candidateTitle = normalizeTitle(candidate.title);
  const wanted = [anime.title, anime.originalTitle, anime.nativeTitle]
    .filter(Boolean)
    .map((title) => normalizeTitle(title as string))
    .filter(Boolean);

  let best = 0;
  for (const title of wanted) {
    if (!title) continue;
    if (candidateTitle === title) best = Math.max(best, 100);
    else if (candidateTitle.includes(title) || title.includes(candidateTitle)) best = Math.max(best, 60);
    else {
      const words = new Set(candidateTitle.split(' '));
      const overlap = title.split(' ').filter((word) => word.length > 2 && words.has(word)).length;
      best = Math.max(best, overlap * 10);
    }
  }
  return best;
}

const seriesCache = new Map<string, StreamMatch | null>();

export async function resolveStreamingAnime(
  anime: Pick<Anime, 'title' | 'originalTitle' | 'nativeTitle'>,
): Promise<StreamMatch | null> {
  const cacheKey = `${anime.title}|${anime.originalTitle}`;
  if (seriesCache.has(cacheKey)) return seriesCache.get(cacheKey) ?? null;

  const queries = [anime.originalTitle, anime.title, anime.nativeTitle]
    .filter((query): query is string => Boolean(query && query.trim()))
    .filter((query, index, list) => list.findIndex((item) => item.toLowerCase() === query.toLowerCase()) === index);

  let best: { candidate: OtakuCard; score: number } | null = null;
  for (const query of queries) {
    try {
      const payload = await api.otaku.search(query);
      for (const candidate of payload.data ?? []) {
        const score = titleScore(candidate, anime);
        if (!best || score > best.score) best = { candidate, score };
      }
      const currentBest = best;
      if (currentBest && currentBest.score >= 100) break;
    } catch {
      // Try the next title; a failed query should not block another spelling.
    }
  }

  const match = best !== null && best.score >= 20
    ? { seriesSlug: best.candidate.slug, seriesTitle: best.candidate.title }
    : null;
  seriesCache.set(cacheKey, match);
  return match;
}

export async function resolveStreamingEpisode(
  anime: Pick<Anime, 'title' | 'originalTitle' | 'nativeTitle'>,
  episodeNumber: number,
): Promise<StreamMatch | null> {
  const series = await resolveStreamingAnime(anime);
  if (!series) return null;

  try {
    const detail = await api.otaku.anime(series.seriesSlug);
    const episode =
      detail.data.episodeList.find((item) => item.number === episodeNumber)
      ?? detail.data.episodeList.find((item) => new RegExp(`episode\\s*0*${episodeNumber}\\b`, 'i').test(item.title));

    return {
      ...series,
      episodeSlug: episode?.slug,
    };
  } catch {
    return series;
  }
}
