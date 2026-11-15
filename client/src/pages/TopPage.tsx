import { ArrowRight, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { FORMAT_LABELS, formatScore, formatYear, genreLabel } from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { mediaUrl } from '../lib/media';
import { SITE_URL, breadcrumbJsonLd, pageGraph, usePageSeo } from '../lib/seo';
import type { AnimeSummary, PageMeta } from '../types';

const RANK_LIMIT = 15;
type TopSort = 'score' | 'popularity';

const SORT_OPTIONS: { value: TopSort; label: string }[] = [
  { value: 'score', label: 'Skor tertinggi' },
  { value: 'popularity', label: 'Paling banyak ditonton' },
];

export function TopPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('genre') ?? '';
  const sort: TopSort = params.get('sort') === 'popularity' ? 'popularity' : 'score';
  const filters = useApi((signal) => api.filters(signal), []);
  const genres = useMemo(
    () => [...(filters.data?.data.genres ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [filters.data],
  );
  const selectedGenre = genres.find((genre) => genre.name === selected);
  const selectedLabel = selectedGenre ? genreLabel(selectedGenre.name) : null;

  const canonicalParams = new URLSearchParams();
  if (selected) canonicalParams.set('genre', selected);
  if (sort === 'popularity') canonicalParams.set('sort', 'popularity');
  const canonicalUrl = `${SITE_URL}/top${canonicalParams.size ? `?${canonicalParams.toString()}` : ''}`;

  const [items, setItems] = useState<AnimeSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useDocumentTitle(selectedLabel ? `Peringkat Anime ${selectedLabel}` : 'Peringkat Anime');
  usePageSeo({
    title: selectedLabel ? `Peringkat Anime ${selectedLabel} — ReogNime` : 'Peringkat Anime — ReogNime',
    description: selectedLabel
      ? `Peringkat anime genre ${selectedLabel} berdasarkan ${sort === 'popularity' ? 'popularitas' : 'skor'} AniList di ReogNime.`
      : 'Peringkat anime berdasarkan skor dan popularitas AniList. Pilih genre untuk peringkat khusus.',
    image: items[0]?.banner ?? items[0]?.cover ?? '/og-reognime-2026.jpg',
    jsonLd: pageGraph(
      {
        '@type': 'CollectionPage',
        name: selectedLabel ? `Peringkat Anime ${selectedLabel}` : 'Peringkat Anime',
        description: selectedLabel
          ? `Peringkat anime genre ${selectedLabel} berdasarkan skor dan popularitas AniList.`
          : 'Peringkat anime berdasarkan skor dan popularitas AniList di ReogNime.',
        url: canonicalUrl,
        inLanguage: 'id-ID',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.slice(0, 10).map((anime, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: anime.title,
            url: `${SITE_URL}/anime/${anime.id}`,
          })),
        },
      },
      breadcrumbJsonLd([
        { name: 'Beranda', path: '/' },
        { name: 'Peringkat Anime', path: '/top' },
      ]),
    ),
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .list(
        {
          genre: selected || undefined,
          sort,
          page: 1,
          limit: RANK_LIMIT,
        },
        controller.signal,
      )
      .then((payload) => {
        setItems(payload.data);
        setMeta(payload.meta);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Peringkat tidak bisa dimuat.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selected, sort, reloadToken]);

  const chooseGenre = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('genre', value);
    else next.delete('genre');
    setParams(next);
  };

  const chooseSort = (value: TopSort) => {
    const next = new URLSearchParams(params);
    if (value === 'popularity') next.set('sort', 'popularity');
    else next.delete('sort');
    setParams(next);
  };

  const feature = items[0] ?? null;
  const rest = items.slice(1);

  return (
    <div className="watch-page top-page">
      <header className="container top-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><Trophy size={13} /> Peringkat AniList</p>
          <Link to="/discover?sort=score" className="text-link">Buka indeks <ArrowRight size={14} /></Link>
        </div>
        <div className="top-title-row">
          <div>
            <p className="section-index">Peringkat anime</p>
            <h1>Peringkat <em>anime.</em></h1>
          </div>
          <p>
            Diurutkan dari skor atau popularitas AniList. Pilih genre untuk
            melihat peringkat khusus genre tersebut.
          </p>
        </div>
        <div className="top-controls">
          <div className="top-sort" role="group" aria-label="Dasar peringkat">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={sort === option.value ? 'is-active' : ''}
                onClick={() => chooseSort(option.value)}
                aria-pressed={sort === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="top-genre-select">
            <span>Genre</span>
            <select
              value={selected}
              onChange={(event) => chooseGenre(event.target.value)}
              disabled={filters.loading}
            >
              <option value="">Semua genre</option>
              {genres.map((genre) => (
                <option key={genre.name} value={genre.name}>
                  {genreLabel(genre.name)} ({genre.count})
                </option>
              ))}
            </select>
          </label>
          <span className="top-count">
            {meta ? `${meta.total} judul` : loading ? 'Memuat' : '—'}
          </span>
        </div>
        <p className="top-source-note">
          Peringkat skor dan popularitas bersumber dari data AniList.
        </p>
      </header>

      <main className="container top-content">
        {loading ? (
          <div className="top-loading">
            <div className="skeleton top-spotlight-skeleton" />
            {Array.from({ length: 5 }, (_, index) => (
              <div className="skeleton top-row-skeleton" key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="inline-error">
            <p>{error}</p>
            <button className="button button-primary" onClick={() => setReloadToken((value) => value + 1)}>
              Coba lagi
            </button>
          </div>
        ) : !feature ? (
          <div className="empty-state top-empty">
            <p className="empty-index">Belum ada peringkat</p>
            <h2>Genre ini masih kosong.</h2>
            <button className="button button-primary" onClick={() => chooseGenre('')}>Lihat semua genre</button>
          </div>
        ) : (
          <>
            <section className="top-spotlight" aria-labelledby="top-spotlight-title">
              <div className="top-spotlight-media">
                <img
                  src={mediaUrl(feature.banner ?? feature.cover)}
                  alt=""
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <span className="top-spotlight-shade" />
              </div>
              <span
                className="top-banner-score"
                aria-label={`Skor ${formatScore(feature.score)} dari 10`}
              >
                ★ {formatScore(feature.score)}
              </span>
              <div className="top-spotlight-copy">
                <p className="top-rank-kicker"><Trophy size={13} /> Peringkat 01</p>
                <h2 id="top-spotlight-title">
                  <Link to={`/anime/${feature.id}`}>{feature.title}</Link>
                </h2>
                <p className="top-spotlight-meta">
                  {FORMAT_LABELS[feature.format]} · {formatYear(feature.seasonYear)}
                  {feature.genres.length > 0 ? ` · ${feature.genres.slice(0, 3).map(genreLabel).join(', ')}` : ''}
                </p>
                <div className="top-spotlight-foot">
                  <Link to={`/anime/${feature.id}`} className="button button-paper">
                    Lihat detail <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </section>

            {rest.length > 0 ? (
              <section className="top-list-section" aria-labelledby="top-list-title">
                <div className="top-list-head">
                  <div>
                    <p className="section-index">Peringkat 02–{String(items.length).padStart(2, '0')}</p>
                    <h2 id="top-list-title">Selanjutnya.</h2>
                  </div>
                  <span>{selectedLabel ? `Genre ${selectedLabel}` : 'Semua genre'} · {sort === 'popularity' ? 'Paling banyak ditonton' : 'Skor tertinggi'}</span>
                </div>
                <ol className="top-list">
                  {rest.map((anime, index) => {
                    const rank = index + 2;
                    return (
                      <li key={anime.id}>
                        <Link to={`/anime/${anime.id}`} className="top-row">
                          <span className="top-row-rank">{String(rank).padStart(2, '0')}</span>
                          <span className="top-row-art">
                            <img
                              src={mediaUrl(anime.banner ?? anime.cover)}
                              alt=""
                              loading={index < 3 ? 'eager' : 'lazy'}
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                            <span className="top-row-score">★ {formatScore(anime.score)}</span>
                          </span>
                          <span className="top-row-copy">
                            <strong>{anime.title}</strong>
                            <span>
                              {FORMAT_LABELS[anime.format]} · {formatYear(anime.seasonYear)}
                              {anime.genres.length > 0 ? ` · ${anime.genres.slice(0, 2).map(genreLabel).join(', ')}` : ''}
                            </span>
                          </span>
                          <ArrowRight size={16} className="top-row-arrow" />
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
