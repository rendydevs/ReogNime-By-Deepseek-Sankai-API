/**
 * Otakudesu adapter.
 *
 * Data comes from the public Otakudesu endpoints documented at
 * https://www.sankavollerei.web.id/anime/. Responses are normalised so the
 * frontend never has to know about upstream quirks, and every upstream call is
 * cached + softly rate limited (the provider allows 45 requests/minute).
 */
import { readFileSync } from 'node:fs';
import { ApiError } from './errors.js';

export const OTAKUDESU_SOURCE = {
  name: 'Otakudesu',
  provider: 'Sanka Vollerei',
  apiUrl: 'https://www.sankavollerei.web.id/anime/',
  siteUrl: 'https://otakudesu.or.at/',
};

const DEFAULT_API_BASE = 'https://www.sankavollerei.web.id/anime';
const DEFAULT_SITEMAP_URL = 'https://otakudesu.or.at/series-sitemap.xml';
const MAX_UPSTREAM_PER_MINUTE = 30;
const CACHE_LIMIT = 220;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TTL = {
  home: 120_000,
  ongoing: 90_000,
  completed: 90_000,
  schedule: 600_000,
  genres: 21_600_000,
  genre: 180_000,
  search: 120_000,
  anime: 300_000,
  episode: 300_000,
  batch: 3_600_000,
  server: 600_000,
  unlimited: 21_600_000,
  covers: 21_600_000,
};

const HTML_ENTITIES = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

function decodeEntities(value = '') {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITIES[name.toLowerCase()] ?? match);
}

export function cleanTitle(input = '') {
  return decodeEntities(String(input))
    .replace(/\s*[-–]?\s*\(Episode\s+[^)]*\)\s*/gi, ' ')
    .replace(/\s+Subtitle\s+Indonesia\s*$/i, '')
    .replace(/\s+Subtitle\s+Indo\s*$/i, '')
    .replace(/\s+Sub\s+Indo\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEpisodeTitle(input = '', number = null) {
  const raw = decodeEntities(String(input));
  const match = raw.match(/\bEpisode\s+([0-9.]+)(\s*\(End\))?/i);
  if (match) return `Episode ${match[1]}${match[2] ? ' · End' : ''}`;
  if (number !== null) return `Episode ${number}`;
  return cleanTitle(raw);
}

function numeric(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number.parseFloat(String(value));
  return Number.isFinite(number) ? number : null;
}

function score(value) {
  const parsed = numeric(value);
  return parsed === null ? null : Math.round(parsed * 100) / 100;
}

function splitNames(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanStatus(value, fallback = null) {
  if (!value) return fallback;
  if (/ongoing|airing|currently/i.test(value)) return 'Ongoing';
  if (/completed|finished|tamat/i.test(value)) return 'Completed';
  if (/upcoming|not.?yet/i.test(value)) return 'Upcoming';
  return String(value);
}

function normalizeGenres(list) {
  return (Array.isArray(list) ? list : [])
    .map((genre) => ({
      name: cleanTitle(genre.title ?? genre.name ?? ''),
      slug: genre.genreId ?? genre.slug ?? '',
    }))
    .filter((genre) => genre.name);
}

function normalizeSynopsis(input) {
  if (!input) return [];
  if (typeof input === 'string') return [cleanTitle(input)];
  if (Array.isArray(input.paragraphs)) {
    return input.paragraphs.map((paragraph) => decodeEntities(String(paragraph)).trim()).filter(Boolean);
  }
  return [];
}

function safeSlug(value) {
  const text = String(value ?? '').trim();
  if (!text || text.length > 220 || /[/\\?#]/.test(text) || text.includes('..')) return '';
  return text;
}

function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(decodeEntities(String(value)));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function titleSlug(title) {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(\d+)(?:st|nd|rd|th)\s+season\b/g, 'season $1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function candidateSlug(url) {
  try {
    const parts = new URL(url).pathname.replace(/\/+$/, '').split('/');
    const value = parts[parts.length - 1] ?? '';
    return decodeURIComponent(value)
      .toLowerCase()
      .replace(/\b(\d+)(?:st|nd|rd|th)-season\b/g, 'season-$1')
      .replace(/-+/g, '-');
  } catch {
    return '';
  }
}

function tokenize(value) {
  return value.split('-').filter(Boolean);
}

function sitemapEntries(xml) {
  const entries = [];
  const blockPattern = /<url>([\s\S]*?)<\/url>/g;
  for (const block of xml.matchAll(blockPattern)) {
    const loc = block[1].match(/<loc>([^<]+)<\/loc>/);
    const image = block[1].match(/<image:loc>([^<]+)<\/image:loc>/);
    if (!loc) continue;
    entries.push({
      url: decodeEntities(loc[1].trim()),
      image: image ? decodeEntities(image[1].trim()) : null,
    });
  }
  return entries;
}

function buildArtworkIndex(entries) {
  const byStem = new Map();
  const usable = entries.filter((entry) => entry.image);
  for (const entry of usable) {
    const filename = decodeURIComponent(entry.image.split('/').pop()?.split('?')[0] ?? '');
    const stem = filename.replace(/\.[^.]+$/, '').toLowerCase();
    if (!stem) continue;
    byStem.set(stem, entry);
    const tail = stem.match(/-([0-9]+)$/);
    if (tail) byStem.set(tail[1], entry);
  }
  return {
    entries: usable.map((entry) => ({ ...entry, slug: candidateSlug(entry.url), tokens: tokenize(candidateSlug(entry.url)) })),
    byStem,
    loadedAt: Date.now(),
  };
}

let bundledArtwork = null;

function getBundledArtwork() {
  if (!bundledArtwork) {
    try {
      const xml = readFileSync(new URL('../data/series-sitemap.xml', import.meta.url), 'utf8');
      bundledArtwork = buildArtworkIndex(sitemapEntries(xml));
    } catch {
      bundledArtwork = buildArtworkIndex([]);
    }
  }
  return bundledArtwork;
}

function titleMatchScore(title, candidate) {
  const wantedSlug = titleSlug(title);
  if (!wantedSlug || !candidate.slug) return 0;
  const wantedTokens = tokenize(wantedSlug);
  const wantedSet = new Set(wantedTokens);
  const candidateSet = new Set(candidate.tokens);
  const shared = [...wantedSet].filter((token) => candidateSet.has(token)).length;
  let value = shared / wantedSet.size;

  if (candidate.slug === wantedSlug) value += 0.25;
  else if (candidate.slug.startsWith(`${wantedSlug}-`)) value += 0.08;
  else if (!candidate.slug.startsWith(wantedSlug.slice(0, Math.min(12, wantedSlug.length)))) value -= 0.1;

  const wantedSeason = wantedSet.has('season');
  const candidateSeason = candidateSet.has('season');
  if (!wantedSeason && candidateSeason) value -= 0.38;
  if (wantedSeason && !candidateSeason) value -= 0.25;
  if (wantedSeason && candidateSeason) {
    const wantedNumber = wantedTokens[wantedTokens.indexOf('season') + 1];
    const candidateNumber = candidate.tokens[candidate.tokens.indexOf('season') + 1];
    if (wantedNumber && candidateNumber && wantedNumber !== candidateNumber) value -= 0.55;
  }

  const extra = Math.max(0, candidateSet.size - wantedSet.size);
  value -= Math.min(0.2, extra * 0.025);
  return value;
}

function fromRawEpisode(raw, fallbackNumber = null) {
  const number = numeric(raw.eps) ?? fallbackNumber;
  return {
    slug: safeSlug(raw.episodeId),
    title: cleanEpisodeTitle(raw.title, number),
    number,
    date: raw.date ?? null,
  };
}

function normalizeDownloadGroups(input) {
  if (!input) return [];
  const groups = [];
  if (Array.isArray(input.formats)) {
    for (const format of input.formats) {
      groups.push({
        format: cleanTitle(format.title ?? 'Batch'),
        qualities: (format.qualities ?? []).map((quality) => ({
          quality: quality.title ?? '',
          size: quality.size ?? null,
          urls: (quality.urls ?? [])
            .map((mirror) => ({ name: mirror.title ?? 'Download', url: safeExternalUrl(mirror.url) }))
            .filter((mirror) => mirror.url),
        })),
      });
    }
    return groups;
  }
  if (Array.isArray(input.qualities)) {
    groups.push({
      format: 'Episode download',
      qualities: input.qualities.map((quality) => ({
        quality: quality.title ?? '',
        size: quality.size ?? null,
        urls: (quality.urls ?? [])
          .map((mirror) => ({ name: mirror.title ?? 'Download', url: safeExternalUrl(mirror.url) }))
          .filter((mirror) => mirror.url),
      })),
    });
  }
  return groups;
}

class StaleCache {
  constructor(limit = CACHE_LIMIT) {
    this.limit = limit;
    this.items = new Map();
  }

  get(key) {
    return this.items.get(key);
  }

  set(key, value, ttl) {
    this.items.delete(key);
    this.items.set(key, { value, expiresAt: Date.now() + ttl, storedAt: Date.now() });
    while (this.items.size > this.limit) {
      this.items.delete(this.items.keys().next().value);
    }
  }
}

export class OtakudesuService {
  constructor({
    apiBase = process.env.OTAKUDESU_API_BASE || DEFAULT_API_BASE,
    sitemapUrl = process.env.OTAKUDESU_SITEMAP_URL || DEFAULT_SITEMAP_URL,
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
  } = {}) {
    this.apiBase = apiBase.replace(/\/$/, '');
    this.sitemapUrl = sitemapUrl;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.cache = new StaleCache();
    this.inflight = new Map();
    this.upstreamTimes = [];
    this.gate = Promise.resolve();
    this.artwork = null;
    this.artworkPromise = null;
    this.artworkFailedAt = 0;
  }

  /* ---------- upstream plumbing ---------- */

  async acquireUpstreamSlot() {
    let release;
    const previous = this.gate;
    this.gate = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      const now = this.now();
      this.upstreamTimes = this.upstreamTimes.filter((time) => now - time < 60_000);
      if (this.upstreamTimes.length >= MAX_UPSTREAM_PER_MINUTE) {
        const wait = 60_000 - (now - this.upstreamTimes[0]) + 250;
        await sleep(wait);
      }
      this.upstreamTimes.push(this.now());
    } finally {
      release();
    }
  }

  async upstream(path) {
    await this.acquireUpstreamSlot();
    let response;
    try {
      response = await this.fetchImpl(`${this.apiBase}${path}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ReogNimeWatch/1.0',
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new ApiError(502, 'OTAKUDESU_UNREACHABLE', 'The Otakudesu provider could not be reached.', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    const raw = await response.text();
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ApiError(502, 'OTAKUDESU_BAD_RESPONSE', 'The Otakudesu provider returned an unreadable response.', {
        status: response.status,
      });
    }

    if (!response.ok || body?.status !== 'success' || body?.data === undefined) {
      const message =
        response.status === 403
          ? 'The Otakudesu provider rejected the request. Try again later.'
          : body?.message || `Otakudesu upstream responded with HTTP ${response.status}.`;
      throw new ApiError(response.status === 429 ? 503 : 502, 'OTAKUDESU_UPSTREAM_ERROR', message, {
        upstreamStatus: response.status,
      });
    }
    return body;
  }

  async cached(key, ttl, loader) {
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > this.now()) return existing.value;
    if (this.inflight.has(key)) return this.inflight.get(key);

    const promise = (async () => {
      try {
        const value = await loader();
        this.cache.set(key, value, ttl);
        return value;
      } catch (error) {
        if (existing) {
          // A stale copy beats a broken screen; it also protects the upstream
          // quota when Otakudesu is briefly unavailable.
          this.cache.set(key, existing.value, 30_000);
          return existing.value;
        }
        throw error;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /* ---------- artwork ---------- */

  async getArtworkIndex() {
    if (this.artwork && this.now() - this.artwork.loadedAt < TTL.covers) return this.artwork;
    if (this.artworkPromise) return this.artworkPromise;
    if (this.artworkFailedAt && this.now() - this.artworkFailedAt < 300_000) {
      return this.artwork ?? getBundledArtwork();
    }

    this.artworkPromise = (async () => {
      try {
        const response = await this.fetchImpl(this.sitemapUrl, {
          headers: { Accept: 'application/xml,text/xml', 'User-Agent': 'ReogNimeWatch/1.0' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        const index = buildArtworkIndex(sitemapEntries(xml));
        this.artwork = index;
        this.artworkFailedAt = 0;
        return index;
      } catch {
        this.artworkFailedAt = this.now();
        return this.artwork ?? getBundledArtwork();
      } finally {
        this.artworkPromise = null;
      }
    })();

    return this.artworkPromise;
  }

  resolveArtwork(poster, title, index) {
    if (!poster) return { image: null, sourceUrl: null };
    let host;
    try {
      host = new URL(poster).hostname;
    } catch {
      return { image: null, sourceUrl: null };
    }

    // The old .blog image host is behind a Cloudflare challenge. When an
    // accessible URL is already supplied, keep it untouched.
    if (!host.endsWith('otakudesu.blog')) {
      return { image: poster, sourceUrl: null };
    }

    const filename = decodeURIComponent(poster.split('/').pop()?.split('?')[0] ?? '');
    const stem = filename.replace(/\.[^.]+$/, '').toLowerCase();
    let match = index.byStem.get(stem);
    if (!match) {
      const withoutVariant = stem.replace(/-\d+$/, '');
      if (withoutVariant !== stem) match = index.byStem.get(withoutVariant);
    }

    if (!match && title) {
      let best = null;
      let bestScore = 0;
      for (const candidate of index.entries) {
        const value = titleMatchScore(title, candidate);
        if (value > bestScore) {
          best = candidate;
          bestScore = value;
        }
      }
      // A deliberately conservative threshold: a missing poster is better
      // than confidently showing the wrong anime.
      if (best && bestScore >= 0.82) match = best;
    }

    return { image: match?.image ?? null, sourceUrl: match?.url ?? null };
  }

  /* ---------- normalisers ---------- */

  card(raw, artwork, { status = null } = {}) {
    const title = cleanTitle(raw?.title ?? '');
    const art = this.resolveArtwork(raw?.poster, title, artwork);
    return {
      slug: safeSlug(raw?.animeId ?? raw?.slug ?? ''),
      title,
      poster: art.image,
      sourceUrl: art.sourceUrl,
      status: cleanStatus(raw?.status, status),
      episodes: numeric(raw?.episodes),
      score: score(raw?.score),
      type: raw?.type ?? null,
      season: raw?.season ?? null,
      studios: splitNames(raw?.studios),
      releaseDay: raw?.releaseDay ?? null,
      latestReleaseDate: raw?.latestReleaseDate ?? raw?.lastReleaseDate ?? null,
      genres: normalizeGenres(raw?.genreList),
      synopsis: normalizeSynopsis(raw?.synopsis),
    };
  }

  async mapCards(items, options = {}) {
    const artwork = await this.getArtworkIndex();
    return (Array.isArray(items) ? items : []).map((item) => this.card(item, artwork, options));
  }

  async detail(raw) {
    const artwork = await this.getArtworkIndex();
    const base = this.card(raw, artwork, { status: raw?.status ?? null });
    return {
      ...base,
      japanese: raw?.japanese ? cleanTitle(raw.japanese) : null,
      producers: splitNames(raw?.producers),
      duration: raw?.duration ?? null,
      aired: raw?.aired ?? null,
      studios: splitNames(raw?.studios),
      batch: raw?.batch
        ? {
            slug: safeSlug(raw.batch.batchId),
            title: cleanTitle(raw.batch.title ?? ''),
          }
        : null,
      synopsis: normalizeSynopsis(raw?.synopsis),
      episodeList: (raw?.episodeList ?? []).map((episode, index) =>
        fromRawEpisode(episode, (raw?.episodes ?? 0) - index),
      ),
      recommendations: (raw?.recommendedAnimeList ?? []).map((item) => this.card(item, artwork)),
    };
  }

  /* ---------- raw normalisers (shared by upstream fetches and browser relay) ---------- */

  normalizeHome(payload, artwork) {
    const ongoing = (payload.data?.ongoing?.animeList ?? []).map((item) =>
      this.card(item, artwork, { status: 'Ongoing' }),
    );
    const completed = (payload.data?.completed?.animeList ?? []).map((item) =>
      this.card(item, artwork, { status: 'Completed' }),
    );
    return { ongoing, completed, featured: ongoing[0] ?? completed[0] ?? null };
  }

  normalizeList(payload, kind, artwork) {
    return {
      animeList: (payload.data?.animeList ?? []).map((item) =>
        this.card(item, artwork, { status: kind === 'completed' ? 'Completed' : 'Ongoing' }),
      ),
      pagination: payload.pagination ?? null,
      kind,
    };
  }

  normalizeSchedule(payload, artwork) {
    return (payload.data ?? []).map((day) => ({
      day: day.day,
      animeList: (day.anime_list ?? day.animeList ?? []).map((item) => {
        const art = this.resolveArtwork(item.poster, cleanTitle(item.title), artwork);
        return {
          slug: safeSlug(item.slug ?? item.animeId),
          title: cleanTitle(item.title),
          poster: art.image,
          sourceUrl: art.sourceUrl,
        };
      }),
    }));
  }

  normalizeGenres(payload) {
    return (payload.data?.genreList ?? []).map((genre) => ({
      name: cleanTitle(genre.title),
      slug: genre.genreId,
    }));
  }

  normalizeGenre(payload, slug, artwork) {
    return {
      slug,
      animeList: (payload.data?.animeList ?? []).map((item) => this.card(item, artwork)),
      pagination: payload.pagination ?? null,
    };
  }

  normalizeSearch(payload, query, artwork) {
    return {
      query,
      animeList: (payload.data?.animeList ?? []).map((item) => this.card(item, artwork)),
    };
  }

  normalizeEpisode(raw, slug) {
    const servers = (raw.server?.qualities ?? []).map((quality) => ({
      quality: quality.title ?? '',
      servers: (quality.serverList ?? []).map((server) => ({
        name: (server.title ?? '').trim(),
        id: server.serverId,
      })),
    }));
    return {
      slug,
      title: cleanTitle(raw.title ?? ''),
      animeSlug: safeSlug(raw.animeId) || slug,
      releaseTime: raw.releaseTime ?? null,
      defaultStreamingUrl: safeExternalUrl(raw.defaultStreamingUrl),
      previous: raw.prevEpisode
        ? { slug: safeSlug(raw.prevEpisode.episodeId), label: 'Previous' }
        : null,
      next: raw.nextEpisode ? { slug: safeSlug(raw.nextEpisode.episodeId), label: 'Next' } : null,
      servers,
      downloads: normalizeDownloadGroups(raw.downloadUrl),
      info: {
        credit: raw.info?.credit ?? null,
        encoder: raw.info?.encoder ?? null,
        duration: raw.info?.duration ?? null,
        type: raw.info?.type ?? null,
        genres: normalizeGenres(raw.info?.genreList),
      },
      episodes: (raw.info?.episodeList ?? []).map((episode, index) => fromRawEpisode(episode, index)),
    };
  }

  normalizeBatch(payload, artwork) {
    const raw = payload.data ?? {};
    const card = this.card(raw, artwork);
    return {
      ...card,
      title: cleanTitle(raw.title ?? card.title),
      downloads: normalizeDownloadGroups(raw.downloadUrl),
    };
  }

  normalizeServer(payload) {
    const url = safeExternalUrl(payload.data?.url);
    if (!url) throw new ApiError(502, 'NO_STREAM', 'That streaming server did not return a playable URL.');
    return { url };
  }

  normalizeUnlimited(payload) {
    return (payload.data?.list ?? []).map((group) => ({
      letter: group.startWith,
      animeList: (group.animeList ?? []).map((item) => ({
        slug: safeSlug(item.animeId),
        title: cleanTitle(item.title),
      })),
    }));
  }

  async relay(endpoint, payload, params = {}) {
    if (!payload || payload.status !== 'success' || payload.data === undefined) {
      throw new ApiError(502, 'OTAKUDESU_BAD_RESPONSE', 'The browser relay did not receive a valid Otakudesu payload.');
    }

    switch (endpoint) {
      case 'home':
        return this.normalizeHome(payload, await this.getArtworkIndex());
      case 'ongoing':
      case 'completed':
        return this.normalizeList(payload, endpoint, await this.getArtworkIndex());
      case 'schedule':
        return this.normalizeSchedule(payload, await this.getArtworkIndex());
      case 'genres':
        return this.normalizeGenres(payload);
      case 'genre': {
        const slug = safeSlug(params.slug);
        if (!slug) throw new ApiError(400, 'INVALID_SLUG', 'A valid genre slug is required.');
        return this.normalizeGenre(payload, slug, await this.getArtworkIndex());
      }
      case 'search': {
        const query = String(params.query ?? '').trim();
        if (!query) throw new ApiError(400, 'MISSING_QUERY', 'A search query is required.');
        return this.normalizeSearch(payload, query, await this.getArtworkIndex());
      }
      case 'anime': {
        if (!payload.data || typeof payload.data !== 'object') {
          throw new ApiError(502, 'OTAKUDESU_BAD_RESPONSE', 'The browser relay returned an invalid anime payload.');
        }
        return this.detail(payload.data);
      }
      case 'episode': {
        const slug = safeSlug(params.slug);
        if (!slug) throw new ApiError(400, 'INVALID_SLUG', 'A valid episode slug is required.');
        return this.normalizeEpisode(payload.data ?? {}, slug);
      }
      case 'batch':
        return this.normalizeBatch(payload, await this.getArtworkIndex());
      case 'server':
        return this.normalizeServer(payload);
      case 'unlimited':
        return this.normalizeUnlimited(payload);
      default:
        throw new ApiError(400, 'INVALID_RELAY_ENDPOINT', 'That browser relay endpoint is not supported.');
    }
  }

  /* ---------- public endpoints ---------- */

  async getHome() {
    return this.cached('home', TTL.home, async () => {
      const [payload, artwork] = await Promise.all([this.upstream('/home'), this.getArtworkIndex()]);
      return this.normalizeHome(payload, artwork);
    });
  }

  async list(kind, page = 1) {
    const path = kind === 'completed' ? '/complete-anime' : '/ongoing-anime';
    const key = `${kind}:${page}`;
    return this.cached(key, TTL[kind], async () => {
      const [payload, artwork] = await Promise.all([
        this.upstream(`${path}?page=${encodeURIComponent(page)}`),
        this.getArtworkIndex(),
      ]);
      return this.normalizeList(payload, kind, artwork);
    });
  }

  async getSchedule() {
    return this.cached('schedule', TTL.schedule, async () => {
      const [payload, artwork] = await Promise.all([this.upstream('/schedule'), this.getArtworkIndex()]);
      return this.normalizeSchedule(payload, artwork);
    });
  }

  async getGenres() {
    return this.cached('genres', TTL.genres, async () => {
      const payload = await this.upstream('/genre');
      return this.normalizeGenres(payload);
    });
  }

  async getGenre(slug, page = 1) {
    const safe = safeSlug(slug);
    if (!safe) throw new ApiError(400, 'INVALID_SLUG', 'A valid genre slug is required.');
    return this.cached(`genre:${safe}:${page}`, TTL.genre, async () => {
      const [payload, artwork] = await Promise.all([
        this.upstream(`/genre/${encodeURIComponent(safe)}?page=${encodeURIComponent(page)}`),
        this.getArtworkIndex(),
      ]);
      return this.normalizeGenre(payload, safe, artwork);
    });
  }

  async search(query) {
    const text = String(query ?? '').trim();
    if (!text) throw new ApiError(400, 'MISSING_QUERY', 'A search query is required.');
    if (text.length > 100) throw new ApiError(400, 'QUERY_TOO_LONG', 'Search queries are limited to 100 characters.');
    if (/[\u0000-\u001f\u007f]/.test(text)) throw new ApiError(400, 'INVALID_QUERY', 'Search queries contain unsupported control characters.');
    return this.cached(`search:${text.toLowerCase()}`, TTL.search, async () => {
      const [payload, artwork] = await Promise.all([
        this.upstream(`/search/${encodeURIComponent(text)}`),
        this.getArtworkIndex(),
      ]);
      return this.normalizeSearch(payload, text, artwork);
    });
  }

  async getAnime(slug) {
    const safe = safeSlug(slug);
    if (!safe) throw new ApiError(400, 'INVALID_SLUG', 'A valid anime slug is required.');
    return this.cached(`anime:${safe}`, TTL.anime, async () => {
      const payload = await this.upstream(`/anime/${encodeURIComponent(safe)}`);
      if (!payload.data) throw new ApiError(404, 'ANIME_NOT_FOUND', 'That anime could not be found.');
      return this.detail(payload.data);
    });
  }

  async getEpisode(slug) {
    const safe = safeSlug(slug);
    if (!safe) throw new ApiError(400, 'INVALID_SLUG', 'A valid episode slug is required.');
    return this.cached(`episode:${safe}`, TTL.episode, async () => {
      const payload = await this.upstream(`/episode/${encodeURIComponent(safe)}`);
      return this.normalizeEpisode(payload.data ?? {}, safe);
    });
  }

  async getBatch(slug) {
    const safe = safeSlug(slug);
    if (!safe) throw new ApiError(400, 'INVALID_SLUG', 'A valid batch slug is required.');
    return this.cached(`batch:${safe}`, TTL.batch, async () => {
      const [payload, artwork] = await Promise.all([
        this.upstream(`/batch/${encodeURIComponent(safe)}`),
        this.getArtworkIndex(),
      ]);
      return this.normalizeBatch(payload, artwork);
    });
  }

  async getServer(serverId) {
    const safe = safeSlug(serverId);
    if (!safe) throw new ApiError(400, 'INVALID_SERVER', 'A valid streaming server id is required.');
    return this.cached(`server:${safe}`, TTL.server, async () => {
      const payload = await this.upstream(`/server/${encodeURIComponent(safe)}`);
      return this.normalizeServer(payload);
    });
  }

  async getUnlimited() {
    return this.cached('unlimited', TTL.unlimited, async () => {
      const payload = await this.upstream('/unlimited');
      return this.normalizeUnlimited(payload);
    });
  }

  status() {
    return {
      upstream: this.apiBase,
      artworkIndex: this.artwork?.entries.length ?? 0,
      cacheEntries: this.cache.items.size,
      upstreamRequestsLastMinute: this.upstreamTimes.filter((time) => this.now() - time < 60_000).length,
      upstreamLimitPerMinute: MAX_UPSTREAM_PER_MINUTE,
    };
  }
}

export const otakudesuService = new OtakudesuService();
