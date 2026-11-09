import { ArrowDown, ArrowRight, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { SITE_URL, usePageSeo } from '../lib/seo';
import type { OtakuCard as OtakuCardType, OtakuListMeta } from '../types';

interface CatalogPageProps {
  kind: 'ongoing' | 'completed';
}

const COPY = {
  ongoing: {
    eyebrow: 'ReogNime / Sedang tayang',
    description: 'Semua seri di rak mingguan, dengan subtitle Indonesia dan episode baru.',
    other: 'completed',
    otherLabel: 'Anime tamat',
  },
  completed: {
    eyebrow: 'ReogNime / Tamat',
    description: 'Semua seri tamat di rak—yang bisa kamu mulai tanpa menunggu akhir.',
    other: 'ongoing',
    otherLabel: 'Sedang tayang',
  },
} as const;

export function CatalogPage({ kind }: CatalogPageProps) {
  const copy = COPY[kind];
  const pageTitle = kind === 'ongoing' ? 'Anime Tayang Sub Indo' : 'Anime Tamat Sub Indo';
  const pageDescription = kind === 'ongoing'
    ? 'Daftar anime tayang subtitle Indonesia terbaru di ReogNime, lengkap dengan episode baru, poster, dan jadwal mingguan.'
    : 'Daftar anime tamat subtitle Indonesia pilihan di ReogNime. Temukan seri lengkap yang bisa ditonton sampai akhir.';
  useDocumentTitle(pageTitle);
  usePageSeo({
    title: `${pageTitle} — ReogNime`,
    description: pageDescription,
    image: '/og-reognime.jpg',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: pageTitle,
      description: pageDescription,
      url: `${SITE_URL}/${kind}`,
      isPartOf: { '@type': 'WebSite', name: 'ReogNime', url: SITE_URL },
    },
  });
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
      notify(reason instanceof Error ? reason.message : 'Gagal memuat halaman berikutnya.', { tone: 'error' });
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
            <p className="section-index">Seluruh rak</p>
            <h1>{kind === 'ongoing' ? <>Masih <em>tayang.</em></> : <>Tamat, <em>tanpa tunggu.</em></>}</h1>
          </div>
          <div className="catalog-title-aside">
            <p>{copy.description}</p>
            <Link to="/search" className="catalog-search-link"><Search size={15} /> Cari semua judul</Link>
          </div>
        </div>
        <div className="catalog-toolbar">
          <div className="catalog-tabs">
            <Link to="/ongoing" className={kind === 'ongoing' ? 'is-active' : ''}>Tayang</Link>
            <Link to="/completed" className={kind === 'completed' ? 'is-active' : ''}>Tamat</Link>
            <Link to="/all">A–Z</Link>
          </div>
          <span className="catalog-count">
            {meta?.pagination
              ? `Halaman ${meta.pagination.currentPage} dari ${meta.pagination.totalPages} · ${items.length} tampil`
              : 'Memuat rak'}
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
            <button className="button button-primary" onClick={initial.reload}>Coba lagi</button>
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
                  {loadingMore ? 'Memuat' : 'Muat lebih banyak'}
                </button>
              </div>
            )}
            {!items.length && (
              <div className="empty-state">
                <p className="empty-index">No. 00</p>
                <h2>Belum ada di rak ini.</h2>
                <p>Provider belum mengirim judul. Coba lagi sebentar.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
