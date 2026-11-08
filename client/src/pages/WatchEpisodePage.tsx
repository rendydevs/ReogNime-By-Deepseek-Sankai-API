import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  LoaderCircle,
  Play,
  RotateCw,
  Subtitles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DownloadGroups } from '../components/DownloadGroups';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { usePageSeo } from '../lib/seo';
import type { OtakuEpisodeServer, OtakuEpisodePage as EpisodePayload } from '../types';

interface FlatServer extends OtakuEpisodeServer {
  quality: string;
}

function PlayerSkeleton() {
  return (
    <div className="container player-page-loading">
      <div className="skeleton skeleton-line skeleton-line-short" />
      <div className="skeleton skeleton-player-title" />
      <div className="skeleton skeleton-player-frame" />
      <div className="skeleton skeleton-line" />
    </div>
  );
}

// Mega is the cleanest embed we have tested; keep every mirror visible as a fallback.
const SERVER_PREFERENCE = ['mega', 'filelions', 'vidhide', 'filedon'];

function serverPreference(name: string): number {
  const normalized = name.toLowerCase().trim();
  const index = SERVER_PREFERENCE.findIndex((preferred) => normalized.includes(preferred));
  return index === -1 ? 0 : SERVER_PREFERENCE.length - index;
}

function qualityNumber(quality: string): number {
  return Number.parseInt(quality, 10) || 0;
}

function initialServer(data: EpisodePayload): FlatServer | null {
  const groups = data.servers
    .filter((group) => group.servers.length > 0)
    .sort((a, b) => qualityNumber(b.quality) - qualityNumber(a.quality));
  for (const group of groups) {
    const sorted = [...group.servers].sort((a, b) => serverPreference(b.name) - serverPreference(a.name));
    if (sorted[0]) return { ...sorted[0], quality: group.quality };
  }
  return null;
}

function blocksEmbedding(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)desustream\.(net|com)$/i.test(host);
  } catch {
    return false;
  }
}

export function WatchEpisodePage() {
  useDocumentTitle('Watch episode');
  const { slug } = useParams();
  const episode = useApi((signal) => api.otaku.episode(slug ?? '', signal), [slug]);
  const data = episode.data?.data ?? null;
  const [selected, setSelected] = useState<FlatServer | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useDocumentTitle(data ? `${data.title} Sub Indo` : 'Nonton Episode Anime Sub Indo');
  usePageSeo({
    title: data ? `${data.title} — ReogNime` : 'Watch episode — ReogNime',
    description: data
      ? `${data.title} subtitle Indonesia. Pilih mirror video, unduh episode, dan lanjutkan ke episode berikutnya di ReogNime.`
      : 'Nonton episode anime subtitle Indonesia di ReogNime.',
    type: 'video.episode',
    jsonLd: data
      ? {
          '@context': 'https://schema.org',
          '@type': 'TVEpisode',
          name: data.title,
          inLanguage: 'id-ID',
        }
      : null,
  });

  useEffect(() => {
    setSelected(data ? initialServer(data) : null);
    setStreamUrl(null);
    setStreamError(null);
  }, [data?.slug]);

  useEffect(() => {
    if (!data) return;
    if (!selected) {
      const fallback = data.defaultStreamingUrl;
      if (fallback && !/maintenance/i.test(fallback)) setStreamUrl(fallback);
      return;
    }
    let active = true;
    setStreamLoading(true);
    setStreamError(null);
    setStreamUrl(null);
    api.otaku
      .server(selected.id)
      .then((payload) => {
        if (!active) return;
        setStreamUrl(payload.data.url);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setStreamError(reason instanceof Error ? reason.message : 'This mirror is unavailable.');
      })
      .finally(() => {
        if (active) setStreamLoading(false);
      });
    return () => {
      active = false;
    };
  }, [data, selected, reloadKey]);

  const flatServers = useMemo(
    () => (data?.servers ?? []).flatMap((group) => group.servers.map((server) => ({ ...server, quality: group.quality }))),
    [data],
  );

  if (episode.loading) return <PlayerSkeleton />;

  if (episode.error || !data) {
    return (
      <div className="container error-page">
        <p className="eyebrow">ReogNime / not found</p>
        <h1>This episode is missing.</h1>
        <p>{episode.error ?? 'The episode could not be loaded from the streaming source.'}</p>
        <div className="empty-actions">
          <Link to="/" className="button button-primary"><ArrowLeft size={15} /> Back home</Link>
          <button className="button button-quiet" onClick={episode.reload}>Try again</button>
        </div>
      </div>
    );
  }

  const offline = streamUrl ? /maintenance/i.test(streamUrl) : false;
  const framedBlocked = streamUrl ? blocksEmbedding(streamUrl) : false;
  const playableUrl = streamUrl && !offline && !framedBlocked ? streamUrl : null;
  const groups = data.servers.filter((group) => group.servers.length > 0);
  const downloadCount = data.downloads.reduce(
    (total, group) => total + group.qualities.reduce((sum, quality) => sum + quality.urls.length, 0),
    0,
  );

  return (
    <div className="player-page">
      <div className="container player-header">
        <div className="player-header-top">
          <Link to={data.animeSlug ? `/watch/anime/${data.animeSlug}` : '/'} className="back-link-dark">
            <ArrowLeft size={15} /> {data.animeSlug ? 'Back to series' : 'Back to watch'}
          </Link>
          <div className="player-header-nav">
            {data.previous ? (
              <Link to={`/watch/episode/${data.previous.slug}`} className="player-nav-button" title="Previous episode">
                <ArrowLeft size={14} /> Prev
              </Link>
            ) : (
              <span className="player-nav-button is-disabled"><ArrowLeft size={14} /> Prev</span>
            )}
            {data.next ? (
              <Link to={`/watch/episode/${data.next.slug}`} className="player-nav-button" title="Next episode">
                Next <ArrowRight size={14} />
              </Link>
            ) : (
              <span className="player-nav-button is-disabled">Next <ArrowRight size={14} /></span>
            )}
          </div>
        </div>
        <div className="player-title-line">
          <div>
            <p className="eyebrow"><span className="watch-live-dot" /> Now playing</p>
            <h1>{data.title}</h1>
          </div>
          <span className="player-release">{data.releaseTime ?? 'Subtitle Indonesia'}</span>
        </div>
      </div>

      <div className="container player-layout">
        <main className="player-main">
          <section className="player-stage">
            <div className="player-frame">
              {streamLoading ? (
                <div className="player-placeholder">
                  <LoaderCircle size={24} className="spin" />
                  <span>Finding a working mirror…</span>
                </div>
              ) : playableUrl ? (
                <iframe
                  key={`${selected?.id}-${reloadKey}`}
                  src={playableUrl}
                  title={`${data.title} video player`}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="player-placeholder player-placeholder-error">
                  <AlertCircle size={23} />
                  <strong>{streamError ? 'This mirror could not be loaded.' : framedBlocked ? 'This mirror blocks embedded playback.' : offline ? 'This mirror is offline.' : 'No playable mirror found.'}</strong>
                  <span>{streamError ?? (framedBlocked ? 'Choose a filedon, vidhide or mega mirror, or open this mirror in a new tab.' : offline ? 'Pick another server below or open the episode on the source site.' : 'Try another mirror from the list below.')}</span>
                  <div className="player-placeholder-actions">
                    <button className="button button-paper" onClick={() => setReloadKey((value) => value + 1)}>
                      <RotateCw size={14} /> Retry
                    </button>
                    {streamUrl && (
                      <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="button button-ghost-light">
                        Open mirror <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="player-server-bar">
              <div className="player-server-title">
                <Play size={14} />
                <span>Choose a mirror</span>
              </div>
              <div className="player-server-groups">
                {groups.map((group) => (
                  <div className="player-server-group" key={group.quality}>
                    <span className="player-quality">{group.quality}</span>
                    {group.servers.map((server) => (
                      <button
                        key={server.id}
                        className={`player-server ${selected?.id === server.id ? 'is-active' : ''}`}
                        onClick={() => setSelected({ ...server, quality: group.quality })}
                        aria-pressed={selected?.id === server.id}
                      >
                        {server.name}
                      </button>
                    ))}
                  </div>
                ))}
                {!groups.length && <span className="player-no-servers">No mirrors listed.</span>}
              </div>
              {playableUrl && (
                <a className="player-source-link" href={playableUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="player-disclaimer">
              Streams are embedded from third-party servers. ReogNime does not host video files.
              Mega is selected first when available for a cleaner player; all mirrors above remain available.
            </p>
          </section>

          <section className="player-downloads">
            <div className="watch-detail-section-head">
              <div>
                <div className="section-index">Downloads</div>
                <h2>Episode download</h2>
              </div>
              {downloadCount > 0 && <span>{downloadCount} mirrors</span>}
            </div>
            <DownloadGroups groups={data.downloads} emptyLabel="No episode downloads are available right now." />
          </section>
        </main>

        <aside className="player-side">
          <div className="watch-side-card">
            <p className="watch-side-heading">Episode info</p>
            <dl className="watch-facts">
              <div><dt>Type</dt><dd>{data.info.type ?? 'Anime'}</dd></div>
              <div><dt>Duration</dt><dd>{data.info.duration ?? 'TBA'}</dd></div>
              <div><dt>Encoder</dt><dd>{data.info.encoder ?? 'Unknown'}</dd></div>
              <div><dt>Credit</dt><dd>{data.info.credit ?? 'Provider'}</dd></div>
              <div><dt>Download</dt><dd>{downloadCount ? `${downloadCount} mirrors` : 'Unavailable'}</dd></div>
            </dl>
            {data.info.genres.length > 0 && (
              <div className="player-genres">
                {data.info.genres.map((genre) => (
                  <Link key={genre.slug} to={`/genre/${encodeURIComponent(genre.slug)}`} className="genre-pill">{genre.name}</Link>
                ))}
              </div>
            )}
          </div>

          <div className="watch-side-card player-side-note">
            <div className="watch-source-line"><Subtitles size={14} /><span>Indonesian subtitles</span></div>
            <p>Servers are supplied by the streaming provider and can change or go offline without notice.</p>
            <Link to="/schedule" className="text-link">Airing schedule <ArrowRight size={12} /></Link>
          </div>

          {flatServers.length > 0 && (
            <div className="watch-side-card player-side-episodes">
              <p className="watch-side-heading">Around this episode</p>
              {data.previous ? (
                <Link to={`/watch/episode/${data.previous.slug}`} className="player-side-episode">
                  <ArrowLeft size={14} /><span>Previous episode</span>
                </Link>
              ) : null}
              {data.next ? (
                <Link to={`/watch/episode/${data.next.slug}`} className="player-side-episode">
                  <ArrowRight size={14} /><span>Next episode</span>
                </Link>
              ) : null}
              <Link to={data.animeSlug ? `/watch/anime/${data.animeSlug}` : '/'} className="player-side-episode">
                <Play size={14} /><span>All episodes</span>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
