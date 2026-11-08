import express from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { OTAKUDESU_SOURCE } from '../lib/otakudesu.js';

const pageSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().min(1).max(500).default(1),
);

function pageFrom(query) {
  const parsed = pageSchema.safeParse(query?.page);
  if (!parsed.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'page must be a whole number between 1 and 500.');
  }
  return parsed.data;
}

const meta = (extra = {}) => ({
  source: OTAKUDESU_SOURCE.name,
  provider: OTAKUDESU_SOURCE.provider,
  upstream: OTAKUDESU_SOURCE.apiUrl,
  ...extra,
});

const relaySchema = z.object({
  endpoint: z.enum([
    'home',
    'ongoing',
    'completed',
    'schedule',
    'genres',
    'genre',
    'search',
    'anime',
    'episode',
    'batch',
    'server',
    'unlimited',
  ]),
  payload: z.object({ status: z.string().optional(), data: z.unknown() }).passthrough(),
  params: z
    .object({
      slug: z.string().trim().max(220).optional(),
      query: z.string().trim().max(100).optional(),
    })
    .optional(),
});

export function createOtakudesuRouter(service) {
  const router = express.Router();
  if (!service) throw new Error('createOtakudesuRouter requires an Otakudesu service.');

  router.get('/home', async (req, res) => {
    const data = await service.getHome();
    res.set('Cache-Control', 'public, max-age=45, stale-while-revalidate=90');
    res.json({ data, meta: meta() });
  });

  router.get('/ongoing', async (req, res) => {
    const page = pageFrom(req.query);
    const data = await service.list('ongoing', page);
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json({ data: data.animeList, meta: meta({ pagination: data.pagination, section: 'ongoing' }) });
  });

  router.get('/completed', async (req, res) => {
    const page = pageFrom(req.query);
    const data = await service.list('completed', page);
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json({ data: data.animeList, meta: meta({ pagination: data.pagination, section: 'completed' }) });
  });

  router.get('/schedule', async (req, res) => {
    const data = await service.getSchedule();
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ data, meta: meta() });
  });

  router.get('/genres', async (req, res) => {
    const data = await service.getGenres();
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ data, meta: meta() });
  });

  router.get('/genres/:slug', async (req, res) => {
    const page = pageFrom(req.query);
    const data = await service.getGenre(req.params.slug, page);
    res.set('Cache-Control', 'public, max-age=90, stale-while-revalidate=180');
    res.json({ data: data.animeList, meta: meta({ pagination: data.pagination, genre: data.slug }) });
  });

  router.get('/search', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) throw new ApiError(400, 'MISSING_QUERY', 'Add ?q= to search the Otakudesu catalog.');
    const data = await service.search(query);
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json({ data: data.animeList, meta: meta({ query: data.query }) });
  });

  router.get('/anime/:slug', async (req, res) => {
    const data = await service.getAnime(req.params.slug);
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.json({ data, meta: meta() });
  });

  router.get('/episode/:slug', async (req, res) => {
    const data = await service.getEpisode(req.params.slug);
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.json({ data, meta: meta() });
  });

  router.get('/batch/:slug', async (req, res) => {
    const data = await service.getBatch(req.params.slug);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ data, meta: meta() });
  });

  router.get('/server/:serverId', async (req, res) => {
    const data = await service.getServer(req.params.serverId);
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.json({ data, meta: meta() });
  });

  router.get('/unlimited', async (req, res) => {
    const data = await service.getUnlimited();
    res.set('Cache-Control', 'public, max-age=1800');
    res.json({ data, meta: meta() });
  });


  router.post('/relay', async (req, res) => {
    const parsed = relaySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid browser relay payload.', parsed.error.flatten());
    }
    const { endpoint, payload, params = {} } = parsed.data;
    const result = await service.relay(endpoint, payload, params);
    const extra = {};
    let data = result;
    if (endpoint === 'ongoing' || endpoint === 'completed') {
      data = result.animeList;
      extra.pagination = result.pagination;
      extra.section = result.kind;
    } else if (endpoint === 'genre') {
      data = result.animeList;
      extra.pagination = result.pagination;
      extra.genre = result.slug;
    } else if (endpoint === 'search') {
      data = result.animeList;
      extra.query = result.query;
    }
    res.set('Cache-Control', 'no-store');
    res.json({ data, meta: meta(extra) });
  });

  router.get('/status', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ data: { ...service.status(), source: OTAKUDESU_SOURCE } });
  });

  return router;
}
