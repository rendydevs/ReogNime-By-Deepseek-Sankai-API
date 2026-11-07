#!/usr/bin/env node
/**
 * ReogNime catalog seeder.
 * Pulls a curated, non-adult anime catalog from the public AniList GraphQL API,
 * downloads optimized artwork, and writes server/data/anime.json.
 *
 * Usage: node scripts/seed-catalog.mjs [--force]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'server', 'data');
const MEDIA = {
  covers: path.join(ROOT, 'public', 'media', 'covers'),
  banners: path.join(ROOT, 'public', 'media', 'banners'),
  characters: path.join(ROOT, 'public', 'media', 'characters'),
};
const FORCE = process.argv.includes('--force');

const IDS = [
  154587, 161645, 195516, 120377, 195539, 16498, 5114, 11061, 1535, 9253,
  1, 30, 199, 164, 20954, 21519, 106286, 142770, 437, 1943,
  47, 43, 19, 101348, 21507, 21087, 113415, 101922, 127230, 171627,
  21827, 20665, 4181, 125367, 124194, 98478, 130003, 140960, 150672, 171018,
  151807, 153518, 20464, 20607, 174788,
];

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large color }
  bannerImage
  averageScore meanScore popularity favourites
  episodes duration chapters volumes
  status format source season seasonYear
  startDate { year month day }
  endDate { year month day }
  nextAiringEpisode { airingAt episode timeUntilAiring }
  genres
  studios(isMain: true) { nodes { name } }
  trailer { id site }
  characters(perPage: 6, sort: [ROLE, RELEVANCE]) {
    edges {
      role
      node { id name { full } image { large } }
    }
  }
`;

const QUERY = `query($ids: [Int]) {
  Page(page: 1, perPage: 50) {
    media(type: ANIME, isAdult: false, id_in: $ids) { ${MEDIA_FIELDS} }
  }
}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function gqlWithRetry(ids, attempt = 0) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { ids } }),
  });

  if (res.status === 429) {
    if (attempt >= 5) throw new Error('AniList rate limit persisted after 5 retries');
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    const wait = Number.isFinite(reset) && reset > Date.now() ? reset - Date.now() + 500 : 60_000;
    console.log(`  rate limited — waiting ${Math.ceil(wait / 1000)}s`);
    await sleep(wait);
    return gqlWithRetry(ids, attempt + 1);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`AniList request failed (${res.status}): ${JSON.stringify(json.errors ?? json).slice(0, 500)}`);
  }
  return json.data.Page.media;
}

function text(value = '') {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function dateString(date) {
  if (!date?.year) return null;
  return [date.year, String(date.month ?? 1).padStart(2, '0'), String(date.day ?? 1).padStart(2, '0')].join('-');
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

async function download(url, destination, { width, height, fit = 'inside', quality = 82 } = {}) {
  if (!url) return false;
  if (!FORCE) {
    try {
      await fs.access(destination);
      return true;
    } catch {}
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ReogNimeCatalog/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    let pipeline = sharp(buffer).rotate();
    if (width || height) {
      pipeline = pipeline.resize({ width, height, fit, withoutEnlargement: true });
    }
    await pipeline.webp({ quality, effort: 4 }).toFile(destination);
    return true;
  } catch (error) {
    console.warn(`  ! asset failed ${path.basename(destination)}: ${error.message}`);
    return false;
  }
}

async function pool(items, concurrency, task) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main() {
  await Promise.all([fs.mkdir(DATA_DIR, { recursive: true }), ...Object.values(MEDIA).map((p) => fs.mkdir(p, { recursive: true }))]);

  console.log(`Fetching ${IDS.length} curated titles from AniList…`);
  const batches = [];
  for (let i = 0; i < IDS.length; i += 15) batches.push(IDS.slice(i, i + 15));
  const media = [];
  for (const [index, batch] of batches.entries()) {
    console.log(`  batch ${index + 1}/${batches.length} (${batch.length} titles)`);
    media.push(...(await gqlWithRetry(batch)));
    if (index < batches.length - 1) await sleep(2500);
  }

  // Preserve the curated order; AniList does not guarantee id_in order.
  media.sort((a, b) => IDS.indexOf(a.id) - IDS.indexOf(b.id));
  console.log(`Received ${media.length}/${IDS.length} titles. Downloading artwork…`);

  const anime = [];
  for (const [index, item] of media.entries()) {
    const title = text(item.title.english || item.title.romaji || item.title.native);
    const originalTitle = text(item.title.romaji || '');
    const nativeTitle = text(item.title.native || '');
    const coverFile = `${item.id}.webp`;
    const bannerFile = `${item.id}.webp`;

    const cover = await download(item.coverImage?.extraLarge || item.coverImage?.large, path.join(MEDIA.covers, coverFile), {
      width: 720,
      height: 1080,
      fit: 'inside',
      quality: 84,
    });
    const banner = await download(item.bannerImage, path.join(MEDIA.banners, bannerFile), {
      width: 1600,
      fit: 'inside',
      quality: 80,
    });

    const characters = [];
    for (const edge of item.characters?.edges ?? []) {
      if (!edge?.node?.name?.full) continue;
      const characterFile = `${item.id}-${edge.node.id}.webp`;
      const downloaded = await download(edge.node.image?.large, path.join(MEDIA.characters, characterFile), {
        width: 180,
        height: 240,
        fit: 'cover',
        quality: 78,
      });
      characters.push({
        id: edge.node.id,
        name: text(edge.node.name.full),
        role: edge.role === 'MAIN' ? 'Main' : 'Supporting',
        image: downloaded ? `/media/characters/${characterFile}` : null,
      });
    }

    anime.push({
      id: item.id,
      slug: slugify(title),
      title,
      originalTitle,
      nativeTitle,
      synopsis: text(item.description || 'No synopsis available.'),
      cover: cover ? `/media/covers/${coverFile}` : null,
      banner: banner ? `/media/banners/${bannerFile}` : null,
      accent: item.coverImage?.color || '#d8d3c7',
      score: item.averageScore ?? null,
      meanScore: item.meanScore ?? null,
      popularity: item.popularity ?? 0,
      favorites: item.favourites ?? 0,
      episodes: item.episodes ?? null,
      duration: item.duration ?? null,
      chapters: item.chapters ?? null,
      volumes: item.volumes ?? null,
      status: item.status ?? 'UNKNOWN',
      format: item.format ?? 'UNKNOWN',
      source: item.source ?? 'ORIGINAL',
      season: item.season ?? null,
      seasonYear: item.seasonYear ?? null,
      startDate: dateString(item.startDate),
      endDate: dateString(item.endDate),
      nextAiringEpisode: item.nextAiringEpisode
        ? {
            episode: item.nextAiringEpisode.episode,
            airingAt: new Date(item.nextAiringEpisode.airingAt * 1000).toISOString(),
          }
        : null,
      genres: (item.genres ?? []).slice(0, 6),
      studios: (item.studios?.nodes ?? []).map((studio) => studio.name).slice(0, 3),
      trailer: item.trailer?.site === 'youtube' ? { id: item.trailer.id, site: 'youtube' } : null,
      characters,
    });

    console.log(`  [${index + 1}/${media.length}] ${title}`);
  }

  const payload = {
    meta: {
      source: 'AniList',
      sourceUrl: 'https://anilist.co',
      generatedAt: new Date().toISOString(),
      count: anime.length,
      note: 'Demo catalog. Anime metadata and artwork belong to their respective rights holders.',
    },
    anime,
  };
  await fs.writeFile(path.join(DATA_DIR, 'anime.json'), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${anime.length} titles to server/data/anime.json.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
