import { ArrowDown, ArrowRight, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import type { OtakuCard as OtakuCardType, OtakuListMeta } from '../types';

interface CatalogPageProps {
  kind: 'ongoing' | 'completed';
}

const COPY = {
  ongoing: {
    eyebrow: 'ReogNime / Currently airing',
    description: 'Every series currently on the weekly shelf, with Indonesian subtitles and fresh episodes.',
    other: 'completed',
    otherLabel: 'Completed anime',
  },
  completed: {
    eyebrow: 'ReogNime / Completed',
    description: 'Every completed series on the shelf — the ones you can start knowing there is an ending.',
    other: 'ongoing',
    otherLabel: 'Airing now',
  },
} as const;

export function CatalogPage({ kind }: CatalogPageProps) {
  const copy = COPY[kind];
  useDocumentTitle(kind === 'ongoing' ? 'Ongoing anime' : 'Completed anime');
  const initial = useApi((signal) => api.otaku.list(kind, 1, signal), [kind]);
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
      const payload = await api.otaku.list(kind, pagination.nextPage ?? pagination.currentPage + 1);
      setItems((current) => [...current, ...payload.data]);
      setMeta(payload.meta);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Could not load the next page.', { tone: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="watch-page catalog-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><span className="watch-live-dot" /> {copy.eyebrow}</p>
          <Link to={`/${copy.other}`} className="text-link">{copy.otherLabel} <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">The whole shelf</p>
            <h1>{kind === 'ongoing' ? <>Still <em>airing.</em></> : <>Finished, <em>waiting.</em></>}</h1>
          </div>
          <div className="catalog-title-aside">
            <p>{copy.description}</p>
            <Link to="/search" className="catalog-search-link"><Search size={15} /> Search every title</Link>
          </div>
        </div>
        <div className="catalog-toolbar">
          <div className="catalog-tabs">
            <Link to="/ongoing" className={kind === 'ongoing' ? 'is-active' : ''}>Ongoing</Link>
            <Link to="/completed" className={kind === 'completed' ? 'is-active' : ''}>Completed</Link>
            <Link to="/all">A–Z</Link>
          </div>
          <span className="catalog-count">
            {meta?.pagination
              ? `Page ${meta.pagination.currentPage} of ${meta.pagination.totalPages} · ${items.length} loaded`
              : 'Loading the shelf'}
          </span>
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
            <button className="button button-primary" onClick={initial.reload}>Try again</button>
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
                <h2>Nothing on this shelf.</h2>
                <p>The provider returned no titles right now. Try again in a moment.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
