import { ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { api } from '../lib/api';
import { genreLabel } from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { SITE_URL, breadcrumbJsonLd, pageGraph, usePageSeo } from '../lib/seo';

const MOOD_KEYS = ['tenang', 'hangat', 'seru', 'gelap'];

export function MoodPage() {
  const { mood: moodKey = 'tenang' } = useParams();
  const activeKey = MOOD_KEYS.includes(moodKey) ? moodKey : 'tenang';
  const moods = useApi((signal) => api.moods(signal), []);
  const data = moods.data?.data ?? [];
  const selected = data.find((mood) => mood.key === activeKey) ?? data[0] ?? null;
  useDocumentTitle(selected ? `Anime ${selected.label} Sub Indo` : 'Rekomendasi Suasana');
  usePageSeo({
    title: selected ? `Anime ${selected.label} Sub Indo — Rekomendasi — ReogNime` : 'Rekomendasi Suasana — ReogNime',
    description: selected
      ? `Rekomendasi anime ${selected.label.toLowerCase()} subtitle Indonesia: ${selected.description}`
      : 'Rekomendasi anime ReogNime berdasarkan suasana dan genre.',
    image: '/og-reognime.jpg',
    jsonLd: selected
      ? pageGraph(
          {
            '@type': 'CollectionPage',
            name: `Anime ${selected.label} Sub Indo`,
            description: selected.description,
            url: `${SITE_URL}/suasana/${selected.key}`,
            inLanguage: 'id-ID',
          },
          breadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Peta Suasana', path: '/suasana/tenang' },
            { name: selected.label, path: `/suasana/${selected.key}` },
          ]),
        )
      : null,
  });

  if (!MOOD_KEYS.includes(moodKey)) return <Navigate to="/suasana/tenang" replace />;

  return (
    <div className="watch-page mood-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <Link to="/" className="text-link"><ArrowLeft size={14} /> Beranda</Link>
          <Link to="/hari-ini" className="text-link">Pilihan hari ini <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">Rekomendasi suasana</p>
            <h1>Cari sesuai<br /><em>suasana.</em></h1>
          </div>
          <div className="catalog-title-aside">
            <p>Pilih satu suasana untuk melihat rekomendasi dari arsip ReogNime.</p>
            <Link to="/discover" className="catalog-search-link"><Compass size={15} /> Jelajahi semua filter</Link>
          </div>
        </div>
      </header>

      <div className="container mood-content">
        {moods.loading ? (
          <div className="mood-loading">
            <div className="skeleton skeleton-line skeleton-line-short" />
            <div className="skeleton skeleton-title" />
            <div className="poster-grid poster-grid-four">
              {Array.from({ length: 4 }, (_, index) => <div className="skeleton otaku-skeleton-poster" key={index} />)}
            </div>
          </div>
        ) : moods.error ? (
          <div className="inline-error">
            <p>{moods.error}</p>
            <button className="button button-primary" onClick={moods.reload}>Coba lagi</button>
          </div>
        ) : selected ? (
          <>
            <nav className="mood-switcher" aria-label="Pilih suasana">
              {data.map((mood) => (
                <Link
                  key={mood.key}
                  to={`/suasana/${mood.key}`}
                  className={`mood-switch ${mood.key === selected.key ? 'is-active' : ''}`}
                  aria-current={mood.key === selected.key ? 'page' : undefined}
                >
                  <span>{mood.label}</span>
                  <small>{mood.count}</small>
                </Link>
              ))}
            </nav>

            <section className="mood-feature">
              <div className="mood-feature-copy">
                <p className="section-index">Pilihan suasana</p>
                <h2>{selected.label}.</h2>
                <p>{selected.description}</p>
                <div className="mood-genres">
                  {selected.genres.map((genre) => <span key={genre}>{genreLabel(genre)}</span>)}
                </div>
              </div>
              <div className="mood-result-head">
                <span>{selected.anime.length} judul pilihan</span>
                <span>dari {selected.count} judul</span>
              </div>
            </section>

            <div className="poster-grid poster-grid-six mood-grid">
              {selected.anime.map((anime, index) => <AnimeCard key={anime.id} anime={anime} eager={index < 3} />)}
            </div>

            <div className="mood-footer">
              <p>Suasana lain:</p>
              <div className="mood-links">
                {data.filter((mood) => mood.key !== selected.key).map((mood) => (
                  <Link key={mood.key} to={`/suasana/${mood.key}`}>{mood.label} <ArrowRight size={13} /></Link>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
