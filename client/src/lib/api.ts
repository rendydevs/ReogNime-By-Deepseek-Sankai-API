import type {
  Anime,
  AnimeSummary,
  DiscoverFilters,
  EpisodesPayload,
  FilterOptions,
  HomePayload,
  LibraryEntry,
  LibraryPayload,
  LibraryStats,
  LibraryStatus,
  OtakuAnimeDetail,
  OtakuBatch,
  OtakuCard,
  OtakuEpisodePage,
  OtakuGenre,
  OtakuHome,
  OtakuListMeta,
  OtakuScheduleDay,
  OtakuUnlimitedGroup,
  PageMeta,
} from '../types';

const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE = (configuredBase || '/api/v1').replace(/\/$/, '');
export const API_ORIGIN = API_BASE.startsWith('http') ? new URL(API_BASE).origin : '';
export const OPENAPI_URL = `${API_BASE}/openapi.json`;
export const API_HEALTH_URL = API_ORIGIN ? `${API_ORIGIN}/api/health` : '/api/health';


export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code = 'REQUEST_FAILED', details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiRequestError('Tidak bisa menghubungi API ReogNime. Pastikan server berjalan.', 0, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    let code = 'REQUEST_FAILED';
    let details: unknown;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
      code = body?.error?.code ?? code;
      details = body?.error?.details;
    } catch {}
    throw new ApiRequestError(message, response.status, code, details);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const OTAKUDESU_UPSTREAM_BASE = 'https://www.sankavollerei.web.id/anime';
let preferOtakuRelay = false;

function isRelayableProviderError(error: unknown) {
  return (
    error instanceof ApiRequestError &&
    ['OTAKUDESU_BAD_RESPONSE', 'OTAKUDESU_UPSTREAM_ERROR', 'OTAKUDESU_UNREACHABLE'].includes(error.code)
  );
}

async function fetchOtakudesuPayload(path: string, signal?: AbortSignal) {
  try {
    const response = await fetch(`${OTAKUDESU_UPSTREAM_BASE}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || payload.status !== 'success' || payload.data === undefined) {
      throw new Error('Respons upstream tidak valid');
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiRequestError(
      'Browser tidak bisa menghubungi penyedia anime secara langsung. Coba jaringan lain atau ulangi sebentar lagi.',
      502,
      'OTAKUDESU_BROWSER_BLOCKED',
    );
  }
}

async function relayOtaku<T>(
  endpoint: string,
  path: string,
  params: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const payload = await fetchOtakudesuPayload(path, signal);
  return request<T>('/otakudesu/relay', {
    method: 'POST',
    body: JSON.stringify({ endpoint, payload, params }),
    signal,
  });
}

async function otakuRequest<T>(
  server: () => Promise<T>,
  endpoint: string,
  upstreamPath: string,
  params: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  if (!preferOtakuRelay) {
    try {
      return await server();
    } catch (error) {
      if (!isRelayableProviderError(error)) throw error;
      // Vercel and other datacenter IPs are sometimes blocked by the provider.
      // Once that happens, let the visitor's browser fetch the raw payload and
      // send it to the server for the same normalization.
      preferOtakuRelay = true;
    }
  }
  return relayOtaku<T>(endpoint, upstreamPath, params, signal);
}

function queryString(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
}

export interface ListOptions extends Partial<DiscoverFilters> {
  page?: number;
  limit?: number;
  minScore?: number;
}

export const api = {
  home(signal?: AbortSignal) {
    return request<{ data: HomePayload }>('/home', { signal });
  },

  list(options: ListOptions = {}, signal?: AbortSignal) {
    return request<{ data: AnimeSummary[]; meta: PageMeta }>(
      `/anime${queryString({
        q: options.q,
        genre: options.genre,
        year: options.year,
        season: options.season,
        format: options.format,
        status: options.status,
        sort: options.sort,
        minScore: options.minScore,
        page: options.page,
        limit: options.limit,
      })}`,
      { signal },
    );
  },

  anime(id: number | string, signal?: AbortSignal) {
    return request<{ data: Anime }>(`/anime/${id}`, { signal });
  },

  episodes(id: number | string, page = 1, limit = 12, signal?: AbortSignal) {
    return request<EpisodesPayload>(`/anime/${id}/episodes${queryString({ page, limit })}`, { signal });
  },

  suggestions(q: string, signal?: AbortSignal) {
    return request<{ data: AnimeSummary[] }>(`/search/suggestions${queryString({ q, limit: 6 })}`, { signal });
  },

  random(filters: Partial<DiscoverFilters> = {}, signal?: AbortSignal) {
    return request<{ data: AnimeSummary }>(
      `/random${queryString({
        q: filters.q,
        genre: filters.genre,
        year: filters.year,
        season: filters.season,
        format: filters.format,
        status: filters.status,
        sort: filters.sort,
      })}`,
      { signal },
    );
  },

  filters(signal?: AbortSignal) {
    return request<{ data: FilterOptions }>('/filters', { signal });
  },

  library(signal?: AbortSignal) {
    return request<LibraryPayload>('/library', { signal });
  },

  createLibrary(input: {
    animeId: number;
    status?: LibraryStatus;
    score?: number | null;
    progress?: number;
    notes?: string;
    favorite?: boolean;
  }) {
    return request<{ data: LibraryEntry }>('/library', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateLibrary(
    animeId: number,
    patch: Partial<Pick<LibraryEntry, 'status' | 'score' | 'progress' | 'notes' | 'favorite'>>,
  ) {
    return request<{ data: LibraryEntry }>(`/library/${animeId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteLibrary(animeId: number) {
    return request<void>(`/library/${animeId}`, { method: 'DELETE' });
  },

  libraryStats(signal?: AbortSignal) {
    return request<{ data: LibraryStats }>('/library/stats', { signal });
  },

  exportUrl() {
    return `${API_BASE}/library/export`;
  },

  otaku: {
    home(signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuHome }>(
        () => request<{ data: OtakuHome }>('/otakudesu/home', { signal }),
        'home',
        '/home',
        {},
        signal,
      );
    },

    list(kind: 'ongoing' | 'completed', page = 1, signal?: AbortSignal) {
      const upstreamPath = `${kind === 'completed' ? '/complete-anime' : '/ongoing-anime'}?page=${encodeURIComponent(page)}`;
      return otakuRequest<{ data: OtakuCard[]; meta: OtakuListMeta }>(
        () =>
          request<{ data: OtakuCard[]; meta: OtakuListMeta }>(
            `/otakudesu/${kind}${queryString({ page })}`,
            { signal },
          ),
        kind,
        upstreamPath,
        { page },
        signal,
      );
    },

    schedule(signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuScheduleDay[] }>(
        () => request<{ data: OtakuScheduleDay[] }>('/otakudesu/schedule', { signal }),
        'schedule',
        '/schedule',
        {},
        signal,
      );
    },

    genres(signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuGenre[] }>(
        () => request<{ data: OtakuGenre[] }>('/otakudesu/genres', { signal }),
        'genres',
        '/genre',
        {},
        signal,
      );
    },

    genre(slug: string, page = 1, signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuCard[]; meta: OtakuListMeta }>(
        () =>
          request<{ data: OtakuCard[]; meta: OtakuListMeta }>(
            `/otakudesu/genres/${encodeURIComponent(slug)}${queryString({ page })}`,
            { signal },
          ),
        'genre',
        `/genre/${encodeURIComponent(slug)}?page=${encodeURIComponent(page)}`,
        { slug },
        signal,
      );
    },

    search(q: string, signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuCard[]; meta: OtakuListMeta }>(
        () =>
          request<{ data: OtakuCard[]; meta: OtakuListMeta }>(
            `/otakudesu/search${queryString({ q })}`,
            { signal },
          ),
        'search',
        `/search/${encodeURIComponent(q)}`,
        { query: q },
        signal,
      );
    },

    anime(slug: string, signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuAnimeDetail }>(
        () =>
          request<{ data: OtakuAnimeDetail }>(`/otakudesu/anime/${encodeURIComponent(slug)}`, { signal }),
        'anime',
        `/anime/${encodeURIComponent(slug)}`,
        { slug },
        signal,
      );
    },

    episode(slug: string, signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuEpisodePage }>(
        () =>
          request<{ data: OtakuEpisodePage }>(`/otakudesu/episode/${encodeURIComponent(slug)}`, { signal }),
        'episode',
        `/episode/${encodeURIComponent(slug)}`,
        { slug },
        signal,
      );
    },

    batch(slug: string, signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuBatch }>(
        () =>
          request<{ data: OtakuBatch }>(`/otakudesu/batch/${encodeURIComponent(slug)}`, { signal }),
        'batch',
        `/batch/${encodeURIComponent(slug)}`,
        { slug },
        signal,
      );
    },

    server(serverId: string, signal?: AbortSignal) {
      return otakuRequest<{ data: { url: string } }>(
        () =>
          request<{ data: { url: string } }>(`/otakudesu/server/${encodeURIComponent(serverId)}`, {
            signal,
          }),
        'server',
        `/server/${encodeURIComponent(serverId)}`,
        {},
        signal,
      );
    },

    unlimited(signal?: AbortSignal) {
      return otakuRequest<{ data: OtakuUnlimitedGroup[] }>(
        () => request<{ data: OtakuUnlimitedGroup[] }>('/otakudesu/unlimited', { signal }),
        'unlimited',
        '/unlimited',
        {},
        signal,
      );
    },
  },
};
