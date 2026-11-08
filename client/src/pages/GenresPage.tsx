import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import type { OtakuCard as OtakuCardType, OtakuListMeta } from '../types';

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function GenresPage() {
  useDocumentTitle('Genre Anime Sub Indo');
  const genres = useApi((signal) => api.otaku.genres(signal), []);

  return (
    <div className="watch-page genre-index-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><span className="watch-live-dot" /> ReogNime / Genres</p>
          <Link to="/all" className="text-link">All anime A–Z <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">Find a mood</p>
            <h1>Every kind<br />of <em>story.</em></h1>
          </div>
          <div className="catalog-title-aside">
            <p>
              All {genres.data?.data.length ?? ''} genres, each one a complete,
              paginated shelf powered by the watch API.
            </p>
            <Link to="/search" className="catalog-search-link"><Search size={15} /> Search instead</Link>
          </div>
        </div>
      </header>

      <div className="container genre-index-content">
        {genres.loading ? (
          <div className="genre-index-grid">
            {Array.from({ length: 18 }, (_, index) => <div className="skeleton genre-skeleton" key={index} />)}
          </div>
        ) : genres.error ? (
          <div className="inline-error">
            <p>{genres.error}</p>
            <button className="button button-primary" onClick={genres.reload}>Try again</button>
          </div>
        ) : (
          <div className="genre-index-grid">
            {genres.data?.data.map((genre, index) => (
              <Link to={`/genre/${encodeURIComponent(genre.slug)}`} className="genre-index-card" key={genre.slug}>
                <span className="genre-index-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="genre-index-name">{genre.name}</span>
                <span className="genre-index-arrow"><ArrowUpRight size={16} /></span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GenrePage() {
  const { slug = '' } = useParams();
  const label = titleFromSlug(slug);
  useDocumentTitle(`${label} Sub Indo`);
  const initial = useApi((signal) => api.otaku.genre(slug, 1, signal), [slug]);
  const { notify } = useToast();
  const [items, setItems] = useState<OtakuCardType[]>([]);
  const [meta, setMeta] = useState<OtakuListMeta | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (initial.data) {
      setItems(initial.data.data);
      setMeta(initial.data.meta);
    }
  }, [initial.data]);

  const loadMore = async () => {
    const pagination = meta?.pagination;
    if (!pagination?.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const payload = await api.otaku.genre(slug, pagination.nextPage ?? pagination.currentPage + 1);
      setItems((current) => [...current, ...payload.data]);
      setMeta(payload.meta);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Could not load more titles.', { tone: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="watch-page genre-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <Link to="/genres" className="back-link-dark"><ArrowLeft size={14} /> All genres</Link>
          <Link to="/ongoing" className="text-link">Airing now <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">Genre shelf</p>
            <h1>{label}.</h1>
          </div>
          <div className="catalog-title-aside">
            <p>Every title filed under {label}, with pagination straight from the genre endpoint.</p>
            <span className="catalog-count">
              {meta?.pagination
                ? `${items.length} loaded · page ${meta.pagination.currentPage} of ${meta.pagination.totalPages}`
                : 'Loading the shelf'}
            </span>
          </div>
        </div>
      </header>

      <div className="container catalog-content">
        {initial.loading ? (
          <div className="watch-grid">
            {Array.from({ length: 10 }, (_, index) => (
              <div className="otaku-skeleton" key={index}>
                <div className="skeleton otaku-skeleton-poster" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line skeleton-line-short" />
              </div>
            ))}
          </div>
        ) : initial.error ? (
          <div className="inline-error">
            <p>{initial.error}</p>
            <div className="empty-actions">
              <button className="button button-primary" onClick={initial.reload}>Try again</button>
              <Link to="/genres" className="button button-quiet">All genres</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="watch-grid">
              {items.map((anime) => <OtakuCard key={anime.slug} anime={anime} />)}
            </div>
            {meta?.pagination?.hasNextPage && (
              <div className="load-more-wrap">
                <button className="button button-outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <LoaderCircle size={15} className="spin" /> : <ArrowDown size={15} />}
                  {loadingMore ? 'Loading' : 'Load more titles'}
                </button>
              </div>
            )}
            {!items.length && (
              <div className="empty-state">
                <p className="empty-index">No. 00</p>
                <h2>No titles here.</h2>
                <p>This genre came back empty. Choose another shelf.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
