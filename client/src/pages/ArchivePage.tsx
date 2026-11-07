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
  plural,
  truncate,
} from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
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
  useDocumentTitle('The archive');
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
        <p className="eyebrow">Connection lost</p>
        <h1>The shelf is out of reach.</h1>
        <p>{error ?? 'The catalog could not be loaded.'}</p>
        <button className="button button-primary" onClick={reload}>Try again</button>
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
              <img src={mediaUrl(anime.banner ?? anime.cover)} alt={`${anime.title} artwork`} />
            </div>
          ))}
          <div className="hero-vignette" />
          <div className="hero-grain" />
        </div>

        <div className="hero-topline container-wide">
          <span>ReogNime archive</span>
          <span className="hero-topline-right">Issue 01 · {data.season.year}</span>
        </div>

        <div className="hero-content container-wide">
          <div className="hero-copy" key={feature.id}>
            <p className="hero-kicker">
              <span className="accent-dot" />
              {feature.genres.slice(0, 2).join(' / ')} · {SEASON_LABELS[feature.season ?? 'FALL']} {feature.seasonYear}
            </p>
            <h1>{feature.title}</h1>
            <p className="hero-native">{feature.nativeTitle}</p>
            <div className="hero-meta">
              <span className="hero-rating">★ {formatScore(feature.score)}</span>
              <span>{FORMAT_LABELS[feature.format]}</span>
              <span>{episodeLabel(feature.episodes)}</span>
              {feature.studios[0] && <span>{feature.studios[0]}</span>}
            </div>
            <p className="hero-synopsis">{truncate(feature.synopsis, 235)}</p>
            <div className="hero-actions">
              <Link to={`/anime/${feature.id}`} className="button button-paper">
                Explore title <ArrowUpRight size={16} />
              </Link>
              <button className="button button-ghost-light" onClick={() => openLibrary(feature)}>
                {entry ? <Check size={16} /> : <Plus size={16} />}
                {entry ? 'In your list' : 'Add to list'}
              </button>
            </div>
          </div>

          <div className="hero-side">
            <span className="hero-vertical-label">ARSIP — selected</span>
            <div className="hero-pager" aria-label="Featured titles">
              {data.spotlight.map((anime, index) => (
                <button
                  key={anime.id}
                  className={`hero-pager-item ${index === active ? 'is-active' : ''}`}
                  onClick={() => setActive(index)}
                  aria-label={`Show ${anime.title}`}
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
        <span className="eyebrow">Dispatch / 001</span>
        <p>
          A hand-kept index of {data.stats.titles} films and series, from {data.stats.earliestYear} to today.
          No infinite feed. No scores out of a hundred. Just the good ones, considered.
        </p>
        <Link to="/discover" className="text-link">
          Enter the index <ArrowRight size={14} />
        </Link>
      </section>

      <section className="section container">
        <SectionHead
          index="01 — Now showing"
          title="Worth your attention"
          description="A rotating shelf of what people are watching, rewatching, and arguing about."
          to="/discover?sort=popularity"
          action="See all titles"
        />
        <div className="poster-grid poster-grid-six home-trending">
          {data.trending.slice(0, 6).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      <section className="canon-section">
        <div className="container">
          <div className="canon-head">
            <div>
              <p className="section-index light">02 — The canon</p>
              <h2>The ones we<br />keep returning to.</h2>
            </div>
            <div className="canon-head-aside">
              <p>
                Ratings are only a shorthand. These are the titles that stay with you after the credits —
                the endings you argue about, the frames you keep.
              </p>
              <Link to="/discover?sort=score" className="text-link light">
                Browse top rated <ArrowRight size={14} />
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
                      <span>{FORMAT_LABELS[anime.format]} · {formatYear(anime.seasonYear)} · {anime.genres[0]}</span>
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
                A canon is personal. This one is ours — shaped by late nights, rewatches, and endings that refused to leave.
              </p>
              <div className="canon-note-bottom">
                <span className="canon-rule" />
                <span>Notes from the shelf<br />Vol. 01 / 2026</span>
              </div>
              <Sparkles size={20} strokeWidth={1.2} className="canon-spark" />
            </aside>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHead
          index="03 — By feeling"
          title="Follow a mood, not an algorithm."
          description="Eight doorways into the index. Pick the one that sounds like tonight."
          to="/discover"
          action="Open all filters"
        />
        <div className="genre-grid">
          {data.genres.map((genre, index) => (
            <Link to={`/discover?genre=${encodeURIComponent(genre.name)}`} className="genre-tile" key={genre.name}>
              <span className="genre-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="genre-name">{genre.name}</span>
              <span className="genre-count">{formatCount(genre.count)} titles</span>
              <ArrowUpRight size={17} className="genre-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="section container section-last">
        <SectionHead
          index="04 — Just arrived"
          title="New to the shelf"
          description="Recent additions, films, and seasons worth catching up on."
          to="/discover?sort=newest"
          action="Browse new releases"
        />
        <div className="poster-grid poster-grid-four">
          {data.newReleases.slice(0, 4).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      <section className="library-band container">
        <div className="library-band-copy">
          <p className="section-index">Your shelf</p>
          <h2>A list that<br />feels like yours.</h2>
          <p>
            Track episodes, keep a private note, give something a score when you're ready.
            It stays on your device — no account, no feed, no noise.
          </p>
          <Link to="/library" className="button button-ink">
            Open my list <ArrowRight size={16} />
          </Link>
        </div>
        <div className="shelf-preview">
          <div className="shelf-preview-head">
            <span>Currently watching</span>
            <span>{plural(stats.total, 'entry', 'entries')}</span>
          </div>
          {shelfItems.length ? (
            shelfItems.map((item) => <ShelfRow key={item.animeId} entry={item} />)
          ) : (
            <div className="shelf-empty">
              <p>Your shelf is waiting.</p>
              <Link to="/discover">Find a first title <ArrowRight size={14} /></Link>
            </div>
          )}
          <div className="shelf-preview-footer">
            <div>
              <strong>{stats.episodesWatched}</strong>
              <span>episodes logged</span>
            </div>
            <div>
              <strong>{stats.meanScore ? stats.meanScore.toFixed(1) : '—'}</strong>
              <span>mean score</span>
            </div>
            <div>
              <strong>{stats.favorites}</strong>
              <span>favourites</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
