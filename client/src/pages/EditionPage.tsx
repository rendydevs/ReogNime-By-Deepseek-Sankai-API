import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { OtakuPoster } from '../components/OtakuPoster';
import { api } from '../lib/api';
import { FORMAT_LABELS, formatScore, formatYear, genreLabel } from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { SITE_URL, breadcrumbJsonLd, pageGraph, usePageSeo } from '../lib/seo';

export function EditionPage() {
  useDocumentTitle('Pilihan Hari Ini');
  const edition = useApi((signal) => api.edition(signal), []);
  const moods = useApi((signal) => api.moods(signal), []);
  const schedule = useApi((signal) => api.otaku.schedule(signal), []);
  const data = edition.data?.data ?? null;
  const moodList = moods.data?.data ?? [];

  usePageSeo({
    title: 'Pilihan Hari Ini — ReogNime',
    description: data
      ? `Pilihan anime untuk ${data.dateLabel}, dengan suasana ${data.mood.label.toLowerCase()} dan jadwal tayang.`
      : 'Pilihan anime hari ini, rekomendasi suasana, dan jadwal tayang di ReogNime.',
    image: data?.pick?.banner || data?.pick?.cover || '/og-reognime.jpg',
    jsonLd: data
      ? pageGraph(
          {
            '@type': 'CollectionPage',
            name: `Anime Hari Ini — ${data.dateLabel}`,
            description: `Pilihan anime dan jadwal tayang untuk ${data.dateLabel}.`,
            url: `${SITE_URL}/hari-ini`,
            inLanguage: 'id-ID',
          },
          {
            '@type': 'ItemList',
            itemListElement: data.top.map((anime, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: anime.title,
              url: `${SITE_URL}/anime/${anime.id}`,
            })),
          },
          breadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Hari Ini', path: '/hari-ini' },
          ]),
        )
      : null,
  });

  const todaySchedule = data
    ? (schedule.data?.data ?? []).find((day) => day.day === data.weekday)?.animeList ?? []
    : [];

  if (edition.loading) {
    return (
      <div className="watch-page edition-page">
        <div className="container edition-loading">
          <div className="skeleton skeleton-line skeleton-line-short" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-detail-copy" />
        </div>
      </div>
    );
  }

  if (edition.error || !data) {
    return (
      <div className="container error-page">
        <p className="eyebrow">Pilihan hari ini</p>
        <h1>Pilihan hari ini belum siap.</h1>
        <p>{edition.error ?? 'Pilihan hari ini belum bisa dimuat.'}</p>
        <div className="empty-actions">
          <button className="button button-primary" onClick={edition.reload}>Coba lagi</button>
          <Link to="/" className="button button-quiet">Kembali ke beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-page edition-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><CalendarDays size={13} /> Pilihan hari ini <span className="edition-date">· {data.dateLabel}</span></p>
          <Link to={`/suasana/${data.mood.key}`} className="text-link" aria-label="Buka rekomendasi suasana">Rekomendasi <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">Dari arsip</p>
            <h1>Pilihan <em>hari ini.</em></h1>
          </div>
          <div className="catalog-title-aside">
            <p>{data.mood.description}</p>
            <Link to={`/suasana/${data.mood.key}`} className="catalog-search-link">
              <Sparkles size={15} /> Lihat rekomendasi {data.mood.label.toLowerCase()}
            </Link>
          </div>
        </div>
      </header>

      <div className="container edition-content">
        {data.pick && (
          <section className="edition-pick">
            <div className="edition-pick-art">
              <OtakuPoster title={data.pick.title} poster={data.pick.cover} className="edition-pick-poster" eager />
            </div>
            <div className="edition-pick-copy">
              <p className="section-index">Pilihan dari arsip</p>
              <h2>{data.pick.title}</h2>
              {data.pick.originalTitle && data.pick.originalTitle.toLowerCase() !== data.pick.title.toLowerCase() && (
                <p className="edition-native">{data.pick.originalTitle}</p>
              )}
              <div className="edition-facts">
                <span>★ {formatScore(data.pick.score)}</span>
                <span>{FORMAT_LABELS[data.pick.format]}</span>
                <span>{formatYear(data.pick.seasonYear)}</span>
                {data.pick.genres.slice(0, 3).map((genre) => <span key={genre}>{genreLabel(genre)}</span>)}
              </div>
              <p className="edition-reason">{data.pick.reason}</p>
              <div className="edition-actions">
                <Link to={`/anime/${data.pick.id}`} className="button button-primary">Lihat detail <ArrowRight size={15} /></Link>
                <Link to={`/suasana/${data.mood.key}`} className="button button-quiet">Lihat suasana</Link>
              </div>
            </div>
          </section>
        )}

        <section className="edition-section">
          <div className="edition-section-head">
            <div>
              <p className="section-index">01 — Suasana</p>
              <h2>Pilih suasana.</h2>
            </div>
            <p>Pilih salah satu untuk melihat daftar judulnya.</p>
          </div>
          <div className="edition-mood-grid">
            {moodList.map((mood) => (
              <Link to={`/suasana/${mood.key}`} className="edition-mood-card" key={mood.key}>
                <span>{mood.label}</span>
                <small>{mood.count} judul</small>
                <p>{mood.genres.map(genreLabel).join(' · ')}</p>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </section>

        <section className="edition-section">
          <div className="edition-section-head">
            <div>
              <p className="section-index">02 — Rekomendasi</p>
              <h2>Pilihan lain.</h2>
            </div>
            <Link to="/archive" className="text-link">Jelajahi arsip <ArrowRight size={14} /></Link>
          </div>
          <div className="poster-grid poster-grid-four">
            {data.top.map((anime, index) => <AnimeCard key={anime.id} anime={anime} eager={index < 4} />)}
          </div>
        </section>

        <section className="edition-section">
          <div className="edition-section-head">
            <div>
              <p className="section-index">03 — Jadwal</p>
              <h2>Tayang hari ini.</h2>
            </div>
            <Link to="/schedule" className="text-link">Jadwal lengkap <ArrowRight size={14} /></Link>
          </div>
          {todaySchedule.length ? (
            <div className="edition-schedule">
              {todaySchedule.map((anime) => (
                <Link to={`/watch/anime/${anime.slug}`} className="edition-schedule-item" key={anime.slug}>
                  <OtakuPoster title={anime.title} poster={anime.poster} className="edition-schedule-poster" />
                  <span>{anime.title}</span>
                  <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="inline-note">Belum ada jadwal yang cocok untuk hari ini.</p>
          )}
        </section>

        <p className="watch-attribution">Edisi dihitung dari arsip ReogNime dan jadwal publik. ReogNime tidak menghosting file video.</p>
      </div>
    </div>
  );
}
