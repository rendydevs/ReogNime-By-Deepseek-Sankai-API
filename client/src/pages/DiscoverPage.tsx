import { ArrowDown, Dices, LoaderCircle, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { FORMAT_LABELS, SEASON_LABELS } from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import type { AnimeSummary, DiscoverFilters, DiscoverSort, PageMeta } from '../types';

const DEFAULT_SORT: DiscoverSort = 'popularity';
const PAGE_SIZE = 24;

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
  useDocumentTitle('The index');
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
        setError(reason instanceof Error ? reason.message : 'Could not load the index.');
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
      notify(reason instanceof Error ? reason.message : 'Could not load more titles.', { tone: 'error' });
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
      notify(reason instanceof Error ? reason.message : 'No title matched those filters.', { tone: 'error' });
    } finally {
      setSurprising(false);
    }
  };

  const options = filterOptions.data?.data;

  return (
    <div className="discover-page">
      <header className="page-masthead container">
        <div className="page-masthead-meta">
          <p className="eyebrow">The index</p>
          <p className="masthead-edition">Edition 01 / {new Date().getFullYear()}</p>
        </div>
        <div className="discover-title-row">
          <h1>Find your<br />next world.</h1>
          <p>
            Search the full shelf by title, studio, year, or simply a mood.
            Every entry is here on purpose.
          </p>
        </div>
      </header>

      <section className="discover-controls container">
        <div className="search-field">
          <Search size={20} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “Frieren”, “Ghibli”, or “Romance”…"
            aria-label="Search anime by title or studio"
            type="search"
          />
          {query && (
            <button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
          <span className="search-field-hint">Type to filter</span>
        </div>

        <div className="genre-filter-row" aria-label="Filter by genre">
          <button
            className={`genre-chip ${!filters.genre ? 'is-active' : ''}`}
            onClick={() => setFilter('genre', '')}
          >
            All genres
          </button>
          {options?.genres.map((genre) => (
            <button
              key={genre.name}
              className={`genre-chip ${filters.genre === genre.name ? 'is-active' : ''}`}
              onClick={() => setFilter('genre', filters.genre === genre.name ? '' : genre.name)}
            >
              {genre.name}
              <span>{genre.count}</span>
            </button>
          ))}
        </div>

        <div className="filter-bar">
          <div className="filter-bar-label">
            <SlidersHorizontal size={15} />
            <span>Refine</span>
          </div>
          <label className="select-wrap">
            <span className="sr-only">Year</span>
            <select value={filters.year} onChange={(event) => setFilter('year', event.target.value)}>
              <option value="">Any year</option>
              {options?.years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="select-wrap">
            <span className="sr-only">Format</span>
            <select value={filters.format} onChange={(event) => setFilter('format', event.target.value)}>
              <option value="">Any format</option>
              {options?.formats.map((formatOption) => (
                <option key={formatOption.value} value={formatOption.value}>{FORMAT_LABELS[formatOption.value]}</option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <span className="sr-only">Season</span>
            <select value={filters.season} onChange={(event) => setFilter('season', event.target.value)}>
              <option value="">Any season</option>
              {options?.seasons.map((season) => (
                <option key={season.value} value={season.value}>{SEASON_LABELS[season.value]}</option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <span className="sr-only">Status</span>
            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">Any status</option>
              <option value="FINISHED">Finished</option>
              <option value="RELEASING">Airing</option>
            </select>
          </label>
          <label className="select-wrap select-sort">
            <span className="sr-only">Sort by</span>
            <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
              {options?.sorts.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
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
            Surprise me
          </button>
        </div>
      </section>

      <section className="results-section container">
        <div className="results-head">
          <p>
            {loading ? 'Searching the shelf…' : <><strong>{meta?.total ?? 0}</strong> {meta?.total === 1 ? 'title' : 'titles'}</>}
            {filters.q && !loading && <span> for “{filters.q}”</span>}
            {filters.genre && !loading && <span> in {filters.genre}</span>}
          </p>
          <span className="results-range">
            {items.length && meta ? `Showing ${items.length} of ${meta.total}` : 'The complete index'}
          </span>
        </div>

        {error ? (
          <div className="inline-error">
            <p>{error}</p>
            <button className="button button-primary" onClick={() => setReloadToken((value) => value + 1)}>
              Try again
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
              {items.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}
            </div>
            {meta?.hasNextPage && (
              <div className="load-more-wrap">
                <button className="button button-outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <LoaderCircle size={15} className="spin" /> : <ArrowDown size={15} />}
                  {loadingMore ? 'Loading' : `Load more · ${meta.total - items.length} left`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p className="empty-index">No. 00</p>
            <h2>Nothing on this shelf.</h2>
            <p>Try a different mood, a broader year, or clear the filters and start again.</p>
            <div className="empty-actions">
              <button className="button button-primary" onClick={resetFilters}>Clear all filters</button>
              <button className="button button-quiet" onClick={surpriseMe} disabled={surprising}>
                <Dices size={16} /> Pick one for me
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
