import { ArrowRight, ArrowUpRight, Check, Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { useLibraryDialog } from '../components/LibraryDialog';
import { useLibrary } from '../context/LibraryContext';
import { api } from '../lib/api';
import {
  FORMAT_LABELS,
  SEASON_LABELS,
  STATUS_LABELS,
  episodeLabel,
  formatCount,
  formatScore,
  formatYear,
  genreLabel,
} from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { usePageSeo } from '../lib/seo';
import { mediaUrl } from '../lib/media';
import type { LibraryEntry } from '../types';

function SectionHead({
  index,
  title,
  description,
  to,
  action,
}: {
  index: string;
  title: string;
  description: string;
  to: string;
  action: string;
}) {
  return (
    <div className="section-head">
      <div>
        <p className="section-index">{index}</p>
        <h2>{title}</h2>
      </div>
      <div className="section-head-aside">
        <p>{description}</p>
        <Link to={to} className="text-link">
          {action} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function ShelfRow({ entry }: { entry: LibraryEntry }) {
  if (!entry.anime) return null;
  const total = entry.anime.episodes;
  const percent = total ? Math.min(100, (entry.progress / total) * 100) : 0;
  return (
    <Link to={`/anime/${entry.anime.id}`} className="shelf-row">
      <img src={mediaUrl(entry.anime.cover)} alt="" />
      <span className="shelf-row-copy">
        <strong>{entry.anime.title}</strong>
        <span>{STATUS_LABELS[entry.status]} · {entry.progress}/{total ?? '—'}</span>
        <span className="shelf-progress"><span style={{ width: `${percent}%` }} /></span>
      </span>
      <ArrowUpRight size={15} />
    </Link>
  );
}

export function ArchivePage() {
  useDocumentTitle('Arsip Anime Pilihan');
  usePageSeo({
    title: 'Arsip Anime Pilihan — ReogNime',
    description: 'Arsip editorial ReogNime: rekomendasi anime pilihan, kanon, daftar tayangan, dan katalog AniList untuk menemukan cerita baru.',
    image: '/og-reognime.jpg',
  });
  const { data: response, loading, error, reload } = useApi((signal) => api.home(signal), []);
  const data = response?.data ?? null;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const { getEntry, entries, stats } = useLibrary();
  const { open: openLibrary } = useLibraryDialog();

  useEffect(() => {
    if (!data?.spotlight.length || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % data.spotlight.length);
    }, 8500);
    return () => window.clearInterval(timer);
  }, [data, paused]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="container">
          <div className="hero-skeleton skeleton" />
          <div className="skeleton-section">
            <div className="skeleton skeleton-title" />
            <div className="poster-grid poster-grid-six">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="skeleton-card">
                  <div className="skeleton skeleton-poster" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line skeleton-line-short" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container error-page">
        <p className="eyebrow">Koneksi terputus</p>
        <h1>Arsip belum bisa dimuat.</h1>
        <p>{error ?? 'Katalog tidak bisa dimuat.'}</p>
        <button className="button button-primary" onClick={reload}>Coba lagi</button>
      </div>
    );
  }

  const feature = data.spotlight[active] ?? data.spotlight[0];
  const entry = feature ? getEntry(feature.id) : undefined;
  const watching = entries.filter((item) => item.status === 'WATCHING').slice(0, 2);
  const shelfItems = watching.length ? watching : entries.slice(0, 2);

  return (
    <div className="home-page">
      <section
        className="hero"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="hero-media">
          {data.spotlight.map((anime, index) => (
            <div className={`hero-slide ${index === active ? 'is-active' : ''}`} key={anime.id} aria-hidden={index !== active}>
              <img src={mediaUrl(anime.banner ?? anime.cover)} alt={`Ilustrasi ${anime.title}`} loading={index === active ? 'eager' : 'lazy'} decoding="async" />
            </div>
          ))}
          <div className="hero-vignette" />
          <div className="hero-grain" />
        </div>

        <div className="hero-topline container-wide">
          <span>Arsip ReogNime</span>
          <span className="hero-topline-right">Edisi 01 · {data.season.year}</span>
        </div>

        <div className="hero-content container-wide">
          <div className="hero-copy" key={feature.id}>
            <p className="hero-kicker">
              <span className="accent-dot" />
              {feature.genres.slice(0, 2).map(genreLabel).join(' / ')} · {SEASON_LABELS[feature.season ?? 'FALL']} {feature.seasonYear}
            </p>
            <h1>{feature.title}</h1>
            <p className="hero-native">{feature.nativeTitle}</p>
            <div className="hero-meta">
              <span className="hero-rating">★ {formatScore(feature.score)}</span>
              <span>{FORMAT_LABELS[feature.format]}</span>
              <span>{episodeLabel(feature.episodes)}</span>
              {feature.studios[0] && <span>{feature.studios[0]}</span>}
            </div>
            <div className="hero-actions">
              <Link to={`/anime/${feature.id}`} className="button button-paper">
                Jelajahi judul <ArrowUpRight size={16} />
              </Link>
              <button className="button button-ghost-light" onClick={() => openLibrary(feature)}>
                {entry ? <Check size={16} /> : <Plus size={16} />}
                {entry ? 'Di daftar' : 'Tambah ke daftar'}
              </button>
            </div>
          </div>

          <div className="hero-side">
            <span className="hero-vertical-label">ARSIP — pilihan</span>
            <div className="hero-pager" aria-label="Judul unggulan">
              {data.spotlight.map((anime, index) => (
                <button
                  key={anime.id}
                  className={`hero-pager-item ${index === active ? 'is-active' : ''}`}
                  onClick={() => setActive(index)}
                  aria-label={`Tampilkan ${anime.title}`}
                  aria-current={index === active}
                >
                  <span className="hero-pager-number">0{index + 1}</span>
                  <span className="hero-pager-line" />
                  <span className="hero-pager-title">{anime.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dispatch container">
        <span className="eyebrow">Arsip / 001</span>
        <p>
          Arsip berisi {data.stats.titles} film dan seri, dari {data.stats.earliestYear} sampai sekarang. Pilih berdasarkan genre, tahun, atau skor.
        </p>
        <Link to="/discover" className="text-link">
          Buka indeks <ArrowRight size={14} />
        </Link>
      </section>

      <section className="section container">
        <SectionHead
          index="01 — Pilihan"
          title="Pilihan arsip"
          description="Judul yang sedang banyak dibuka di arsip."
          to="/discover?sort=popularity"
          action="Lihat semua judul"
        />
        <div className="poster-grid poster-grid-six home-trending">
          {data.trending.slice(0, 6).map((anime, index) => (
            <AnimeCard key={anime.id} anime={anime} eager={index < 6} />
          ))}
        </div>
      </section>

      <section className="canon-section">
        <div className="container">
          <div className="canon-head">
            <div>
              <p className="section-index light">02 — Skor</p>
              <h2>Peringkat<br />tertinggi.</h2>
            </div>
            <div className="canon-head-aside">
              <p>
                Daftar ini diurutkan berdasarkan skor AniList. Skor membantu, tetapi bukan penilaian akhir.
              </p>
              <Link to="/discover?sort=score" className="text-link light">
                Lihat peringkat teratas <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="canon-layout">
            <ol className="canon-list">
              {data.topRated.map((anime, index) => (
                <li key={anime.id}>
                  <Link to={`/anime/${anime.id}`} className="canon-row">
                    <span className="canon-number">{String(index + 1).padStart(2, '0')}</span>
                    <img src={mediaUrl(anime.cover)} alt="" className="canon-cover" />
                    <span className="canon-copy">
                      <strong>{anime.title}</strong>
                      <span>{FORMAT_LABELS[anime.format]} · {formatYear(anime.seasonYear)} · {genreLabel(anime.genres[0])}</span>
                    </span>
                    <span className="canon-score">{formatScore(anime.score)}</span>
                    <ArrowUpRight size={16} className="canon-arrow" />
                  </Link>
                </li>
              ))}
            </ol>

            <aside className="canon-note">
              <span className="canon-quote-mark">“</span>
              <p className="canon-quote">
                Skor adalah ringkasan dari penonton, bukan satu-satunya alasan untuk menonton.
              </p>
              <div className="canon-note-bottom">
                <span className="canon-rule" />
                <span>Arsip ReogNime<br />2026</span>
              </div>
              <Sparkles size={20} strokeWidth={1.2} className="canon-spark" />
            </aside>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHead
          index="03 — Genre"
          title="Pilih genre."
          description="Lihat katalog berdasarkan genre yang kamu suka."
          to="/discover"
          action="Buka semua saringan"
        />
        <div className="genre-grid">
          {data.genres.map((genre, index) => (
            <Link to={`/discover?genre=${encodeURIComponent(genre.name)}`} className="genre-tile" key={genre.name}>
              <span className="genre-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="genre-name">{genreLabel(genre.name)}</span>
              <span className="genre-count">{formatCount(genre.count)} judul</span>
              <ArrowUpRight size={17} className="genre-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="section container section-last">
        <SectionHead
          index="04 — Terbaru"
          title="Baru ditambahkan"
          description="Film dan seri yang baru masuk ke arsip."
          to="/discover?sort=newest"
          action="Jelajahi rilisan baru"
        />
        <div className="poster-grid poster-grid-four">
          {data.newReleases.slice(0, 4).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      <section className="library-band container">
        <div className="library-band-copy">
          <p className="section-index">Daftar saya</p>
          <h2>Daftar<br />tontonan.</h2>
          <p>Simpan judul, catat episode, dan beri skor. Tersimpan di perangkat, tanpa akun.</p>
          <Link to="/library" className="button button-ink">
            Buka daftar <ArrowRight size={16} />
          </Link>
        </div>
        <div className="shelf-preview">
          <div className="shelf-preview-head">
            <span>Sedang ditonton</span>
            <span>{stats.total} entri</span>
          </div>
          {shelfItems.length ? (
            shelfItems.map((item) => <ShelfRow key={item.animeId} entry={item} />)
          ) : (
            <div className="shelf-empty">
              <p>Rakmu menunggu.</p>
              <Link to="/discover">Cari judul pertama <ArrowRight size={14} /></Link>
            </div>
          )}
          <div className="shelf-preview-footer">
            <div>
              <strong>{stats.episodesWatched}</strong>
              <span>episode tercatat</span>
            </div>
            <div>
              <strong>{stats.meanScore ? stats.meanScore.toFixed(1) : '—'}</strong>
              <span>rata-rata skor</span>
            </div>
            <div>
              <strong>{stats.favorites}</strong>
              <span>favorit</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
