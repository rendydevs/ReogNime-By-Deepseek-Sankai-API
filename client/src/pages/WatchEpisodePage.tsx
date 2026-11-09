import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  LoaderCircle,
  Play,
  RotateCw,
  Share2,
  Subtitles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DownloadGroups } from '../components/DownloadGroups';
import { api } from '../lib/api';
import { formatDurationLabel, formatReleaseTime, genreLabel } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { SITE_URL, breadcrumbJsonLd, pageGraph, usePageSeo } from '../lib/seo';
import { shareCurrentPage } from '../lib/share';
import { getSeriesMeta, recordWatch } from '../lib/watchHistory';
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

// VidHide plays reliably on mobile; Mega remains available as a manual fallback.
const SERVER_PREFERENCE = ['vidhide', 'filelions', 'filedon', 'mega'];

function serverPreference(name: string): number {
  const normalized = name.toLowerCase().trim();
  const index = SERVER_PREFERENCE.findIndex((preferred) => normalized.includes(preferred));
  return index === -1 ? 0 : SERVER_PREFERENCE.length - index;
}

function qualityNumber(quality: string): number {
  return Number.parseInt(quality, 10) || 0;
}

function initialServer(data: EpisodePayload): FlatServer | null {
  const candidates = data.servers
    .flatMap((group) => group.servers.map((server) => ({ ...server, quality: group.quality })))
    .sort(
      (a, b) =>
        serverPreference(b.name) - serverPreference(a.name) ||
        qualityNumber(b.quality) - qualityNumber(a.quality),
    );
  return candidates[0] ?? null;
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
  useDocumentTitle('Tonton episode');
  const { slug } = useParams();
  const episode = useApi((signal) => api.otaku.episode(slug ?? '', signal), [slug]);
  const { notify } = useToast();
  const data = episode.data?.data ?? null;
  const [selected, setSelected] = useState<FlatServer | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useDocumentTitle(data ? `Nonton ${data.title} Sub Indo` : 'Nonton Episode Anime Sub Indo');
  usePageSeo({
    title: data ? `Nonton ${data.title} Sub Indo — ReogNime` : 'Tonton episode — ReogNime',
    description: data
      ? `${data.title} subtitle Indonesia. Pilih mirror video, unduh episode, dan lanjutkan ke episode berikutnya di ReogNime.`
      : 'Nonton episode anime subtitle Indonesia di ReogNime.',
    type: 'video.episode',
    jsonLd: data
      ? (() => {
          const seriesTitle = data.title.replace(/\s+(Episode|Eps?\.?)\s*\d+.*$/i, '').trim() || data.title;
          const episodeNumber = Number(data.title.match(/Episode\s*(\d+)/i)?.[1] ?? '');
          return pageGraph(
            {
              '@type': 'TVEpisode',
              name: data.title,
              description: `${data.title} subtitle Indonesia di ReogNime.`,
              url: `${SITE_URL}/watch/episode/${encodeURIComponent(data.slug)}`,
              inLanguage: 'id-ID',
              ...(Number.isFinite(episodeNumber) ? { episodeNumber } : {}),
              partOfSeries: {
                '@type': 'TVSeries',
                name: seriesTitle,
                url: `${SITE_URL}/watch/anime/${encodeURIComponent(data.animeSlug)}`,
              },
            },
            breadcrumbJsonLd([
              { name: 'Beranda', path: '/' },
              { name: seriesTitle, path: `/watch/anime/${encodeURIComponent(data.animeSlug)}` },
              { name: data.title, path: `/watch/episode/${encodeURIComponent(data.slug)}` },
            ]),
          );
        })()
      : null,
  });

  useEffect(() => {
    setSelected(data ? initialServer(data) : null);
    setStreamUrl(null);
    setStreamError(null);
  }, [data?.slug]);

  useEffect(() => {
    if (!data) return;
    const meta = getSeriesMeta(data.animeSlug);
    const fallbackTitle = data.title.replace(/\s+(Episode|Eps?\.?)\s*\d+.*$/i, '').trim() || data.title;
    recordWatch({
      episodeSlug: data.slug,
      animeSlug: data.animeSlug,
      animeTitle: meta?.title ?? fallbackTitle,
      episodeTitle: data.title,
      poster: meta?.poster ?? null,
    });
  }, [data?.slug, data?.animeSlug]);

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
        setStreamError(reason instanceof Error ? reason.message : 'Mirror ini tidak tersedia.');
      })
      .finally(() => {
        if (active) setStreamLoading(false);
      });
    return () => {
      active = false;
    };
  }, [data, selected, reloadKey]);

  const shareEpisode = async () => {
    if (!data) return;
    const result = await shareCurrentPage(data.title);
    if (result === 'copied') notify('Tautan episode disalin.');
    else if (result === 'failed') notify('Gagal membagikan tautan.', { tone: 'error' });
  };

  const flatServers = useMemo(
    () => (data?.servers ?? []).flatMap((group) => group.servers.map((server) => ({ ...server, quality: group.quality }))),
    [data],
  );

  if (episode.loading) return <PlayerSkeleton />;

  if (episode.error || !data) {
    return (
      <div className="container error-page">
        <p className="eyebrow">ReogNime / tidak ditemukan</p>
        <h1>Episode ini tidak ada.</h1>
        <p>{episode.error ?? 'Episode tidak bisa dimuat dari sumber streaming.'}</p>
        <div className="empty-actions">
          <Link to="/" className="button button-primary"><ArrowLeft size={15} /> Kembali ke beranda</Link>
          <button className="button button-quiet" onClick={episode.reload}>Coba lagi</button>
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
            <ArrowLeft size={15} /> {data.animeSlug ? 'Kembali ke seri' : 'Kembali ke tontonan'}
          </Link>
          <div className="player-header-nav">
            {data.previous ? (
              <Link to={`/watch/episode/${data.previous.slug}`} className="player-nav-button" title="Episode sebelumnya">
                <ArrowLeft size={14} /> Sebelumnya
              </Link>
            ) : (
              <span className="player-nav-button is-disabled"><ArrowLeft size={14} /> Sebelumnya</span>
            )}
            {data.next ? (
              <Link to={`/watch/episode/${data.next.slug}`} className="player-nav-button" title="Episode berikutnya">
                Berikutnya <ArrowRight size={14} />
              </Link>
            ) : (
              <span className="player-nav-button is-disabled">Berikutnya <ArrowRight size={14} /></span>
            )}
          </div>
        </div>
        <div className="player-title-line">
          <div>
            <p className="eyebrow"><span className="watch-live-dot" /> Sedang diputar</p>
            <h1>{data.title}</h1>
          </div>
          <div className="player-title-side">
            <span className="player-release">{formatReleaseTime(data.releaseTime)}</span>
            <button
              type="button"
              className="player-share"
              onClick={() => void shareEpisode()}
              aria-label="Bagikan episode"
              title="Bagikan episode"
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="container player-layout">
        <main className="player-main">
          <section className="player-stage">
            <div className="player-frame">
              {streamLoading ? (
                <div className="player-placeholder">
                  <LoaderCircle size={24} className="spin" />
                  <span>Mencari mirror yang berfungsi…</span>
                </div>
              ) : playableUrl ? (
                <iframe
                  key={`${selected?.id}-${reloadKey}`}
                  src={playableUrl}
                  title={`Pemutar video ${data.title}`}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="player-placeholder player-placeholder-error">
                  <AlertCircle size={23} />
                  <strong>{streamError ? 'Mirror ini gagal dimuat.' : framedBlocked ? 'Mirror ini memblokir pemutaran di halaman.' : offline ? 'Mirror ini sedang offline.' : 'Tidak ada mirror yang bisa diputar.'}</strong>
                  <span>{streamError ?? (framedBlocked ? 'Pilih mirror VidHide, FileLions, atau Filedon, atau buka mirror ini di tab baru.' : offline ? 'Pilih server lain di bawah atau buka episode di situs sumber.' : 'Coba mirror lain dari daftar di bawah.')}</span>
                  <div className="player-placeholder-actions">
                    <button className="button button-paper" onClick={() => setReloadKey((value) => value + 1)}>
                      <RotateCw size={14} /> Coba lagi
                    </button>
                    {streamUrl && (
                      <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="button button-ghost-light">
                        Buka mirror <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="player-server-bar">
              <div className="player-server-title">
                <Play size={14} />
                <span>Pilih mirror</span>
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
                {!groups.length && <span className="player-no-servers">Belum ada mirror.</span>}
              </div>
              {playableUrl && (
                <a className="player-source-link" href={playableUrl} target="_blank" rel="noopener noreferrer">
                  Buka di tab baru <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="player-disclaimer">
              Streaming di-embed dari server pihak ketiga. ReogNime tidak menyimpan file video.
              VidHide dipilih lebih dulu untuk pemutaran yang ramah seluler; semua mirror di atas tetap tersedia, termasuk Mega sebagai cadangan.
              Iklan di dalam pemutar dikendalikan host video. Untuk pengalaman lebih bersih, gunakan pemblokir iklan seperti uBlock Origin atau Brave, atau coba mirror lain. ReogNime tidak bisa menghapus iklan tanpa merusak pemutar host.
            </p>
          </section>

          <section className="player-downloads">
            <div className="watch-detail-section-head">
              <div>
                <div className="section-index">Unduhan</div>
                <h2>Unduh episode</h2>
              </div>
              {downloadCount > 0 && <span>{downloadCount} mirror</span>}
            </div>
            <DownloadGroups groups={data.downloads} emptyLabel="Unduhan episode belum tersedia." />
          </section>
        </main>

        <aside className="player-side">
          <div className="watch-side-card">
            <p className="watch-side-heading">Info episode</p>
            <dl className="watch-facts">
              <div><dt>Tipe</dt><dd>{data.info.type ?? 'Anime'}</dd></div>
              <div><dt>Durasi</dt><dd>{formatDurationLabel(data.info.duration)}</dd></div>
              <div><dt>Encoder</dt><dd>{data.info.encoder ?? 'Tidak diketahui'}</dd></div>
              <div><dt>Kredit</dt><dd>{data.info.credit ?? 'Penyedia'}</dd></div>
              <div><dt>Unduhan</dt><dd>{downloadCount ? `${downloadCount} mirror` : 'Belum tersedia'}</dd></div>
            </dl>
            {data.info.genres.length > 0 && (
              <div className="player-genres">
                {data.info.genres.map((genre) => (
                  <Link key={genre.slug} to={`/genre/${encodeURIComponent(genre.slug)}`} className="genre-pill">{genreLabel(genre.name)}</Link>
                ))}
              </div>
            )}
          </div>

          <div className="watch-side-card player-side-note">
            <div className="watch-source-line"><Subtitles size={14} /><span>Subtitle Indonesia</span></div>
            <p>Server disediakan oleh penyedia streaming dan bisa berubah atau offline tanpa pemberitahuan.</p>
            <Link to="/schedule" className="text-link">Jadwal tayang <ArrowRight size={12} /></Link>
          </div>

          {flatServers.length > 0 && (
            <div className="watch-side-card player-side-episodes">
              <p className="watch-side-heading">Seputar episode</p>
              {data.previous ? (
                <Link to={`/watch/episode/${data.previous.slug}`} className="player-side-episode">
                  <ArrowLeft size={14} /><span>Episode sebelumnya</span>
                </Link>
              ) : null}
              {data.next ? (
                <Link to={`/watch/episode/${data.next.slug}`} className="player-side-episode">
                  <ArrowRight size={14} /><span>Episode berikutnya</span>
                </Link>
              ) : null}
              <Link to={data.animeSlug ? `/watch/anime/${data.animeSlug}` : '/'} className="player-side-episode">
                <Play size={14} /><span>Semua episode</span>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
