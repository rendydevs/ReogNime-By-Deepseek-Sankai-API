import { ArrowDown, Dices, LoaderCircle, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { FORMAT_LABELS, SEASON_LABELS, genreLabel } from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { usePageSeo } from '../lib/seo';
import type { AnimeSummary, DiscoverFilters, DiscoverSort, PageMeta } from '../types';

const DEFAULT_SORT: DiscoverSort = 'popularity';
const PAGE_SIZE = 24;
const SORT_LABELS: Record<DiscoverSort, string> = {
  popularity: 'Paling populer',
  score: 'Skor tertinggi',
  newest: 'Terbaru',
  favorites: 'Paling difavoritkan',
  title: 'A–Z',
};

function filtersFromParams(params: URLSearchParams): DiscoverFilters {
  return {
    q: params.get('q') ?? '',
    genre: params.get('genre') ?? '',
    year: params.get('year') ?? '',
    season: params.get('season') ?? '',
    format: params.get('format') ?? '',
    status: params.get('status') ?? '',
    sort: (params.get('sort') as DiscoverSort) || DEFAULT_SORT,
  };
}

export function DiscoverPage() {
  useDocumentTitle('Temukan Anime Baru');
  usePageSeo({
    title: 'Temukan Anime Baru — ReogNime',
    description: 'Jelajahi katalog anime berdasarkan genre, tahun, musim, format, status, dan skor. Temukan tontonan berikutnya di ReogNime.',
    image: '/og-reognime.jpg',
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const filterKey = JSON.stringify(filters);
  const [query, setQuery] = useState(filters.q);
  const [items, setItems] = useState<AnimeSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surprising, setSurprising] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const filterOptions = useApi((signal) => api.filters(signal), []);

  useEffect(() => {
    setQuery(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (query === filters.q) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (query.trim()) next.set('q', query.trim());
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, filters.q, searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .list({ ...filters, page: 1, limit: PAGE_SIZE }, controller.signal)
      .then((payload) => {
        setItems(payload.data);
        setMeta(payload.meta);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Gagal memuat indeks.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // filterKey deliberately drives this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, reloadToken]);

  const setFilter = (key: keyof DiscoverFilters, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: key === 'q' });
  };

  const resetFilters = () => {
    setQuery('');
    setSearchParams({}, { replace: true });
  };

  const activeFilterCount = [filters.genre, filters.year, filters.season, filters.format, filters.status].filter(Boolean).length;

  const loadMore = async () => {
    if (!meta?.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const payload = await api.list({ ...filters, page: meta.page + 1, limit: PAGE_SIZE });
      setItems((current) => [...current, ...payload.data]);
      setMeta(payload.meta);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Gagal memuat judul lainnya.', { tone: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  const surpriseMe = async () => {
    setSurprising(true);
    try {
      const payload = await api.random(filters);
      navigate(`/anime/${payload.data.id}`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Tidak ada judul yang cocok dengan saringan itu.', { tone: 'error' });
    } finally {
      setSurprising(false);
    }
  };

  const options = filterOptions.data?.data;

  return (
    <div className="discover-page">
      <header className="page-masthead container">
        <div className="page-masthead-meta">
          <p className="eyebrow">Indeks</p>
          <p className="masthead-edition">Edisi 01 / {new Date().getFullYear()}</p>
        </div>
        <div className="discover-title-row">
          <h1>Temukan<br />dunia berikutnya.</h1>
          <p>
            Cari di seluruh rak lewat judul, studio, tahun, atau suasana.
            Setiap entri ada di sini dengan alasan.
          </p>
        </div>
      </header>

      <section className="discover-controls container">
        <div className="search-field">
          <Search size={20} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Coba “Frieren”, “Ghibli”, atau “Romantis”…"
            aria-label="Cari anime berdasarkan judul atau studio"
            type="search"
          />
          {query && (
            <button className="clear-search" onClick={() => setQuery('')} aria-label="Bersihkan pencarian">
              <X size={16} />
            </button>
          )}
          <span className="search-field-hint">Ketik untuk menyaring</span>
        </div>

        <div className="genre-filter-row" aria-label="Saring berdasarkan genre">
          <button
            className={`genre-chip ${!filters.genre ? 'is-active' : ''}`}
            onClick={() => setFilter('genre', '')}
          >
            Semua genre
          </button>
          {options?.genres.map((genre) => (
            <button
              key={genre.name}
              className={`genre-chip ${filters.genre === genre.name ? 'is-active' : ''}`}
              onClick={() => setFilter('genre', filters.genre === genre.name ? '' : genre.name)}
            >
              {genreLabel(genre.name)}
              <span>{genre.count}</span>
            </button>
          ))}
        </div>

        <div className="filter-bar">
          <div className="filter-bar-label">
            <SlidersHorizontal size={15} />
            <span>Saring</span>
          </div>
          <label className="select-wrap">
            <span className="sr-only">Tahun</span>
            <select value={filters.year} onChange={(event) => setFilter('year', event.target.value)}>
              <option value="">Semua tahun</option>
              {options?.years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="select-wrap">
            <span className="sr-only">Format</span>
            <select value={filters.format} onChange={(event) => setFilter('format', event.target.value)}>
              <option value="">Semua format</option>
              {options?.formats.map((formatOption) => (
                <option key={formatOption.value} value={formatOption.value}>{FORMAT_LABELS[formatOption.value]}</option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <span className="sr-only">Musim</span>
            <select value={filters.season} onChange={(event) => setFilter('season', event.target.value)}>
              <option value="">Semua musim</option>
              {options?.seasons.map((season) => (
                <option key={season.value} value={season.value}>{SEASON_LABELS[season.value]}</option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <span className="sr-only">Status</span>
            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">Semua status</option>
              <option value="FINISHED">Tamat</option>
              <option value="RELEASING">Tayang</option>
            </select>
          </label>
          <label className="select-wrap select-sort">
            <span className="sr-only">Urutkan</span>
            <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
              {options?.sorts.map((sort) => <option key={sort.value} value={sort.value}>{SORT_LABELS[sort.value]}</option>)}
            </select>
          </label>
          {activeFilterCount > 0 && (
            <button className="reset-filters" onClick={resetFilters}>
              <RotateCcw size={13} /> Reset {activeFilterCount}
            </button>
          )}
          <div className="filter-bar-spacer" />
          <button className="surprise-button" onClick={surpriseMe} disabled={surprising}>
            {surprising ? <LoaderCircle size={15} className="spin" /> : <Dices size={16} />}
            Pilih acak
          </button>
        </div>
      </section>

      <section className="results-section container">
        <div className="results-head">
          <p>
            {loading ? 'Mencari di rak…' : <><strong>{meta?.total ?? 0}</strong> judul</>}
            {filters.q && !loading && <span> untuk “{filters.q}”</span>}
            {filters.genre && !loading && <span> dalam {genreLabel(filters.genre)}</span>}
          </p>
          <span className="results-range">
            {items.length && meta ? `Menampilkan ${items.length} dari ${meta.total}` : 'Indeks lengkap'}
          </span>
        </div>

        {error ? (
          <div className="inline-error">
            <p>{error}</p>
            <button className="button button-primary" onClick={() => setReloadToken((value) => value + 1)}>
              Coba lagi
            </button>
          </div>
        ) : loading ? (
          <div className="poster-grid poster-grid-five">
            {Array.from({ length: 10 }, (_, index) => (
              <div className="skeleton-card" key={index}>
                <div className="skeleton skeleton-poster" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line skeleton-line-short" />
              </div>
            ))}
          </div>
        ) : items.length ? (
          <>
            <div className="poster-grid poster-grid-five">
              {items.map((anime, index) => <AnimeCard key={anime.id} anime={anime} eager={index < 10} />)}
            </div>
            {meta?.hasNextPage && (
              <div className="load-more-wrap">
                <button className="button button-outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <LoaderCircle size={15} className="spin" /> : <ArrowDown size={15} />}
                  {loadingMore ? 'Memuat' : `Muat lagi · ${meta.total - items.length} tersisa`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p className="empty-index">No. 00</p>
            <h2>Tidak ada di rak ini.</h2>
            <p>Coba suasana lain, tahun yang lebih luas, atau bersihkan saringan.</p>
            <div className="empty-actions">
              <button className="button button-primary" onClick={resetFilters}>Bersihkan semua saringan</button>
              <button className="button button-quiet" onClick={surpriseMe} disabled={surprising}>
                <Dices size={16} /> Pilihkan satu
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
