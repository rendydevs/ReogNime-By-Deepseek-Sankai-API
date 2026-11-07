import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_FILE = path.resolve(import.meta.dirname, '..', 'data', 'anime.json');
const dataFile = process.env.CATALOG_FILE ? path.resolve(process.env.CATALOG_FILE) : DEFAULT_FILE;
const payload = JSON.parse(readFileSync(dataFile, 'utf8'));

export const catalogMeta = payload.meta;
export const animeList = payload.anime;

const SPOTLIGHT_IDS = [154587, 195516, 120377, 171627];

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const FORMATS = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'];
const STATUSES = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'];

const byId = new Map(animeList.map((anime) => [anime.id, anime]));

function normalize(value = '') {
  return value
    .toString()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gu, ' ')
    .trim();
}

function searchable(anime) {
  return [anime.title, anime.originalTitle, anime.nativeTitle, anime.studios.join(' '), anime.genres.join(' ')]
    .map(normalize)
    .join(' | ');
}

const searchIndex = new Map(animeList.map((anime) => [anime.id, searchable(anime)]));

function relevance(anime, queryTokens) {
  const title = normalize(anime.title);
  const original = normalize(anime.originalTitle);
  if (!queryTokens.length) return 0;
  const phrase = queryTokens.join(' ');
  let score = 0;
  if (title === phrase) score += 100;
  else if (title.startsWith(phrase)) score += 60;
  else if (title.includes(phrase)) score += 40;
  if (original === phrase) score += 90;
  else if (original.includes(phrase)) score += 30;
  score += queryTokens.filter((token) => searchIndex.get(anime.id).includes(token)).length * 5;
  return score;
}

export function toSummary(anime) {
  return {
    id: anime.id,
    slug: anime.slug,
    title: anime.title,
    originalTitle: anime.originalTitle,
    nativeTitle: anime.nativeTitle,
    cover: anime.cover,
    banner: anime.banner,
    accent: anime.accent,
    score: anime.score,
    popularity: anime.popularity,
    episodes: anime.episodes,
    duration: anime.duration,
    status: anime.status,
    format: anime.format,
    season: anime.season,
    seasonYear: anime.seasonYear,
    startDate: anime.startDate,
    genres: anime.genres,
    studios: anime.studios,
    nextAiringEpisode: anime.nextAiringEpisode,
  };
}

function compareTitle(a, b) {
  return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
}

function sortAnime(list, sort = 'popularity') {
  const items = [...list];
  switch (sort) {
    case 'score':
      return items.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.popularity - a.popularity);
    case 'newest':
      return items.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '') || b.popularity - a.popularity);
    case 'favorites':
      return items.sort((a, b) => b.favorites - a.favorites);
    case 'title':
      return items.sort(compareTitle);
    case 'popularity':
    default:
      return items.sort((a, b) => b.popularity - a.popularity || (b.score ?? 0) - (a.score ?? 0));
  }
}

export function parseGenres(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map((genre) => genre.trim()).filter(Boolean);
}

export function listAnime(options = {}) {
  const {
    q = '',
    genres = [],
    year,
    season,
    format,
    status,
    minScore,
    sort = 'popularity',
    page = 1,
    limit = 20,
  } = options;
  const tokens = normalize(q).split(/\s+/).filter(Boolean);
  const selectedGenres = (Array.isArray(genres) ? genres : parseGenres(genres)).map((genre) => genre.toLowerCase());

  let results = animeList.filter((anime) => {
    if (tokens.length) {
      const haystack = searchIndex.get(anime.id);
      if (tokens.some((token) => !haystack.includes(token))) return false;
    }
    if (selectedGenres.length) {
      const available = anime.genres.map((genre) => genre.toLowerCase());
      if (!selectedGenres.every((genre) => available.includes(genre))) return false;
    }
    if (year !== undefined && year !== null && anime.seasonYear !== Number(year)) return false;
    if (season && anime.season !== season) return false;
    if (format && anime.format !== format) return false;
    if (status && anime.status !== status) return false;
    if (minScore !== undefined && minScore !== null && (anime.score ?? 0) < Number(minScore)) return false;
    return true;
  });

  if (tokens.length) {
    results = results.sort((a, b) => relevance(b, tokens) - relevance(a, tokens) || b.popularity - a.popularity);
  } else {
    results = sortAnime(results, sort);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const total = results.length;
  const totalPages = Math.ceil(total / safeLimit);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), Math.max(totalPages, 1));
  const start = (safePage - 1) * safeLimit;
  const items = results.slice(start, start + safeLimit).map(toSummary);

  return {
    data: items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

export function getAnime(id) {
  return byId.get(Number(id)) ?? null;
}

export function getAnimeDetail(id) {
  const anime = getAnime(id);
  if (!anime) return null;
  return {
    ...anime,
    related: getRelated(anime.id, 6),
    episodeTracker: {
      available: Boolean(anime.episodes),
      totalEpisodes: anime.episodes ?? null,
      nextEpisode: anime.nextAiringEpisode?.episode ?? null,
    },
  };
}

export function getRelated(id, limit = 6) {
  const source = getAnime(id);
  if (!source) return [];
  const sourceGenres = new Set(source.genres);
  return animeList
    .filter((anime) => anime.id !== source.id)
    .map((anime) => {
      const sharedGenres = anime.genres.filter((genre) => sourceGenres.has(genre)).length;
      const sameStudio = anime.studios.some((studio) => source.studios.includes(studio)) ? 2 : 0;
      const sameDecade = Math.floor((anime.seasonYear ?? 0) / 10) === Math.floor((source.seasonYear ?? 0) / 10) ? 1 : 0;
      return { anime, weight: sharedGenres * 4 + sameStudio + sameDecade };
    })
    .filter(({ weight }) => weight >= 5)
    .sort((a, b) => b.weight - a.weight || (b.anime.score ?? 0) - (a.anime.score ?? 0))
    .slice(0, limit)
    .map(({ anime }) => toSummary(anime));
}

export function getEpisodes(id, { page = 1, limit = 12 } = {}) {
  const anime = getAnime(id);
  if (!anime) return null;
  if (!anime.episodes) {
    return {
      data: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      meta: { totalEpisodes: null, nextAiringEpisode: anime.nextAiringEpisode },
    };
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
  const total = anime.episodes;
  const totalPages = Math.ceil(total / safeLimit);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), Math.max(totalPages, 1));
  const start = (safePage - 1) * safeLimit;
  const end = Math.min(start + safeLimit, total);
  const startDate = anime.startDate ? new Date(`${anime.startDate}T00:00:00Z`) : null;
  const data = Array.from({ length: Math.max(0, end - start) }, (_, offset) => {
    const number = start + offset + 1;
    let airDate = null;
    if (startDate && Number.isFinite(startDate.getTime())) {
      airDate = new Date(startDate.getTime() + (number - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
    }
    if (anime.nextAiringEpisode && number >= anime.nextAiringEpisode.episode) airDate = null;
    return {
      number,
      title: total === 1 ? 'Feature presentation' : `Episode ${String(number).padStart(2, '0')}`,
      airDate,
      duration: anime.duration,
      aired: anime.nextAiringEpisode ? number < anime.nextAiringEpisode.episode : true,
    };
  });
  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
    meta: { totalEpisodes: total, nextAiringEpisode: anime.nextAiringEpisode },
  };
}

export function getSuggestions(q = '', limit = 6) {
  const query = normalize(q);
  let items;
  if (!query) {
    items = sortAnime(animeList, 'popularity').slice(0, limit);
  } else {
    const tokens = query.split(/\s+/).filter(Boolean);
    items = animeList
      .filter((anime) => tokens.every((token) => searchIndex.get(anime.id).includes(token)))
      .sort((a, b) => relevance(b, tokens) - relevance(a, tokens) || b.popularity - a.popularity)
      .slice(0, limit);
  }
  return items.map(toSummary);
}

export function getRandom(options = {}) {
  const { data } = listAnime({ ...options, page: 1, limit: 50 });
  if (!data.length) return null;
  return data[randomInt(0, data.length)];
}

export function getGenres() {
  const counts = new Map();
  for (const anime of animeList) {
    for (const genre of anime.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getFilterOptions() {
  const years = [...new Set(animeList.map((anime) => anime.seasonYear).filter(Boolean))].sort((a, b) => b - a);
  const countBy = (key) => {
    const counts = new Map();
    for (const anime of animeList) {
      const value = anime[key];
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].map(([value, count]) => ({ value, count }));
  };
  return {
    genres: getGenres(),
    years,
    formats: countBy('format'),
    seasons: countBy('season'),
    statuses: countBy('status'),
    sorts: [
      { value: 'popularity', label: 'Most popular' },
      { value: 'score', label: 'Highest rated' },
      { value: 'newest', label: 'Newest first' },
      { value: 'favorites', label: 'Most favorited' },
      { value: 'title', label: 'A–Z' },
    ],
  };
}

function getCurrentSeason(date = new Date()) {
  const month = date.getUTCMonth();
  const season = month < 3 ? 'WINTER' : month < 6 ? 'SPRING' : month < 9 ? 'SUMMER' : 'FALL';
  return { season, year: date.getUTCFullYear() };
}

export function getHome() {
  const currentSeason = getCurrentSeason();
  const spotlight = SPOTLIGHT_IDS.map((id) => getAnime(id)).filter(Boolean).map((anime) => ({
    ...toSummary(anime),
    synopsis: anime.synopsis,
    trailer: anime.trailer,
  }));
  const trending = sortAnime(animeList, 'popularity')
    .filter((anime) => !SPOTLIGHT_IDS.slice(0, 2).includes(anime.id))
    .slice(0, 8)
    .map(toSummary);
  const topRated = sortAnime(animeList.filter((anime) => anime.score), 'score').slice(0, 6).map(toSummary);
  const newReleases = sortAnime(animeList.filter((anime) => anime.seasonYear && anime.seasonYear >= 2022), 'newest')
    .slice(0, 8)
    .map(toSummary);
  const genreList = getGenres();
  const seasonalAnime = animeList
    .filter((anime) => anime.season === currentSeason.season && anime.seasonYear === currentSeason.year)
    .map(toSummary);

  return {
    spotlight,
    trending,
    topRated,
    newReleases,
    season: {
      ...currentSeason,
      titles: seasonalAnime,
      count: seasonalAnime.length,
    },
    genres: genreList.filter((genre) => ['Action', 'Drama', 'Romance', 'Mystery', 'Sci-Fi', 'Slice of Life', 'Fantasy', 'Comedy'].includes(genre.name)),
    stats: {
      titles: animeList.length,
      episodes: animeList.reduce((total, anime) => total + (anime.episodes ?? 0), 0),
      genres: genreList.length,
      earliestYear: Math.min(...animeList.map((anime) => anime.seasonYear).filter(Boolean)),
      latestYear: Math.max(...animeList.map((anime) => anime.seasonYear).filter(Boolean)),
    },
  };
}

export function getCatalogMeta() {
  return {
    ...catalogMeta,
    titles: animeList.length,
    genres: getGenres().length,
    formats: FORMATS,
    statuses: STATUSES,
    seasons: SEASONS,
    years: [...new Set(animeList.map((anime) => anime.seasonYear).filter(Boolean))].sort((a, b) => b - a),
  };
}
