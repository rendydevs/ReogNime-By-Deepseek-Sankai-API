import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from './app.js';

process.env.NODE_ENV = 'test';
const testAdminPassword = randomBytes(18).toString('base64url');
const testAdminSalt = randomBytes(16).toString('hex');
process.env.ADMIN_PASSWORD_HASH = `${testAdminSalt}:${scryptSync(testAdminPassword, testAdminSalt, 64).toString('hex')}`;

let server;
let base;
let tempDir;

before(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'reognime-test-'));
  const app = await createApp({
    libraryFile: path.join(tempDir, 'library.json'),
    messagesFile: path.join(tempDir, 'messages.json'),
    rateLimitEnabled: false,
  });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(tempDir, { recursive: true, force: true });
});

async function get(pathname) {
  const response = await fetch(`${base}${pathname}`);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test('health and metadata endpoints respond', async () => {
  const health = await get('/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.data.status, 'ok');
  assert.equal(health.body.data.catalog.titles, 45);

  const meta = await get('/api/v1/meta');
  assert.equal(meta.response.status, 200);
  assert.equal(meta.body.data.api.version, 'v1');
  assert.ok(meta.body.data.genres > 10);
});

test('OpenAPI includes the Otakudesu watch layer', async () => {
  const { response, body } = await get('/api/v1/openapi.json');
  assert.equal(response.status, 200);
  assert.equal(body.openapi, '3.1.0');
  assert.ok(body.paths['/otakudesu/home']);
  assert.ok(body.paths['/otakudesu/episode/{slug}']);
  assert.ok(body.tags.some((tag) => tag.name === 'Otakudesu'));
});

test('home payload has editorial sections and stats', async () => {
  const { response, body } = await get('/api/v1/home');
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body.data).sort(), [
    'genres', 'newReleases', 'season', 'spotlight', 'stats', 'topRated', 'trending',
  ]);
  assert.ok(body.data.spotlight.length >= 3);
  assert.ok(body.data.spotlight[0].banner);
  assert.equal(body.data.stats.titles, 45);
  assert.ok(body.data.genres.length >= 6);
});

test('anime search, filters, and pagination work together', async () => {
  const mood = await get('/api/v1/anime?q=romance');
  assert.equal(mood.response.status, 200);
  assert.ok(mood.body.data.every((anime) => anime.genres.includes('Romance')));

  const search = await get('/api/v1/anime?q=frieren');
  assert.equal(search.response.status, 200);
  assert.equal(search.body.data.length, 1);
  assert.equal(search.body.data[0].id, 154587);

  const filtered = await get('/api/v1/anime?genre=Drama&sort=score&limit=5');
  assert.equal(filtered.response.status, 200);
  assert.ok(filtered.body.data.length <= 5);
  assert.ok(filtered.body.data.every((anime) => anime.genres.includes('Drama')));
  assert.ok(filtered.body.meta.total > 5);

  const paged = await get('/api/v1/anime?limit=3&page=2');
  assert.equal(paged.body.data.length, 3);
  assert.equal(paged.body.meta.page, 2);
  assert.equal(paged.body.meta.limit, 3);
  assert.equal(paged.body.meta.hasPreviousPage, true);

  const invalid = await get('/api/v1/anime?limit=500');
  assert.equal(invalid.response.status, 422);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
});

test('detail, episodes, suggestions, genres, and random endpoints work', async () => {
  const detail = await get('/api/v1/anime/154587');
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.data.title, 'Frieren: Beyond Journey’s End');
  assert.ok(detail.body.data.characters.length > 0);
  assert.ok(detail.body.data.related.length > 0);
  assert.equal(detail.body.data.episodeTracker.totalEpisodes, 28);

  const episodes = await get('/api/v1/anime/154587/episodes?limit=5');
  assert.equal(episodes.response.status, 200);
  assert.equal(episodes.body.data.length, 5);
  assert.equal(episodes.body.data[0].number, 1);
  assert.equal(episodes.body.pagination.total, 28);

  const suggestions = await get('/api/v1/search/suggestions?q=monster');
  assert.equal(suggestions.response.status, 200);
  assert.ok(suggestions.body.data.length > 0);

  const genres = await get('/api/v1/genres');
  assert.ok(genres.body.data.some((genre) => genre.name === 'Drama'));

  const random = await get('/api/v1/random?genre=Romance');
  assert.equal(random.response.status, 200);
  assert.ok(random.body.data.genres.includes('Romance'));

  const missing = await get('/api/v1/anime/999999');
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');
});


test('chat queue accepts a message and admin queue is protected', async () => {
  const sent = await fetch(`${base}/api/v1/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Video tidak bisa diputar di mobile.', page: '/watch/episode/vtfc-episode-6-sub-indo' }),
  });
  assert.equal(sent.status, 201);
  const sentBody = await sent.json();
  assert.ok(sentBody.data.id);

  const denied = await fetch(`${base}/api/v1/admin/messages`);
  assert.equal(denied.status, 401);
  assert.equal((await denied.json()).error.code, 'ADMIN_UNAUTHORIZED');

  const wrong = await fetch(`${base}/api/v1/admin/messages`, {
    headers: { Authorization: `Basic ${Buffer.from('admin:wrong-password').toString('base64')}` },
  });
  assert.equal(wrong.status, 401);

  const auth = `Basic ${Buffer.from(`admin:${testAdminPassword}`).toString('base64')}`;
  const queue = await fetch(`${base}/api/v1/admin/messages`, { headers: { Authorization: auth } });
  assert.equal(queue.status, 200);
  const queueBody = await queue.json();
  assert.equal(queueBody.data.length, 1);
  assert.equal(queueBody.data[0].status, 'new');
  assert.equal(queueBody.data[0].page, '/watch/episode/vtfc-episode-6-sub-indo');
  assert.equal(queueBody.meta.stats.new, 1);

  const patched = await fetch(`${base}/api/v1/admin/messages/${sentBody.data.id}`, {
    method: 'PATCH',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).data.status, 'resolved');

  const removed = await fetch(`${base}/api/v1/admin/messages/${sentBody.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: auth },
  });
  assert.equal(removed.status, 204);
  const empty = await fetch(`${base}/api/v1/admin/messages`, { headers: { Authorization: auth } });
  assert.equal((await empty.json()).data.length, 0);
});

test('library CRUD persists and computes stats', async () => {
  const empty = await get('/api/v1/library');
  assert.equal(empty.response.status, 200);
  assert.equal(empty.body.data.length, 0);
  assert.equal(empty.body.meta.stats.total, 0);

  const createResponse = await fetch(`${base}/api/v1/library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animeId: 154587, status: 'WATCHING', score: 9, progress: 4, notes: 'Quiet fantasy.', favorite: true }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.data.anime.title, 'Frieren: Beyond Journey’s End');
  assert.equal(created.data.progress, 4);

  const duplicate = await fetch(`${base}/api/v1/library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animeId: 154587 }),
  });
  assert.equal(duplicate.status, 409);

  const patchResponse = await fetch(`${base}/api/v1/library/154587`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED', notes: 'Finished.' }),
  });
  assert.equal(patchResponse.status, 200);
  const patched = await patchResponse.json();
  assert.equal(patched.data.status, 'COMPLETED');
  assert.equal(patched.data.progress, 28);

  const library = await get('/api/v1/library');
  assert.equal(library.body.data.length, 1);
  assert.equal(library.body.meta.stats.episodesWatched, 28);
  assert.equal(library.body.meta.stats.meanScore, 9);
  assert.equal(library.body.meta.stats.favorites, 1);
  assert.equal(library.body.meta.stats.statusCounts.COMPLETED, 1);

  const stats = await get('/api/v1/library/stats');
  assert.equal(stats.body.data.completionRate, 100);

  const exported = await fetch(`${base}/api/v1/library/export`);
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get('content-disposition'), /reognime-library\.json/);
  const exportBody = await exported.json();
  assert.equal(exportBody.entries[0].animeId, 154587);

  const persisted = JSON.parse(await readFile(path.join(tempDir, 'library.json'), 'utf8'));
  assert.equal(persisted.entries[0].status, 'COMPLETED');

  const deleted = await fetch(`${base}/api/v1/library/154587`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  const deletedAgain = await fetch(`${base}/api/v1/library/154587`, { method: 'DELETE' });
  assert.equal(deletedAgain.status, 404);
});

test('library validation rejects bad values and unknown titles', async () => {
  const invalidScore = await fetch(`${base}/api/v1/library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animeId: 154587, score: 12 }),
  });
  assert.equal(invalidScore.status, 422);

  const unknown = await fetch(`${base}/api/v1/library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animeId: 999999 }),
  });
  assert.equal(unknown.status, 404);

  const invalidProgress = await fetch(`${base}/api/v1/library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animeId: 154587, progress: 99 }),
  });
  assert.equal(invalidProgress.status, 422);
});

test('Otakudesu routes expose normalized watch data', async () => {
  const card = {
    slug: 'sousou-frieren-sub-indo',
    title: 'Sousou no Frieren',
    poster: 'https://i0.wp.com/otakudesu.or.at/wp-content/uploads/frieren.jpg',
    sourceUrl: 'https://otakudesu.or.at/series/sousou-no-frieren/',
    status: 'Completed',
    episodes: 28,
    score: 9.39,
    type: 'TV',
    season: null,
    studios: ['Madhouse'],
    releaseDay: null,
    latestReleaseDate: null,
    genres: [{ name: 'Fantasy', slug: 'fantasy' }],
    synopsis: ['An elf and her party.'],
  };
  const pagination = { currentPage: 1, hasPrevPage: false, prevPage: null, hasNextPage: true, nextPage: 2, totalPages: 2 };
  const stub = {
    getHome: async () => ({ ongoing: [card], completed: [card], featured: card }),
    list: async (kind) => ({ animeList: [card], pagination, kind }),
    getSchedule: async () => [{ day: 'Senin', animeList: [{ slug: card.slug, title: card.title, poster: card.poster, sourceUrl: card.sourceUrl }] }],
    getGenres: async () => [{ name: 'Fantasy', slug: 'fantasy' }],
    getGenre: async (slug) => ({ slug, animeList: [card], pagination }),
    search: async (query) => ({ query, animeList: [card] }),
    getAnime: async () => ({ ...card, japanese: '葬送のフリーレン', producers: [], duration: '24 Menit', aired: 'Sep 29, 2023', batch: null, episodeList: [], recommendations: [] }),
    getEpisode: async () => ({ slug: 'snf-episode-1-sub-indo', title: 'Sousou no Frieren Episode 1', animeSlug: card.slug, servers: [{ quality: '720p', servers: [{ name: 'server', id: 'abc' }] }], downloads: [], info: { genres: [] }, episodes: [], previous: null, next: null }),
    getBatch: async () => ({ ...card, downloads: [] }),
    getServer: async (id) => ({ url: `https://example.com/${id}` }),
    getUnlimited: async () => [{ letter: 'S', animeList: [{ slug: card.slug, title: card.title }] }],
    status: () => ({ upstream: 'https://example.com', cacheEntries: 2, artworkIndex: 10, upstreamRequestsLastMinute: 0, upstreamLimitPerMinute: 30 }),
  };

  const app = await createApp({
    libraryFile: path.join(tempDir, 'otaku-library.json'),
    rateLimitEnabled: false,
    otakudesu: stub,
  });
  const otakuServer = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const otakuBase = `http://127.0.0.1:${otakuServer.address().port}`;
  const request = async (pathname) => {
    const response = await fetch(`${otakuBase}${pathname}`);
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
  };

  try {
    const home = await request('/api/v1/otakudesu/home');
    assert.equal(home.response.status, 200);
    assert.equal(home.body.data.featured.slug, card.slug);
    assert.equal(home.body.meta.source, 'Otakudesu');

    const ongoing = await request('/api/v1/otakudesu/ongoing?page=1');
    assert.equal(ongoing.response.status, 200);
    assert.equal(ongoing.body.data[0].title, card.title);
    assert.equal(ongoing.body.meta.pagination.nextPage, 2);

    const completed = await request('/api/v1/otakudesu/completed');
    assert.equal(completed.response.status, 200);

    const schedule = await request('/api/v1/otakudesu/schedule');
    assert.equal(schedule.response.status, 200);
    assert.equal(schedule.body.data[0].day, 'Senin');

    const genres = await request('/api/v1/otakudesu/genres');
    assert.equal(genres.body.data[0].slug, 'fantasy');

    const genre = await request('/api/v1/otakudesu/genres/fantasy?page=1');
    assert.equal(genre.body.data.length, 1);

    const search = await request('/api/v1/otakudesu/search?q=frieren');
    assert.equal(search.response.status, 200);
    assert.equal(search.body.meta.query, 'frieren');

    const emptySearch = await request('/api/v1/otakudesu/search');
    assert.equal(emptySearch.response.status, 400);
    assert.equal(emptySearch.body.error.code, 'MISSING_QUERY');

    const detail = await request('/api/v1/otakudesu/anime/sousou-frieren-sub-indo');
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.data.japanese, '葬送のフリーレン');

    const episode = await request('/api/v1/otakudesu/episode/snf-episode-1-sub-indo');
    assert.equal(episode.response.status, 200);
    assert.equal(episode.body.data.servers[0].quality, '720p');

    const batch = await request('/api/v1/otakudesu/batch/snf-batch-sub-indo');
    assert.equal(batch.response.status, 200);

    const server = await request('/api/v1/otakudesu/server/abc');
    assert.equal(server.body.data.url, 'https://example.com/abc');

    const unlimited = await request('/api/v1/otakudesu/unlimited');
    assert.equal(unlimited.body.data[0].letter, 'S');

    const status = await request('/api/v1/otakudesu/status');
    assert.equal(status.body.data.upstreamLimitPerMinute, 30);
  } finally {
    await new Promise((resolve) => otakuServer.close(resolve));
  }
});
