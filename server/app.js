import 'dotenv/config';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  getAnimeDetail,
  getCatalogMeta,
  getEpisodes,
  getFilterOptions,
  getGenres,
  getHome,
  getRandom,
  getRelated,
  getSuggestions,
  listAnime,
  parseGenres,
  toSummary,
} from './lib/catalog.js';
import { ADMIN_USERNAME, requireAdmin } from './lib/adminAuth.js';
import { ApiError, notFound } from './lib/errors.js';
import { LIBRARY_STATUSES, LibraryStore } from './lib/library.js';
import { THREAD_STATUSES, ThreadStore } from './lib/threads.js';
import { getLibraryStats } from './lib/libraryStats.js';
import { AniListArtwork } from './lib/anilistArtwork.js';
import { OtakudesuService } from './lib/otakudesu.js';
import { openApiDocument } from './openapi.js';
import { createOtakudesuRouter } from './routes/otakudesu.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const numberFromQuery = (fallback, min, max) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().min(min).max(max).default(fallback),
  );

const enumFromQuery = (values) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.enum(values).optional(),
  );

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  genre: z.string().max(200).optional(),
  year: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(1900).max(2100).optional()),
  season: enumFromQuery(['WINTER', 'SPRING', 'SUMMER', 'FALL']),
  format: enumFromQuery(['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC']),
  status: enumFromQuery(['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS']),
  minScore: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().min(0).max(100).optional()),
  sort: z.enum(['popularity', 'score', 'newest', 'favorites', 'title']).optional().default('popularity'),
  page: numberFromQuery(1, 1, 10_000),
  limit: numberFromQuery(20, 1, 50),
});

const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  limit: numberFromQuery(6, 1, 10),
});

const episodesQuerySchema = z.object({
  page: numberFromQuery(1, 1, 10_000),
  limit: numberFromQuery(12, 1, 100),
});

const libraryCreateSchema = z.object({
  animeId: z.coerce.number().int().positive(),
  status: z.enum(LIBRARY_STATUSES).optional().default('PLANNING'),
  score: z.number().min(0).max(10).multipleOf(0.5).nullable().optional(),
  progress: z.number().int().min(0).max(10_000).optional(),
  notes: z.string().max(500).optional().default(''),
  favorite: z.boolean().optional().default(false),
});

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  page: z.string().trim().max(200).optional().default('/'),
});

const threadMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

const adminThreadQuerySchema = z.object({
  status: z.enum(['all', ...THREAD_STATUSES]).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

const adminThreadPatchSchema = z.object({
  status: z.enum(THREAD_STATUSES),
});

const libraryPatchSchema = z
  .object({
    status: z.enum(LIBRARY_STATUSES).optional(),
    score: z.number().min(0).max(10).multipleOf(0.5).nullable().optional(),
    progress: z.number().int().min(0).max(10_000).optional(),
    notes: z.string().max(500).optional(),
    favorite: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update.' });

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'INVALID_ID', 'Anime id must be a positive integer.');
  }
  return id;
}

function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'Some request values are invalid.',
      result.error.issues.map((issue) => ({ path: issue.path.join('.') || 'request', message: issue.message })),
    );
  }
  return result.data;
}

function libraryEntry(entry) {
  const anime = getAnimeDetail(entry.animeId);
  return {
    ...entry,
    anime: anime ? toSummary(anime) : null,
  };
}

function progressLimit(anime) {
  return anime?.episodes ?? 10_000;
}

export async function createApp({
  libraryFile = process.env.LIBRARY_FILE || path.join(ROOT, 'server', 'data', 'library.json'),
  messagesFile = process.env.MESSAGES_FILE || path.join(ROOT, 'server', 'data', 'messages.json'),
  rateLimitEnabled = process.env.NODE_ENV !== 'test',
  trustProxy = Boolean(process.env.VERCEL),
  otakudesu = new OtakudesuService({ anilistArtwork: new AniListArtwork() }),
} = {}) {
  const library = await new LibraryStore(libraryFile).init();
  const threads = await new ThreadStore(messagesFile).init();
  const app = express();

  // The serverless entry sits behind Vercel's proxy; trust one hop for client IPs.
  if (trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // Artwork lives alongside the API so external clients can resolve relative
  // media paths from either the app origin or the API origin.
  app.use(
    '/media',
    express.static(path.join(ROOT, 'public', 'media'), {
      maxAge: '7d',
      immutable: true,
      fallthrough: true,
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) : true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Thread-Token'],
      maxAge: 86_400,
    }),
  );
  // The relay receives raw provider payloads from the browser (large episode/unlimited data).
  app.use('/api/v1/otakudesu/relay', express.json({ limit: '2mb' }));
  app.use(express.json({ limit: '64kb' }));

  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on('finish', () => {
      if (process.env.NODE_ENV !== 'test' && req.path.startsWith('/api')) {
        const ms = Math.round(performance.now() - startedAt);
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
      }
    });
    next();
  });

  if (rateLimitEnabled) {
    app.use(
      '/api',
      rateLimit({
        windowMs: 60_000,
        limit: 240,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: (req) => req.path === '/health',
        message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
      }),
    );
  }

  const chatSendLimiter = rateLimitEnabled
    ? rateLimit({
        windowMs: 60_000,
        limit: 5,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: { code: 'CHAT_RATE_LIMITED', message: 'Terlalu banyak pesan. Coba lagi sebentar lagi.' } },
      })
    : (req, res, next) => next();
  const adminAttemptLimiter = rateLimitEnabled
    ? rateLimit({
        windowMs: 10 * 60_000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: { error: { code: 'ADMIN_RATE_LIMITED', message: 'Terlalu banyak percobaan admin. Coba lagi nanti.' } },
      })
    : (req, res, next) => next();
  app.use('/api/v1/admin', adminAttemptLimiter, requireAdmin);

  app.get('/api/health', (req, res) => {
    res.json({
      data: {
        status: 'ok',
        service: 'reognime-api',
        version: '1.0.0',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        catalog: { titles: getCatalogMeta().titles, source: getCatalogMeta().source },
        watch: { source: 'Otakudesu', provider: 'Sanka Vollerei' },
      },
    });
  });

  app.get('/api/v1/home', (req, res) => {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ data: getHome() });
  });

  app.get('/api/v1/anime', (req, res) => {
    const query = validate(listQuerySchema, req.query);
    const result = listAnime({ ...query, genres: parseGenres(query.genre) });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ data: result.data, meta: { ...result.pagination, filters: query } });
  });

  app.get('/api/v1/anime/:id', (req, res) => {
    const anime = getAnimeDetail(parseId(req.params.id));
    if (!anime) throw notFound('Anime not found.');
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ data: anime });
  });

  app.get('/api/v1/anime/:id/episodes', (req, res) => {
    const query = validate(episodesQuerySchema, req.query);
    const result = getEpisodes(parseId(req.params.id), query);
    if (!result) throw notFound('Anime not found.');
    res.json(result);
  });

  app.get('/api/v1/anime/:id/related', (req, res) => {
    const id = parseId(req.params.id);
    if (!getAnimeDetail(id)) throw notFound('Anime not found.');
    res.json({ data: getRelated(id, 6) });
  });

  app.get('/api/v1/search/suggestions', (req, res) => {
    const query = validate(searchQuerySchema, req.query);
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ data: getSuggestions(query.q, query.limit), meta: { query: query.q } });
  });

  app.get('/api/v1/random', (req, res) => {
    const query = validate(listQuerySchema, req.query);
    const anime = getRandom({ ...query, genres: parseGenres(query.genre) });
    if (!anime) throw new ApiError(404, 'NO_MATCH', 'No anime match those filters. Try a broader search.');
    res.set('Cache-Control', 'no-store');
    res.json({ data: anime });
  });

  app.get('/api/v1/genres', (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ data: getGenres() });
  });

  app.get('/api/v1/filters', (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ data: getFilterOptions() });
  });

  app.get('/api/v1/library', (req, res) => {
    const entries = library.all().map(libraryEntry).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const stats = getLibraryStats(library.all(), { getAnime: getAnimeDetail });
    res.set('Cache-Control', 'no-store');
    res.json({ data: entries, meta: { total: entries.length, stats } });
  });

  app.get('/api/v1/library/stats', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ data: getLibraryStats(library.all(), { getAnime: getAnimeDetail }) });
  });

  app.get('/api/v1/library/export', (req, res) => {
    const entries = library.all().map(libraryEntry);
    res.set('Content-Disposition', 'attachment; filename="reognime-library.json"');
    res.type('application/json');
    res.send(
      `${JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          app: 'ReogNime',
          version: 1,
          entries,
        },
        null,
        2,
      )}\n`,
    );
  });

  app.post('/api/v1/library', async (req, res) => {
    const body = validate(libraryCreateSchema, req.body);
    const anime = getAnimeDetail(body.animeId);
    if (!anime) throw notFound('Anime not found. Use a valid catalog id.');
    if (body.progress !== undefined && body.progress > progressLimit(anime)) {
      throw new ApiError(422, 'INVALID_PROGRESS', `Progress cannot exceed ${progressLimit(anime)} episodes.`);
    }
    const now = new Date().toISOString();
    const entry = {
      animeId: body.animeId,
      status: body.status,
      score: body.score ?? null,
      progress: body.progress ?? (body.status === 'COMPLETED' ? progressLimit(anime) : 0),
      notes: body.notes,
      favorite: body.favorite,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await library.create(entry);
    } catch (error) {
      if (error.code === 'ALREADY_EXISTS') throw new ApiError(409, 'ALREADY_EXISTS', error.message);
      throw error;
    }
    res.status(201).json({ data: libraryEntry(entry) });
  });

  app.get('/api/v1/library/:animeId', (req, res) => {
    const entry = library.get(parseId(req.params.animeId));
    if (!entry) throw notFound('This title is not in your library.');
    res.set('Cache-Control', 'no-store');
    res.json({ data: libraryEntry(entry) });
  });

  app.patch('/api/v1/library/:animeId', async (req, res) => {
    const animeId = parseId(req.params.animeId);
    const patch = validate(libraryPatchSchema, req.body);
    const existing = library.get(animeId);
    if (!existing) throw notFound('This title is not in your library.');
    const anime = getAnimeDetail(animeId);
    if (patch.progress !== undefined && patch.progress > progressLimit(anime)) {
      throw new ApiError(422, 'INVALID_PROGRESS', `Progress cannot exceed ${progressLimit(anime)} episodes.`);
    }
    const resolved = { ...patch };
    if (patch.status === 'COMPLETED' && patch.progress === undefined && anime.episodes) {
      resolved.progress = anime.episodes;
    }
    if (patch.status === 'PLANNING' && patch.progress === undefined) resolved.progress = 0;
    const updated = await library.update(animeId, resolved);
    res.json({ data: libraryEntry(updated) });
  });

  app.delete('/api/v1/library/:animeId', async (req, res) => {
    const removed = await library.remove(parseId(req.params.animeId));
    if (!removed) throw notFound('This title is not in your library.');
    res.status(204).end();
  });

  const threadAccess = (req) => {
    const thread = threads.get(req.params.id);
    const token = req.get('x-thread-token') || '';
    if (!thread || !threads.verifyToken(thread, token)) {
      throw new ApiError(401, 'THREAD_UNAUTHORIZED', 'This conversation is not accessible from this browser.');
    }
    return thread;
  };

  app.post('/api/v1/chat/threads', chatSendLimiter, async (req, res) => {
    const body = validate(chatMessageSchema, req.body);
    const result = await threads.create({
      message: body.message,
      page: body.page.startsWith('/') ? body.page : '/',
    });
    res.set('Cache-Control', 'no-store');
    res.status(201).json({ data: { thread: threads.publicView(result.thread), token: result.token } });
  });

  app.get('/api/v1/chat/threads/:id', (req, res) => {
    const thread = threadAccess(req);
    res.set('Cache-Control', 'no-store');
    res.json({ data: threads.publicView(thread) });
  });

  app.post('/api/v1/chat/threads/:id/messages', chatSendLimiter, async (req, res) => {
    const thread = threadAccess(req);
    if (thread.status === 'resolved') {
      throw new ApiError(409, 'THREAD_RESOLVED', 'This conversation has been marked as resolved.');
    }
    const body = validate(threadMessageSchema, req.body);
    const result = await threads.addVisitorMessage(thread.id, body.message);
    if (!result?.thread) throw notFound('Conversation not found.');
    res.set('Cache-Control', 'no-store');
    res.json({ data: threads.publicView(result.thread) });
  });

  app.get('/api/v1/admin/session', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ data: { username: ADMIN_USERNAME } });
  });

  app.get('/api/v1/admin/threads', (req, res) => {
    const query = validate(adminThreadQuerySchema, req.query);
    const entries = threads.list(query);
    res.set('Cache-Control', 'no-store');
    res.json({
      data: entries,
      meta: {
        total: entries.length,
        status: query.status,
        stats: threads.stats(),
        storage: process.env.VERCEL ? 'ephemeral' : 'file',
      },
    });
  });

  app.get('/api/v1/admin/threads/:id', (req, res) => {
    const thread = threads.get(req.params.id);
    if (!thread) throw notFound('Conversation not found.');
    res.set('Cache-Control', 'no-store');
    res.json({ data: threads.publicView(thread) });
  });

  app.post('/api/v1/admin/threads/:id/messages', async (req, res) => {
    const body = validate(threadMessageSchema, req.body);
    const thread = await threads.addAdminMessage(req.params.id, body.message);
    if (!thread) throw notFound('Conversation not found.');
    res.set('Cache-Control', 'no-store');
    res.json({ data: threads.publicView(thread) });
  });

  app.patch('/api/v1/admin/threads/:id', async (req, res) => {
    const body = validate(adminThreadPatchSchema, req.body);
    const thread = await threads.setStatus(req.params.id, body.status);
    if (!thread) throw notFound('Conversation not found.');
    res.set('Cache-Control', 'no-store');
    res.json({ data: threads.publicView(thread) });
  });

  app.delete('/api/v1/admin/threads/:id', async (req, res) => {
    const removed = await threads.remove(req.params.id);
    if (!removed) throw notFound('Conversation not found.');
    res.status(204).end();
  });

  app.use('/api/v1/otakudesu', createOtakudesuRouter(otakudesu));

  app.get('/api/v1/meta', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      data: {
        ...getCatalogMeta(),
        api: { version: 'v1', basePath: '/api/v1', docs: '/api/v1/openapi.json' },
        watch: {
          basePath: '/api/v1/otakudesu',
          source: 'Otakudesu',
          provider: 'Sanka Vollerei',
          upstream: 'https://www.sankavollerei.web.id/anime/',
        },
      },
    });
  });

  const openApi = openApiDocument();
  app.get(['/openapi.json', '/api/v1/openapi.json'], (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(openApi);
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `No API route matches ${req.method} ${req.originalUrl}.` } });
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(DIST, { maxAge: '1h', immutable: false, index: false }));
    app.get(/.*/, (req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(DIST, 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' } });
    }
    console.error(error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' } });
  });

  app.locals.library = library;
  app.locals.threads = threads;
  return app;
}
