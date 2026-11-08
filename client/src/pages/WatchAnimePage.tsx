import {
  ArrowDown,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Play,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DownloadGroups } from '../components/DownloadGroups';
import { OtakuCard } from '../components/OtakuCard';
import { OtakuPoster } from '../components/OtakuPoster';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import type { OtakuBatch } from '../types';

function WatchDetailSkeleton() {
  return (
    <div className="container watch-detail-loading">
      <div className="skeleton skeleton-detail-back" />
      <div className="watch-detail-skeleton-grid">
        <div className="skeleton skeleton-watch-poster" />
        <div>
          <div className="skeleton skeleton-line skeleton-line-short" />
          <div className="skeleton skeleton-watch-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
        </div>
      </div>
    </div>
  );
}

export function WatchAnimePage() {
  useDocumentTitle('Watch series');
  const { slug } = useParams();
  const detail = useApi((signal) => api.otaku.anime(slug ?? '', signal), [slug]);
  const { notify } = useToast();
  const anime = detail.data?.data ?? null;
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [batch, setBatch] = useState<OtakuBatch | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    setShowAllEpisodes(false);
    setBatch(null);
  }, [slug]);

  useDocumentTitle(anime?.title ?? 'Watch series');

  const episodes = useMemo(
    () => [...(anime?.episodeList ?? [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [anime],
  );
  const firstEpisode = episodes[0] ?? null;
  const displayedEpisodes = showAllEpisodes ? [...episodes].reverse() : [...episodes].reverse().slice(0, 12);

  const loadBatch = async () => {
    if (!anime?.batch || batchLoading) {
      document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setBatchLoading(true);
    try {
      const payload = await api.otaku.batch(anime.batch.slug);
      setBatch(payload.data);
      window.setTimeout(() => document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Could not load batch downloads.', { tone: 'error' });
    } finally {
      setBatchLoading(false);
    }
  };

  if (detail.loading) return <WatchDetailSkeleton />;

  if (detail.error || !anime) {
    return (
      <div className="container error-page">
        <p className="eyebrow">ReogNime / not found</p>
        <h1>That screening is empty.</h1>
        <p>{detail.error ?? 'The series could not be loaded from the streaming source.'}</p>
        <div className="empty-actions">
          <Link to="/" className="button button-primary"><ArrowLeft size={15} /> Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-anime-page">
      <section className="watch-detail-hero">
        <div className="watch-detail-backdrop">
          {(anime.banner || anime.poster) && <img src={anime.banner || anime.poster || ''} alt="" referrerPolicy="no-referrer" />}
          <span />
        </div>
        <div className="container watch-detail-hero-inner">
          <Link to="/" className="back-link"><ArrowLeft size={15} /> The screening room</Link>
          <div className="watch-detail-grid">
            <OtakuPoster title={anime.title} poster={anime.poster} className="watch-detail-poster" eager />
            <div className="watch-detail-copy">
              <p className="watch-detail-kicker">
                <span className="watch-live-dot" /> ReogNime · Subtitle Indonesia
              </p>
              <h1>{anime.title}</h1>
              {anime.japanese && <p className="watch-detail-japanese">{anime.japanese}</p>}
              <div className="watch-detail-meta">
                {anime.score !== null && <span className="watch-detail-score"><Star size={12} fill="currentColor" /> {anime.score.toFixed(2)}</span>}
                <span>{anime.status ?? 'Anime'}</span>
                {anime.type && <span>{anime.type}</span>}
                {anime.episodes !== null && <span>{anime.episodes} eps</span>}
                {anime.duration && <span>{anime.duration}</span>}
                {anime.aired && <span>{anime.aired}</span>}
              </div>
              <div className="watch-detail-genres">
                {anime.genres.map((genre) => (
                  <Link key={genre.slug} to={`/genre/${encodeURIComponent(genre.slug)}`} className="genre-pill">{genre.name}</Link>
                ))}
              </div>
              <div className="watch-detail-actions">
                {firstEpisode ? (
                  <Link to={`/watch/episode/${firstEpisode.slug}`} className="button button-paper">
                    <Play size={15} fill="currentColor" /> Start episode {firstEpisode.number ?? 1}
                  </Link>
                ) : null}
                {anime.batch && (
                  <button className="button button-ghost-light" onClick={() => void loadBatch()}>
                    {batchLoading ? <LoaderCircle size={15} className="spin" /> : <ArrowDown size={15} />}
                    Batch download
                  </button>
                )}
                {anime.sourceUrl && (
                  <a href={anime.sourceUrl} target="_blank" rel="noopener noreferrer" className="detail-icon-button" title="Open source" aria-label="Open source">
                    <ExternalLink size={17} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container watch-detail-body">
        <main className="watch-detail-main">
          {anime.synopsis.length > 0 && (
            <section className="watch-detail-section">
              <div className="section-index">Synopsis</div>
              <h2>About the series</h2>
              <div className="watch-synopsis">
                {anime.synopsis.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
            </section>
          )}

          <section className="watch-detail-section" id="episodes">
            <div className="watch-detail-section-head">
              <div>
                <div className="section-index">Episodes</div>
                <h2>Episode list</h2>
              </div>
              <span>{anime.episodeList.length} episodes · latest first</span>
            </div>
            {episodes.length ? (
              <>
                <div className="watch-episode-list">
                  {displayedEpisodes.map((episode) => (
                    <Link to={`/watch/episode/${episode.slug}`} className="watch-episode-row" key={episode.slug}>
                      <span className="watch-episode-number">{String(episode.number ?? 0).padStart(2, '0')}</span>
                      <span className="watch-episode-info">
                        <strong>{episode.title}</strong>
                        <span>{episode.date || 'Subtitle Indonesia'}</span>
                      </span>
                      <span className="watch-episode-play"><Play size={14} fill="currentColor" /></span>
                    </Link>
                  ))}
                </div>
                {episodes.length > 12 && (
                  <button className="text-link watch-show-all" onClick={() => setShowAllEpisodes((value) => !value)}>
                    {showAllEpisodes ? 'Show fewer episodes' : `Show all ${episodes.length} episodes`}
                    <ChevronRight size={14} className={showAllEpisodes ? 'is-rotated' : ''} />
                  </button>
                )}
              </>
            ) : (
              <p className="inline-note">No episodes have been listed yet.</p>
            )}
          </section>

          {anime.batch && (
            <section className="watch-detail-section" id="downloads">
              <div className="watch-detail-section-head">
                <div>
                  <div className="section-index">Downloads</div>
                  <h2>Batch download</h2>
                </div>
                {batch && <span>{onlineMirrorCount(batch)} mirrors</span>}
              </div>
              {batch ? (
                <DownloadGroups groups={batch.downloads} emptyLabel="Batch links are not available right now." />
              ) : (
                <button className="button button-outline" onClick={() => void loadBatch()} disabled={batchLoading}>
                  {batchLoading ? <LoaderCircle size={15} className="spin" /> : <ArrowDown size={15} />}
                  {batchLoading ? 'Loading mirrors…' : 'Reveal batch download links'}
                </button>
              )}
            </section>
          )}

          {anime.recommendations.length > 0 && (
            <section className="watch-detail-section">
              <div className="watch-detail-section-head">
                <div>
                  <div className="section-index">Keep watching</div>
                  <h2>More from the shelf</h2>
                </div>
                <Link to="/all" className="text-link">All titles <ChevronRight size={13} /></Link>
              </div>
              <div className="watch-grid watch-grid-related">
                {anime.recommendations.slice(0, 5).map((recommendation) => (
                  <OtakuCard key={recommendation.slug} anime={recommendation} />
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="watch-detail-side">
          <div className="watch-side-card">
            <p className="watch-side-heading">Details</p>
            <dl className="watch-facts">
              <div><dt>Status</dt><dd>{anime.status ?? 'Unknown'}</dd></div>
              <div><dt>Type</dt><dd>{anime.type ?? 'Anime'}</dd></div>
              <div><dt>Episodes</dt><dd>{anime.episodes ?? 'TBA'}</dd></div>
              <div><dt>Duration</dt><dd>{anime.duration ?? 'TBA'}</dd></div>
              <div><dt>Aired</dt><dd>{anime.aired ?? 'TBA'}</dd></div>
              <div><dt>Studio</dt><dd>{anime.studios.join(', ') || 'Unknown'}</dd></div>
              <div><dt>Season</dt><dd>{anime.season ?? '—'}</dd></div>
              {anime.score !== null && <div><dt>Provider score</dt><dd>{anime.score.toFixed(2)} / 10</dd></div>}
            </dl>
          </div>

          <div className="watch-side-card watch-source-card">
            <p className="watch-side-heading">Source</p>
            <div className="watch-source-line"><CalendarDays size={14} /><span>Sumber data streaming</span></div>
            <div className="watch-source-line"><Clock3 size={14} /><span>Indonesian subtitles</span></div>
            <p>Video di-embed dari server pihak ketiga; ReogNime tidak menyimpan file video.</p>
            {anime.sourceUrl && <a href={anime.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link">Open series source <ExternalLink size={12} /></a>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function onlineMirrorCount(batch: OtakuBatch): number {
  return batch.downloads.reduce(
    (total, group) => total + group.qualities.reduce((sum, quality) => sum + quality.urls.length, 0),
    0,
  );
}
