const summary = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 154587 },
    slug: { type: 'string', example: 'frieren-beyond-journeys-end' },
    title: { type: 'string', example: 'Frieren: Beyond Journey’s End' },
    originalTitle: { type: 'string', example: 'Sousou no Frieren' },
    nativeTitle: { type: 'string', example: '葬送のフリーレン' },
    cover: { type: ['string', 'null'], example: '/media/covers/154587.webp' },
    banner: { type: ['string', 'null'], example: '/media/banners/154587.webp' },
    accent: { type: 'string', example: '#c8d9b4' },
    score: { type: ['integer', 'null'], minimum: 0, maximum: 100, example: 91 },
    popularity: { type: 'integer', example: 495322 },
    episodes: { type: ['integer', 'null'], example: 28 },
    duration: { type: ['integer', 'null'], example: 24 },
    status: { type: 'string', enum: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
    format: { type: 'string', enum: ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'] },
    season: { type: ['string', 'null'], enum: ['WINTER', 'SPRING', 'SUMMER', 'FALL', null] },
    seasonYear: { type: ['integer', 'null'], example: 2023 },
    startDate: { type: ['string', 'null'], format: 'date' },
    genres: { type: 'array', items: { type: 'string' } },
    studios: { type: 'array', items: { type: 'string' } },
    nextAiringEpisode: {
      type: ['object', 'null'],
      properties: { episode: { type: 'integer' }, airingAt: { type: 'string', format: 'date-time' } },
    },
  },
};

const pagination = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
    hasNextPage: { type: 'boolean' },
    hasPreviousPage: { type: 'boolean' },
  },
};

const errorResponse = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
  },
};

const animeQueryParams = [
  { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Free-text search across titles, studios and genres.' },
  { name: 'genre', in: 'query', schema: { type: 'string' }, description: 'Comma-separated genres. All supplied genres must match.', example: 'Drama,Romance' },
  { name: 'year', in: 'query', schema: { type: 'integer' }, description: 'Season year, e.g. 2023.' },
  { name: 'season', in: 'query', schema: { type: 'string', enum: ['WINTER', 'SPRING', 'SUMMER', 'FALL'] } },
  { name: 'format', in: 'query', schema: { type: 'string', enum: ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'] } },
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] } },
  { name: 'minScore', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 }, description: 'Minimum AniList score.' },
  { name: 'sort', in: 'query', schema: { type: 'string', enum: ['popularity', 'score', 'newest', 'favorites', 'title'], default: 'popularity' } },
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
];

const libraryEntrySchema = {
  type: 'object',
  properties: {
    animeId: { type: 'integer', example: 154587 },
    status: { type: 'string', enum: ['WATCHING', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'DROPPED'] },
    score: { type: ['number', 'null'], minimum: 0, maximum: 10, example: 9 },
    progress: { type: 'integer', minimum: 0, example: 14 },
    notes: { type: 'string', maxLength: 500 },
    favorite: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    anime: summary,
  },
};

const json = (schema) => ({ 'application/json': { schema } });

const otakuPageParam = {
  name: 'page',
  in: 'query',
  schema: { type: 'integer', minimum: 1, maximum: 500, default: 1 },
  description: 'Upstream page number.',
};

const otakuSlugParam = {
  name: 'slug',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  example: 'sousou-frieren-sub-indo',
};

const otakuCardSchema = {
  type: 'object',
  properties: {
    slug: { type: 'string', example: 'sousou-frieren-sub-indo' },
    title: { type: 'string', example: 'Sousou no Frieren' },
    poster: { type: ['string', 'null'] },
    sourceUrl: { type: ['string', 'null'], format: 'uri' },
    status: { type: ['string', 'null'], example: 'Ongoing' },
    episodes: { type: ['number', 'null'] },
    score: { type: ['number', 'null'] },
    type: { type: ['string', 'null'] },
    season: { type: ['string', 'null'] },
    studios: { type: 'array', items: { type: 'string' } },
    releaseDay: { type: ['string', 'null'] },
    latestReleaseDate: { type: ['string', 'null'] },
    genres: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, slug: { type: 'string' } } } },
    synopsis: { type: 'array', items: { type: 'string' } },
  },
};

const otakuMeta = {
  type: 'object',
  properties: {
    source: { type: 'string', example: 'Otakudesu' },
    provider: { type: 'string', example: 'Sanka Vollerei' },
    upstream: { type: 'string', format: 'uri' },
    pagination: { type: ['object', 'null'] },
  },
};

const otakudesuPaths = {
  '/otakudesu/home': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Otakudesu home',
      description: 'Ongoing and recently completed lists from the public Otakudesu API, plus an automatically chosen featured title. Responses are cached by the ReogNime server.',
      responses: {
        200: {
          description: 'Home payload',
          content: json({
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  ongoing: { type: 'array', items: { $ref: '#/components/schemas/OtakuCard' } },
                  completed: { type: 'array', items: { $ref: '#/components/schemas/OtakuCard' } },
                  featured: { oneOf: [{ $ref: '#/components/schemas/OtakuCard' }, { type: 'null' }] },
                },
              },
              meta: otakuMeta,
            },
          }),
        },
        502: errorResponse,
      },
    },
  },
  '/otakudesu/ongoing': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Ongoing anime',
      parameters: [otakuPageParam],
      responses: {
        200: { description: 'A page of ongoing titles', content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/OtakuCard' } }, meta: otakuMeta } }) },
        502: errorResponse,
      },
    },
  },
  '/otakudesu/completed': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Completed anime',
      parameters: [otakuPageParam],
      responses: {
        200: { description: 'A page of completed titles', content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/OtakuCard' } }, meta: otakuMeta } }) },
        502: errorResponse,
      },
    },
  },
  '/otakudesu/schedule': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Weekly release schedule',
      responses: { 200: { description: 'Titles grouped by day', content: json({ type: 'object' }) }, 502: errorResponse },
    },
  },
  '/otakudesu/search': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Search Otakudesu',
      parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string', maxLength: 100 }, example: 'frieren' }],
      responses: {
        200: { description: 'Search results', content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/OtakuCard' } }, meta: otakuMeta } }) },
        400: errorResponse,
        502: errorResponse,
      },
    },
  },
  '/otakudesu/genres': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Otakudesu genres',
      responses: { 200: { description: 'Genre list', content: json({ type: 'object' }) }, 502: errorResponse },
    },
  },
  '/otakudesu/genres/{slug}': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Anime by genre',
      parameters: [otakuSlugParam, otakuPageParam],
      responses: {
        200: { description: 'Paginated genre list', content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/OtakuCard' } }, meta: otakuMeta } }) },
        404: errorResponse,
        502: errorResponse,
      },
    },
  },
  '/otakudesu/anime/{slug}': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Series detail',
      description: 'Synopsis, metadata, genres, episodes, recommendations and batch reference for a streaming title.',
      parameters: [otakuSlugParam],
      responses: { 200: { description: 'Normalized series detail', content: json({ type: 'object' }) }, 404: errorResponse, 502: errorResponse },
    },
  },
  '/otakudesu/episode/{slug}': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Episode detail and streaming mirrors',
      description: 'Returns normalized streaming server groups, download qualities, previous/next navigation and series episode list.',
      parameters: [otakuSlugParam],
      responses: { 200: { description: 'Episode payload', content: json({ type: 'object' }) }, 404: errorResponse, 502: errorResponse },
    },
  },
  '/otakudesu/batch/{slug}': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Batch download links',
      parameters: [otakuSlugParam],
      responses: { 200: { description: 'Batch payload', content: json({ type: 'object' }) }, 404: errorResponse, 502: errorResponse },
    },
  },
  '/otakudesu/server/{serverId}': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Resolve an embed URL',
      parameters: [{ name: 'serverId', in: 'path', required: true, schema: { type: 'string' }, example: '6AE5C9-5-C75u' }],
      responses: {
        200: { description: 'Embeddable URL', content: json({ type: 'object', properties: { data: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } }, meta: otakuMeta } }) },
        404: errorResponse,
        502: errorResponse,
      },
    },
  },
  '/otakudesu/unlimited': {
    get: {
      tags: ['Otakudesu'],
      summary: 'All anime (A–Z)',
      responses: { 200: { description: 'All titles grouped by initial', content: json({ type: 'object' }) }, 502: errorResponse },
    },
  },
  '/otakudesu/status': {
    get: {
      tags: ['Otakudesu'],
      summary: 'Provider status',
      description: 'Cache size, artwork index size and current upstream usage. No credentials are exposed.',
      responses: { 200: { description: 'Provider status', content: json({ type: 'object' }) } },
    },
  },
};

export function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ReogNime API',
      version: '1.0.0',
      description:
        'A small REST surface over the ReogNime anime catalog and the live Otakudesu watch layer. Catalog and watch endpoints are read-only public GETs. Library endpoints persist a single local profile to JSON. Otakudesu upstream calls are cached and rate-guarded. CORS is enabled for local integrations.',
      contact: { name: 'ReogNime', url: 'https://anilist.co' },
      license: { name: 'Demo — metadata and artwork belong to their respective rights holders.' },
    },
    servers: [
      { url: '/api/v1', description: 'Same-origin API' },
      { url: 'http://localhost:8787/api/v1', description: 'Local development API' },
    ],
    tags: [
      { name: 'Discovery', description: 'Browse, search and inspect the catalog.' },
      { name: 'Library', description: 'Read and write the local watch library.' },
      { name: 'Otakudesu', description: 'The streaming watch layer, proxied and normalized from the public Otakudesu API.' },
      { name: 'Reference', description: 'Filter metadata and service information.' },
    ],
    paths: {
      '/home': {
        get: {
          tags: ['Discovery'],
          summary: 'Editorial home payload',
          description: 'Spotlight titles, trending picks, top-rated entries, new releases, genre counts and catalog statistics in one request.',
          responses: { 200: { description: 'Home payload', content: json({ type: 'object', properties: { data: { type: 'object' } } }) } },
        },
      },
      '/edition': {
        get: {
          tags: ['Discovery'],
          summary: 'Daily editorial edition',
          description: 'Daily pick, current mood, greeting, top titles and archive statistics, derived from the local editorial catalog.',
          responses: { 200: { description: 'Daily edition payload', content: json({ type: 'object', properties: { data: { type: 'object' }, meta: { type: 'object' } } }) } },
        },
      },
      '/moods': {
        get: {
          tags: ['Discovery'],
          summary: 'Mood discovery groups',
          description: 'Four mood buckets with related genres, title counts and curated anime summaries.',
          responses: { 200: { description: 'Mood groups', content: json({ type: 'object', properties: { data: { type: 'array', items: { type: 'object' } }, meta: { type: 'object' } } }) } },
        },
      },
      '/anime': {
        get: {
          tags: ['Discovery'],
          summary: 'List and search anime',
          parameters: animeQueryParams,
          responses: {
            200: {
              description: 'Paginated anime summaries',
              content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/AnimeSummary' } }, meta: { $ref: '#/components/schemas/Pagination' } } }),
            },
            422: errorResponse,
          },
        },
      },
      '/anime/{id}': {
        get: {
          tags: ['Discovery'],
          summary: 'Get one anime',
          description: 'Includes synopsis, characters, trailer, related titles and episode tracker metadata.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 154587 }],
          responses: {
            200: { description: 'Anime detail', content: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/Anime' } } }) },
            404: errorResponse,
          },
        },
      },
      '/anime/{id}/episodes': {
        get: {
          tags: ['Discovery'],
          summary: 'Paginated episode index',
          description: 'Episode entries are generated from catalog metadata; air dates are weekly approximations for finished seasons.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12, maximum: 100 } },
          ],
          responses: { 200: { description: 'Episode page', content: json({ type: 'object' }) }, 404: errorResponse },
        },
      },
      '/anime/{id}/related': {
        get: {
          tags: ['Discovery'],
          summary: 'Related anime',
          description: 'Genre, studio and era affinity, ranked by relevance.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Related titles', content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/AnimeSummary' } } } }) }, 404: errorResponse },
        },
      },
      '/search/suggestions': {
        get: {
          tags: ['Discovery'],
          summary: 'Lightweight search suggestions',
          description: 'Designed for command palettes and typeahead. With no query, returns popular picks.',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, example: 'frieren' },
            { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 10, default: 6 } },
          ],
          responses: { 200: { description: 'Suggestions', content: json({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/AnimeSummary' } } } }) } },
        },
      },
      '/random': {
        get: {
          tags: ['Discovery'],
          summary: 'Random anime',
          description: 'Accepts the same filter parameters as /anime and returns one random match.',
          parameters: animeQueryParams.filter((param) => !['page', 'limit', 'sort'].includes(param.name)),
          responses: {
            200: { description: 'A random title', content: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/AnimeSummary' } } }) },
            404: errorResponse,
          },
        },
      },
      '/genres': {
        get: {
          tags: ['Reference'],
          summary: 'Genres with title counts',
          responses: { 200: { description: 'Genre list', content: json({ type: 'object', properties: { data: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, count: { type: 'integer' } } } } } }) } },
        },
      },
      '/filters': {
        get: {
          tags: ['Reference'],
          summary: 'Filter option metadata',
          description: 'Genres, years, formats, seasons, statuses and supported sort values for building a dynamic UI.',
          responses: { 200: { description: 'Filter options', content: json({ type: 'object' }) } },
        },
      },
      '/meta': {
        get: {
          tags: ['Reference'],
          summary: 'Catalog metadata',
          responses: { 200: { description: 'Catalog source and counts', content: json({ type: 'object' }) } },
        },
      },
      '/library': {
        get: {
          tags: ['Library'],
          summary: 'List the watch library',
          description: 'Entries are joined with catalog summaries and sorted by most recently updated.',
          responses: { 200: { description: 'Library entries and aggregate stats', content: json({ type: 'object' }) } },
        },
        post: {
          tags: ['Library'],
          summary: 'Add an anime to the library',
          requestBody: {
            required: true,
            content: json({
              type: 'object',
              required: ['animeId'],
              properties: {
                animeId: { type: 'integer', example: 154587 },
                status: { type: 'string', enum: ['WATCHING', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'DROPPED'], default: 'PLANNING' },
                score: { type: ['number', 'null'], minimum: 0, maximum: 10, multipleOf: 0.5 },
                progress: { type: 'integer', minimum: 0 },
                notes: { type: 'string', maxLength: 500 },
                favorite: { type: 'boolean' },
              },
            }),
          },
          responses: {
            201: { description: 'Created entry', content: json({ type: 'object', properties: { data: libraryEntrySchema } }) },
            404: errorResponse,
            409: errorResponse,
            422: errorResponse,
          },
        },
      },
      '/library/stats': {
        get: {
          tags: ['Library'],
          summary: 'Library statistics',
          description: 'Status counts, episodes/hours watched, mean score, favourites and top genres.',
          responses: { 200: { description: 'Computed stats', content: json({ type: 'object' }) } },
        },
      },
      '/library/export': {
        get: {
          tags: ['Library'],
          summary: 'Export library as JSON',
          responses: { 200: { description: 'Downloadable JSON document' } },
        },
      },
      '/library/{animeId}': {
        get: {
          tags: ['Library'],
          summary: 'Get one library entry',
          parameters: [{ name: 'animeId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Library entry', content: json({ type: 'object', properties: { data: libraryEntrySchema } }) }, 404: errorResponse },
        },
        patch: {
          tags: ['Library'],
          summary: 'Update a library entry',
          description: 'Send only the fields you want to change. Setting status to COMPLETED fills progress to the total episode count when available.',
          parameters: [{ name: 'animeId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: json({
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['WATCHING', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'DROPPED'] },
                score: { type: ['number', 'null'], minimum: 0, maximum: 10, multipleOf: 0.5 },
                progress: { type: 'integer', minimum: 0 },
                notes: { type: 'string', maxLength: 500 },
                favorite: { type: 'boolean' },
              },
            }),
          },
          responses: { 200: { description: 'Updated entry', content: json({ type: 'object', properties: { data: libraryEntrySchema } }) }, 404: errorResponse, 422: errorResponse },
        },
        delete: {
          tags: ['Library'],
          summary: 'Remove a library entry',
          parameters: [{ name: 'animeId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 204: { description: 'Deleted' }, 404: errorResponse },
        },
      },
      ...otakudesuPaths,
    },
    components: {
      schemas: {
        AnimeSummary: summary,
        Anime: {
          allOf: [
            summary,
            {
              type: 'object',
              properties: {
                synopsis: { type: 'string' },
                characters: { type: 'array', items: { type: 'object' } },
                related: { type: 'array', items: summary },
                episodeTracker: { type: 'object' },
                trailer: { type: ['object', 'null'] },
              },
            },
          ],
        },
        Pagination: pagination,
        LibraryEntry: libraryEntrySchema,
        OtakuCard: otakuCardSchema,
      },
    },
  };
}
