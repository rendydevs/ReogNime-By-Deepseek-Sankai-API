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
  genreLabel,
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
        setError(reason instanceof Error ? reason.message : 'Gagal memuat episode.');
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
      notify(reason instanceof Error ? reason.message : 'Gagal memuat episode lainnya.', { tone: 'error' });
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
      notify(`Episode ${episode.number} tercatat.`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Gagal memperbarui progres.', { tone: 'error' });
    } finally {
      setBusyEpisode(null);
    }
  };

  return (
    <section className="detail-section" id="episodes">
      <div className="detail-section-head">
        <div>
          <p className="section-index">Episode</p>
          <h2>Catatan episode</h2>
        </div>
        <p>
          {entry
            ? `${entry.progress} dari ${anime.episodes ?? '?'} tercatat. Klik episode untuk mengejar.`
            : 'Tambahkan judul ini ke daftar untuk menyimpan catatan episode.'}
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
        <p className="inline-note">Data episode untuk judul ini belum tersedia.</p>
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
                      {episode.airDate ? formatDate(episode.airDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Tanggal tayang —'}
                      {episode.duration ? ` · ${episode.duration} mnt` : ''}
                    </span>
                  </span>
                  {episode.aired ? (
                    <button
                      className={`episode-toggle ${watched ? 'is-watched' : ''}`}
                      onClick={() => markWatched(episode)}
                      disabled={busyEpisode === episode.number || watched}
                      aria-label={watched ? `Episode ${episode.number} sudah ditonton` : `Tandai episode ${episode.number} ditonton`}
                    >
                      {busyEpisode === episode.number ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : watched ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Circle size={17} />
                      )}
                      <span>{watched ? 'Sudah' : 'Tandai'}</span>
                    </button>
                  ) : (
                    <span className="episode-upcoming">Segera</span>
                  )}
                </div>
              );
            })}
          </div>
          {hasMore && (
            <button className="text-link episode-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <LoaderCircle size={14} className="spin" /> : null}
              Muat episode lain
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
        <p className="eyebrow">Tidak ada di rak</p>
        <h1>Judul itu tidak ditemukan.</h1>
        <p>{error ?? 'Mungkin sudah dihapus dari indeks.'}</p>
        <div className="empty-actions">
          <button className="button button-primary" onClick={reload}>Coba lagi</button>
          <Link to="/discover" className="button button-quiet"><ArrowLeft size={15} /> Kembali ke indeks</Link>
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
      notify(entry.favorite ? 'Dihapus dari favorit.' : 'Ditandai sebagai favorit.');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Gagal memperbarui favorit.', { tone: 'error' });
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Tautan disalin.');
    } catch {
      notify('Salin tautan dari bilah alamat untuk membagikan judul ini.', { tone: 'info' });
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
            <ArrowLeft size={15} /> Indeks
          </Link>

          <div className="detail-head-grid">
            <div className="detail-poster">
              <img src={mediaUrl(anime.cover)} alt={`Poster ${anime.title}`} />
              <span className="detail-score-badge">
                <Star size={13} fill="currentColor" /> {formatScore(anime.score)}
              </span>
            </div>

            <div className="detail-head-copy">
              <p className="detail-kicker">
                {anime.studios[0] ?? 'Independen'} <span>·</span> {anime.seasonYear ?? '—'} <span>·</span> {FORMAT_LABELS[anime.format]}
              </p>
              <h1>{anime.title}</h1>
              <p className="detail-native">{anime.originalTitle}{anime.nativeTitle ? ` / ${anime.nativeTitle}` : ''}</p>

              <div className="detail-meta-line">
                <span className={`airing-pill status-${anime.status.toLowerCase()}`}>{AIRING_LABELS[anime.status]}</span>
                <span>{episodeLabel(anime.episodes)}</span>
                <span>{formatMinutes(anime.duration ?? 0)}</span>
                <span>{anime.season ? `${SEASON_LABELS[anime.season]} ${anime.seasonYear}` : 'Tanggal —'}</span>
              </div>

              <p className="detail-teaser">{anime.synopsis.split('\n')[0]}</p>

              <div className="detail-genres">
                {anime.genres.map((genre) => (
                  <Link key={genre} to={`/discover?genre=${encodeURIComponent(genre)}`} className="genre-pill">{genreLabel(genre)}</Link>
                ))}
              </div>

              <div className="detail-actions">
                <button className="button button-paper" onClick={() => open(anime)}>
                  {entry ? <Check size={16} /> : <Plus size={16} />}
                  {entry ? `Di daftar · ${STATUS_LABELS[entry.status]}` : 'Tambah ke daftar'}
                </button>
                <button
                  className={`detail-icon-button ${entry?.favorite ? 'is-active' : ''}`}
                  onClick={handleFavorite}
                  aria-label={entry?.favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                  title={entry?.favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                  disabled={favoriteBusy}
                >
                  {favoriteBusy ? <LoaderCircle size={17} className="spin" /> : <Heart size={17} fill={entry?.favorite ? 'currentColor' : 'none'} />}
                </button>
                <button className="detail-icon-button" onClick={handleShare} aria-label="Salin tautan" title="Salin tautan">
                  <Link2 size={17} />
                </button>
                {anime.trailer && (
                  <a
                    className="detail-icon-button"
                    href={`https://www.youtube.com/watch?v=${anime.trailer.id}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Tonton trailer di YouTube"
                    title="Tonton trailer"
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
                <p className="section-index">Sinopsis</p>
                <h2>Tentang ceritanya</h2>
              </div>
              <a href={`https://anilist.co/anime/${anime.id}`} target="_blank" rel="noreferrer" className="text-link">
                Lihat di AniList <ExternalLink size={13} />
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
                  <p className="section-index">Pengisi suara</p>
                  <h2>Wajah di cerita</h2>
                </div>
                <p>{anime.characters.length} karakter dari pemeran utama.</p>
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
                      <p>{character.role === 'Main' ? 'Utama' : character.role === 'Supporting' ? 'Pendukung' : character.role}</p>
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
                  <p className="section-index">Lanjutkan</p>
                  <h2>Kalau ini membekas</h2>
                </div>
                <Link to="/discover" className="text-link">Mirip ini <ArrowUpRight size={14} /></Link>
              </div>
              <div className="poster-grid poster-grid-four">
                {anime.related.slice(0, 4).map((related) => <AnimeCard key={related.id} anime={related} />)}
              </div>
            </section>
          )}
        </div>

        <aside className="detail-side">
          <div className="side-card side-info">
            <p className="side-heading">Detail</p>
            <dl>
              <div><dt>Format</dt><dd>{FORMAT_LABELS[anime.format]}</dd></div>
              <div><dt>Episode</dt><dd>{anime.episodes ?? '—'}</dd></div>
              <div><dt>Durasi episode</dt><dd>{anime.duration ? `${anime.duration} mnt` : '—'}</dd></div>
              <div><dt>Status</dt><dd>{AIRING_LABELS[anime.status]}</dd></div>
              <div><dt>Musim</dt><dd>{anime.season ? `${SEASON_LABELS[anime.season]} ${anime.seasonYear}` : '—'}</dd></div>
              <div><dt>Tayang perdana</dt><dd>{formatDate(anime.startDate)}</dd></div>
              {anime.nextAiringEpisode && (
                <div><dt>Episode berikutnya</dt><dd>Ep {anime.nextAiringEpisode.episode} · {formatDate(anime.nextAiringEpisode.airingAt, { month: 'short', day: 'numeric' })}</dd></div>
              )}
              <div><dt>Studio</dt><dd>{anime.studios.join(', ') || 'Tidak diketahui'}</dd></div>
              <div><dt>Sumber</dt><dd>{({ MANGA: 'Manga', ORIGINAL: 'Karya orisinal', LIGHT_NOVEL: 'Novel ringan', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Gim', NOVEL: 'Novel', WEB_MANGA: 'Web manga', MUSIC: 'Musik', OTHER: 'Lainnya' }[anime.source] ?? anime.source.replaceAll('_', ' ').toLowerCase())}</dd></div>
              <div><dt>Popularitas</dt><dd>{formatCount(anime.popularity)}</dd></div>
              <div><dt>Favorit</dt><dd>{formatCount(anime.favorites)}</dd></div>
            </dl>
          </div>

          {entry && (
            <div className="side-card side-personal">
              <div className="side-personal-head">
                <p className="side-heading">Catatanmu</p>
                <button className="text-link" onClick={() => open(anime)}>Ubah</button>
              </div>
              <div className="side-status-row">
                <span className={`library-status status-${entry.status.toLowerCase()}`}>{STATUS_LABELS[entry.status]}</span>
                {entry.score !== null && <span className="side-score">★ {entry.score.toFixed(1)}</span>}
              </div>
              <div className="side-progress">
                <div className="side-progress-label">
                  <span>Progres</span>
                  <span>{entry.progress} / {anime.episodes ?? '—'}</span>
                </div>
                <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
              </div>
              {entry.notes && <p className="side-note">“{entry.notes}”</p>}
            </div>
          )}

          {!entry && (
            <div className="side-card side-prompt">
              <p className="side-heading">Simpan catatan</p>
              <p>Tambahkan judul ini untuk mencatat episode, menyimpan catatan pribadi, dan memberi skor.</p>
              <button className="text-link" onClick={() => open(anime)}>Tambah ke daftar <Plus size={13} /></button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
