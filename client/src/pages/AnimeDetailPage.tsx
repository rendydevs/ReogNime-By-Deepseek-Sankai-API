import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  Heart,
  Link2,
  LoaderCircle,
  Play,
  Plus,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimeCard } from '../components/AnimeCard';
import { useLibraryDialog } from '../components/LibraryDialog';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import {
  AIRING_LABELS,
  FORMAT_LABELS,
  SEASON_LABELS,
  STATUS_LABELS,
  episodeLabel,
  formatCount,
  formatDate,
  formatMinutes,
  formatScore,
  plural,
} from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { mediaUrl } from '../lib/media';
import type { Anime, Episode } from '../types';

function DetailSkeleton() {
  return (
    <div className="detail-loading container">
      <div className="skeleton skeleton-detail-back" />
      <div className="detail-skeleton-grid">
        <div className="skeleton skeleton-detail-cover" />
        <div>
          <div className="skeleton skeleton-line skeleton-line-short" />
          <div className="skeleton skeleton-detail-title" />
          <div className="skeleton skeleton-detail-copy" />
          <div className="skeleton skeleton-detail-copy" />
        </div>
      </div>
    </div>
  );
}

function EpisodeSection({ anime }: { anime: Anime }) {
  const { getEntry, updateEntry } = useLibrary();
  const { open } = useLibraryDialog();
  const { notify } = useToast();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [busyEpisode, setBusyEpisode] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const entry = getEntry(anime.id);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .episodes(anime.id, 1, 12, controller.signal)
      .then((payload) => {
        setEpisodes(payload.data);
        setHasMore(payload.pagination.hasNextPage);
        setNextPage(2);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Could not load episodes.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [anime.id]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const payload = await api.episodes(anime.id, nextPage, 12);
      setEpisodes((current) => [...current, ...payload.data]);
      setHasMore(payload.pagination.hasNextPage);
      setNextPage((value) => value + 1);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Could not load more episodes.', { tone: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  const markWatched = async (episode: Episode) => {
    if (!entry) {
      open(anime);
      return;
    }
    if (!episode.aired || episode.number <= entry.progress) return;
    setBusyEpisode(episode.number);
    try {
      const total = anime.episodes;
      await updateEntry(anime.id, {
        progress: episode.number,
        status: total && episode.number >= total ? 'COMPLETED' : entry.status === 'PLANNING' ? 'WATCHING' : entry.status,
      });
      notify(`Logged episode ${episode.number}.`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Could not update progress.', { tone: 'error' });
    } finally {
      setBusyEpisode(null);
    }
  };

  return (
    <section className="detail-section" id="episodes">
      <div className="detail-section-head">
        <div>
          <p className="section-index">Episodes</p>
          <h2>Episode log</h2>
        </div>
        <p>
          {entry
            ? `${entry.progress} of ${anime.episodes ?? '?'} logged. Click an episode to catch up.`
            : 'Add this title to your list to keep a private episode log.'}
        </p>
      </div>

      {loading ? (
        <div className="episode-list">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="skeleton skeleton-episode" />
          ))}
        </div>
      ) : error ? (
        <p className="inline-note">{error}</p>
      ) : episodes.length === 0 ? (
        <p className="inline-note">Episode data is not available for this title yet.</p>
      ) : (
        <>
          <div className="episode-list">
            {episodes.map((episode) => {
              const watched = Boolean(entry && entry.progress >= episode.number);
              return (
                <div className={`episode-row ${watched ? 'is-watched' : ''}`} key={episode.number}>
                  <span className="episode-number">{String(episode.number).padStart(2, '0')}</span>
                  <span className="episode-info">
                    <strong>{episode.title}</strong>
                    <span>
                      {episode.airDate ? formatDate(episode.airDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Air date TBA'}
                      {episode.duration ? ` · ${episode.duration} min` : ''}
                    </span>
                  </span>
                  {episode.aired ? (
                    <button
                      className={`episode-toggle ${watched ? 'is-watched' : ''}`}
                      onClick={() => markWatched(episode)}
                      disabled={busyEpisode === episode.number || watched}
                      aria-label={watched ? `Episode ${episode.number} watched` : `Mark episode ${episode.number} watched`}
                    >
                      {busyEpisode === episode.number ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : watched ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Circle size={17} />
                      )}
                      <span>{watched ? 'Watched' : 'Mark'}</span>
                    </button>
                  ) : (
                    <span className="episode-upcoming">Upcoming</span>
                  )}
                </div>
              );
            })}
          </div>
          {hasMore && (
            <button className="text-link episode-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <LoaderCircle size={14} className="spin" /> : null}
              Load more episodes
            </button>
          )}
        </>
      )}
    </section>
  );
}

export function AnimeDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi((signal) => api.anime(id ?? '', signal), [id]);
  const { getEntry, updateEntry } = useLibrary();
  const { open } = useLibraryDialog();
  const { notify } = useToast();
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const anime = data?.data ?? null;
  useDocumentTitle(anime ? `${anime.title} Sub Indo` : 'Anime Sub Indo');

  if (loading) return <DetailSkeleton />;

  if (error || !anime) {
    return (
      <div className="container error-page">
        <p className="eyebrow">Not on the shelf</p>
        <h1>We couldn't find that title.</h1>
        <p>{error ?? 'It may have been removed from the index.'}</p>
        <div className="empty-actions">
          <button className="button button-primary" onClick={reload}>Try again</button>
          <Link to="/discover" className="button button-quiet"><ArrowLeft size={15} /> Back to index</Link>
        </div>
      </div>
    );
  }

  const entry = getEntry(anime.id);
  const progressPercent = anime.episodes ? Math.min(100, (entry?.progress ?? 0) / anime.episodes * 100) : 0;

  const handleFavorite = async () => {
    if (!entry) {
      open(anime);
      return;
    }
    setFavoriteBusy(true);
    try {
      await updateEntry(anime.id, { favorite: !entry.favorite });
      notify(entry.favorite ? 'Removed from favourites.' : 'Marked as a favourite.');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Could not update favourite.', { tone: 'error' });
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Link copied to clipboard.');
    } catch {
      notify('Copy the address bar to share this title.', { tone: 'info' });
    }
  };

  return (
    <div className="detail-page">
      <section className="detail-hero">
        <div className="detail-hero-media">
          <img src={mediaUrl(anime.banner ?? anime.cover)} alt="" />
        </div>
        <div className="detail-hero-shade" />
        <div className="container detail-hero-inner">
          <Link to="/discover" className="back-link">
            <ArrowLeft size={15} /> The index
          </Link>

          <div className="detail-head-grid">
            <div className="detail-poster">
              <img src={mediaUrl(anime.cover)} alt={`${anime.title} poster`} />
              <span className="detail-score-badge">
                <Star size={13} fill="currentColor" /> {formatScore(anime.score)}
              </span>
            </div>

            <div className="detail-head-copy">
              <p className="detail-kicker">
                {anime.studios[0] ?? 'Independent'} <span>·</span> {anime.seasonYear ?? 'TBA'} <span>·</span> {FORMAT_LABELS[anime.format]}
              </p>
              <h1>{anime.title}</h1>
              <p className="detail-native">{anime.originalTitle}{anime.nativeTitle ? ` / ${anime.nativeTitle}` : ''}</p>

              <div className="detail-meta-line">
                <span className={`airing-pill status-${anime.status.toLowerCase()}`}>{AIRING_LABELS[anime.status]}</span>
                <span>{episodeLabel(anime.episodes)}</span>
                <span>{formatMinutes(anime.duration ?? 0)}</span>
                <span>{anime.season ? `${SEASON_LABELS[anime.season]} ${anime.seasonYear}` : 'Date TBA'}</span>
              </div>

              <p className="detail-teaser">{anime.synopsis.split('\n')[0]}</p>

              <div className="detail-genres">
                {anime.genres.map((genre) => (
                  <Link key={genre} to={`/discover?genre=${encodeURIComponent(genre)}`} className="genre-pill">{genre}</Link>
                ))}
              </div>

              <div className="detail-actions">
                <button className="button button-paper" onClick={() => open(anime)}>
                  {entry ? <Check size={16} /> : <Plus size={16} />}
                  {entry ? `In your list · ${STATUS_LABELS[entry.status]}` : 'Add to my list'}
                </button>
                <button
                  className={`detail-icon-button ${entry?.favorite ? 'is-active' : ''}`}
                  onClick={handleFavorite}
                  aria-label={entry?.favorite ? 'Remove from favourites' : 'Add to favourites'}
                  title={entry?.favorite ? 'Remove from favourites' : 'Add to favourites'}
                  disabled={favoriteBusy}
                >
                  {favoriteBusy ? <LoaderCircle size={17} className="spin" /> : <Heart size={17} fill={entry?.favorite ? 'currentColor' : 'none'} />}
                </button>
                <button className="detail-icon-button" onClick={handleShare} aria-label="Copy link" title="Copy link">
                  <Link2 size={17} />
                </button>
                {anime.trailer && (
                  <a
                    className="detail-icon-button"
                    href={`https://www.youtube.com/watch?v=${anime.trailer.id}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Watch trailer on YouTube"
                    title="Watch trailer"
                  >
                    <Play size={17} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container detail-body">
        <div className="detail-main">
          <section className="detail-section detail-about">
            <div className="detail-section-head">
              <div>
                <p className="section-index">Synopsis</p>
                <h2>About the story</h2>
              </div>
              <a href={`https://anilist.co/anime/${anime.id}`} target="_blank" rel="noreferrer" className="text-link">
                View on AniList <ExternalLink size={13} />
              </a>
            </div>
            <div className="prose">
              {anime.synopsis.split('\n').filter(Boolean).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>

          {anime.characters.length > 0 && (
            <section className="detail-section">
              <div className="detail-section-head">
                <div>
                  <p className="section-index">Cast</p>
                  <h2>Faces in the story</h2>
                </div>
                <p>{plural(anime.characters.length, 'character')} from the main cast.</p>
              </div>
              <div className="character-grid">
                {anime.characters.map((character) => (
                  <article className="character-card" key={character.id}>
                    <div className="character-image">
                      {character.image ? (
                        <img src={mediaUrl(character.image)} alt={character.name} loading="lazy" />
                      ) : (
                        <span>{character.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <div>
                      <h3>{character.name}</h3>
                      <p>{character.role}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {anime.episodes ? <EpisodeSection anime={anime} /> : null}

          {anime.related.length > 0 && (
            <section className="detail-section">
              <div className="detail-section-head">
                <div>
                  <p className="section-index">Keep going</p>
                  <h2>If this stays with you</h2>
                </div>
                <Link to="/discover" className="text-link">More like this <ArrowUpRight size={14} /></Link>
              </div>
              <div className="poster-grid poster-grid-four">
                {anime.related.slice(0, 4).map((related) => <AnimeCard key={related.id} anime={related} />)}
              </div>
            </section>
          )}
        </div>

        <aside className="detail-side">
          <div className="side-card side-info">
            <p className="side-heading">Details</p>
            <dl>
              <div><dt>Format</dt><dd>{FORMAT_LABELS[anime.format]}</dd></div>
              <div><dt>Episodes</dt><dd>{anime.episodes ?? 'TBA'}</dd></div>
              <div><dt>Episode length</dt><dd>{anime.duration ? `${anime.duration} min` : 'TBA'}</dd></div>
              <div><dt>Status</dt><dd>{AIRING_LABELS[anime.status]}</dd></div>
              <div><dt>Season</dt><dd>{anime.season ? `${SEASON_LABELS[anime.season]} ${anime.seasonYear}` : 'TBA'}</dd></div>
              <div><dt>First aired</dt><dd>{formatDate(anime.startDate)}</dd></div>
              {anime.nextAiringEpisode && (
                <div><dt>Next episode</dt><dd>Ep {anime.nextAiringEpisode.episode} · {formatDate(anime.nextAiringEpisode.airingAt, { month: 'short', day: 'numeric' })}</dd></div>
              )}
              <div><dt>Studio</dt><dd>{anime.studios.join(', ') || 'Unknown'}</dd></div>
              <div><dt>Source</dt><dd>{anime.source.replaceAll('_', ' ').toLowerCase()}</dd></div>
              <div><dt>Popularity</dt><dd>{formatCount(anime.popularity)}</dd></div>
              <div><dt>Favourites</dt><dd>{formatCount(anime.favorites)}</dd></div>
            </dl>
          </div>

          {entry && (
            <div className="side-card side-personal">
              <div className="side-personal-head">
                <p className="side-heading">Your entry</p>
                <button className="text-link" onClick={() => open(anime)}>Edit</button>
              </div>
              <div className="side-status-row">
                <span className={`library-status status-${entry.status.toLowerCase()}`}>{STATUS_LABELS[entry.status]}</span>
                {entry.score !== null && <span className="side-score">★ {entry.score.toFixed(1)}</span>}
              </div>
              <div className="side-progress">
                <div className="side-progress-label">
                  <span>Progress</span>
                  <span>{entry.progress} / {anime.episodes ?? '—'}</span>
                </div>
                <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
              </div>
              {entry.notes && <p className="side-note">“{entry.notes}”</p>}
            </div>
          )}

          {!entry && (
            <div className="side-card side-prompt">
              <p className="side-heading">Keep a note</p>
              <p>Add this title to log episodes, leave a private note, and score it when you're ready.</p>
              <button className="text-link" onClick={() => open(anime)}>Add to my list <Plus size={13} /></button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
