import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { genreLabel } from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { SITE_URL, breadcrumbJsonLd, pageGraph, usePageSeo } from '../lib/seo';
import type { OtakuCard as OtakuCardType, OtakuListMeta } from '../types';

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function GenresPage() {
  useDocumentTitle('Genre Anime Sub Indo');
  usePageSeo({
    title: 'Genre Anime Sub Indo — ReogNime',
    description: 'Jelajahi genre anime subtitle Indonesia di ReogNime: aksi, petualangan, drama, fantasi, romansa, dan banyak lagi.',
    image: '/og-reognime.jpg',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Genre Anime Sub Indo',
      description: 'Katalog genre anime subtitle Indonesia di ReogNime.',
      url: `${SITE_URL}/genres`,
    },
  });
  const genres = useApi((signal) => api.otaku.genres(signal), []);

  return (
    <div className="watch-page genre-index-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><span className="watch-live-dot" /> ReogNime / Genre</p>
          <Link to="/all" className="text-link">Semua anime A–Z <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">Genre</p>
            <h1>Pilih <em>genre.</em></h1>
          </div>
          <div className="catalog-title-aside">
            <p>
              {genres.data?.data.length ?? ''} genre. Pilih satu untuk melihat daftar judulnya.
            </p>
            <Link to="/search" className="catalog-search-link"><Search size={15} /> Cari anime</Link>
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
            <button className="button button-primary" onClick={genres.reload}>Coba lagi</button>
          </div>
        ) : (
          <div className="genre-index-grid">
            {genres.data?.data.map((genre, index) => (
              <Link to={`/genre/${encodeURIComponent(genre.slug)}`} className="genre-index-card" key={genre.slug}>
                <span className="genre-index-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="genre-index-name">{genreLabel(genre.name)}</span>
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
  const label = genreLabel(titleFromSlug(slug));
  useDocumentTitle(`Anime ${label} Sub Indo`);
  usePageSeo({
    title: `Anime ${label} Sub Indo — ReogNime`,
    description: `Daftar anime genre ${label} subtitle Indonesia di ReogNime. Jelajahi judul, poster, dan episode terbaru dalam satu rak.`,
    image: '/og-reognime.jpg',
    jsonLd: pageGraph(
      {
        '@type': 'CollectionPage',
        name: `Anime ${label} Sub Indo`,
        description: `Daftar anime genre ${label} subtitle Indonesia.`,
        url: `${SITE_URL}/genre/${encodeURIComponent(slug)}`,
      },
      breadcrumbJsonLd([
        { name: 'Beranda', path: '/' },
        { name: 'Genre', path: '/genres' },
        { name: label, path: `/genre/${encodeURIComponent(slug)}` },
      ]),
    ),
  });
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
      notify(reason instanceof Error ? reason.message : 'Gagal memuat judul lainnya.', { tone: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="watch-page genre-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <Link to="/genres" className="back-link-dark"><ArrowLeft size={14} /> Semua genre</Link>
          <Link to="/ongoing" className="text-link">Sedang tayang <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">Rak genre</p>
            <h1>{label}.</h1>
          </div>
          <div className="catalog-title-aside">
            <p>Semua judul dalam kategori {label}, dengan halaman langsung dari endpoint genre.</p>
            <span className="catalog-count">
              {meta?.pagination
                ? `${items.length} tampil · halaman ${meta.pagination.currentPage} dari ${meta.pagination.totalPages}`
                : 'Memuat rak'}
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
              <button className="button button-primary" onClick={initial.reload}>Coba lagi</button>
              <Link to="/genres" className="button button-quiet">Semua genre</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="watch-grid">
              {items.map((anime, index) => <OtakuCard key={anime.slug} anime={anime} eager={index < 5} />)}
            </div>
            {meta?.pagination?.hasNextPage && (
              <div className="load-more-wrap">
                <button className="button button-outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <LoaderCircle size={15} className="spin" /> : <ArrowDown size={15} />}
                  {loadingMore ? 'Memuat' : 'Muat lebih banyak'}
                </button>
              </div>
            )}
            {!items.length && (
              <div className="empty-state">
                <p className="empty-index">No. 00</p>
                <h2>Belum ada judul.</h2>
                <p>Genre ini masih kosong. Pilih rak lain.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
