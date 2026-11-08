import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLibraryDialog } from '../components/LibraryDialog';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import {
  FORMAT_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  formatDate,
  formatScore,
  genreLabel,
} from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import { mediaUrl } from '../lib/media';
import type { LibraryEntry, LibraryStatus } from '../types';

type Tab = 'ALL' | LibraryStatus;
type Sort = 'updated' | 'title' | 'score';

const TABS: Tab[] = ['ALL', ...STATUS_ORDER];

export function LibraryPage() {
  useDocumentTitle('Daftar Saya');
  const { entries, stats, loading, refreshing, error, refresh, addEntry, updateEntry, removeEntry } = useLibrary();
  const { open } = useLibraryDialog();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [busyId, setBusyId] = useState<number | null>(null);

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (tab !== 'ALL' && entry.status !== tab) return false;
      if (!needle) return true;
      return entry.anime?.title.toLowerCase().includes(needle) || entry.notes.toLowerCase().includes(needle);
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'title') return (a.anime?.title ?? '').localeCompare(b.anime?.title ?? '');
      if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [entries, query, sort, tab]);

  const increment = async (entry: LibraryEntry) => {
    if (!entry.anime) return;
    const total = entry.anime.episodes;
    if (total !== null && entry.progress >= total) {
      notify('Judul ini sudah selesai.', { tone: 'info' });
      return;
    }
    const nextProgress = entry.progress + 1;
    setBusyId(entry.animeId);
    try {
      await updateEntry(entry.animeId, {
        progress: nextProgress,
        status: total !== null && nextProgress >= total ? 'COMPLETED' : entry.status === 'PLANNING' ? 'WATCHING' : entry.status,
      });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Gagal memperbarui progres.', { tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (entry: LibraryEntry) => {
    if (!entry.anime) return;
    setBusyId(entry.animeId);
    try {
      await removeEntry(entry.animeId);
      const snapshot = entry;
      notify(`${entry.anime.title} dihapus.`, {
        tone: 'info',
        action: {
          label: 'Urungkan',
          onClick: () => {
            void addEntry({
              animeId: snapshot.animeId,
              status: snapshot.status,
              score: snapshot.score,
              progress: snapshot.progress,
              notes: snapshot.notes,
              favorite: snapshot.favorite,
            })
              .then(() => notify(`${snapshot.anime?.title ?? 'Judul'} dikembalikan.`))
              .catch((reason: unknown) => notify(reason instanceof Error ? reason.message : 'Gagal mengurungkan.', { tone: 'error' }));
          },
        },
      });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Gagal menghapus judul ini.', { tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const tabCount = (value: Tab) => (value === 'ALL' ? stats.total : stats.statusCounts[value]);

  if (loading) {
    return (
      <div className="container library-loading">
        <div className="skeleton skeleton-library-title" />
        <div className="library-stats-skeleton">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton skeleton-stat" />)}
        </div>
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="skeleton skeleton-library-row" />)}
      </div>
    );
  }

  if (error && !entries.length) {
    return (
      <div className="container error-page">
        <p className="eyebrow">Rakmu</p>
        <h1>Daftar tidak bisa dibuka.</h1>
        <p>{error}</p>
        <button className="button button-primary" onClick={() => void refresh()}>Coba lagi</button>
      </div>
    );
  }

  const completionStyle = {
    '--completion': `${stats.completionRate * 3.6}deg`,
  } as CSSProperties;

  return (
    <div className="library-page">
      <header className="page-masthead library-masthead container">
        <div className="page-masthead-meta">
          <p className="eyebrow">Rakmu</p>
          <p className="masthead-edition">Privat · file lokal</p>
        </div>
        <div className="library-title-row">
          <div>
            <h1>Simpan yang dekat.</h1>
            <p className="library-subtitle">
              Daftar yang sedang ditonton, disimpan, dan masih dipikirkan.
              {refreshing && <span className="saving-indicator"><LoaderCircle size={12} className="spin" /> menyimpan</span>}
            </p>
          </div>
          <div className="library-actions">
            <a className="button button-outline" href={api.exportUrl()} download>
              <Download size={15} /> Ekspor
            </a>
            <Link to="/discover" className="button button-primary">
              <Plus size={15} /> Tambah judul
            </Link>
          </div>
        </div>
      </header>

      <section className="library-stats container">
        <div className="library-stat">
          <span className="stat-label">Di rak</span>
          <strong className="stat-value">{stats.total}</strong>
          <span className="stat-note">{stats.favorites} favorit</span>
        </div>
        <div className="library-stat">
          <span className="stat-label">Episode tercatat</span>
          <strong className="stat-value">{stats.episodesWatched}</strong>
          <span className="stat-note">{stats.hoursWatched} jam ditonton</span>
        </div>
        <div className="library-stat">
          <span className="stat-label">Rata-rata skor</span>
          <strong className="stat-value">{stats.meanScore?.toFixed(1) ?? '—'}</strong>
          <span className="stat-note">{stats.scoredTitles} judul dinilai</span>
        </div>
        <div className="library-stat library-stat-dial">
          <div className="completion-dial" style={completionStyle}>
            <span>{stats.completionRate}%</span>
          </div>
          <div>
            <span className="stat-label">Penyelesaian</span>
            <span className="stat-note">{stats.statusCounts.COMPLETED} dari {stats.total || 0} selesai</span>
          </div>
        </div>
      </section>

      {stats.topGenres.length > 0 && (
        <div className="mood-strip container">
          <span className="eyebrow">Suasana kamu</span>
          <div className="mood-list">
            {stats.topGenres.map((genre) => (
              <Link key={genre.name} to={`/discover?genre=${encodeURIComponent(genre.name)}`} className="mood-chip">
                {genreLabel(genre.name)} <span>{genre.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="library-list-section container">
        <div className="library-toolbar">
          <div className="library-tabs" role="tablist" aria-label="Saring daftar berdasarkan status">
            {TABS.map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                className={`library-tab ${tab === value ? 'is-active' : ''}`}
                onClick={() => setTab(value)}
              >
                {value === 'ALL' ? 'Semua' : STATUS_LABELS[value]}
                <span>{tabCount(value)}</span>
              </button>
            ))}
          </div>
          <div className="library-list-controls">
            <label className="library-search">
              <Search size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Saring daftar" aria-label="Saring daftar" />
            </label>
            <label className="select-wrap">
              <span className="sr-only">Urutkan daftar</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                <option value="updated">Terbaru diperbarui</option>
                <option value="title">Judul A–Z</option>
                <option value="score">Skor tertinggi</option>
              </select>
            </label>
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="empty-state library-empty">
            <p className="empty-index">{tab === 'ALL' && !query ? 'No. 00' : 'Tidak ada'}</p>
            <h2>{tab === 'ALL' && !query ? 'Rak kosong adalah awal.' : 'Belum ada di sini.'}</h2>
            <p>
              {tab === 'ALL' && !query
                ? 'Temukan judul yang cocok malam ini, lalu tambahkan ke daftar.'
                : 'Coba status lain atau bersihkan saringan.'}
            </p>
            <div className="empty-actions">
              <Link to="/discover" className="button button-primary">Jelajahi indeks <ArrowRight size={15} /></Link>
              {(tab !== 'ALL' || query) && (
                <button className="button button-quiet" onClick={() => { setTab('ALL'); setQuery(''); }}>Bersihkan saringan</button>
              )}
            </div>
          </div>
        ) : (
          <div className="library-rows">
            {visibleEntries.map((entry) => {
              if (!entry.anime) return null;
              const total = entry.anime.episodes;
              const percent = total ? Math.min(100, (entry.progress / total) * 100) : 0;
              const complete = total !== null && entry.progress >= total;
              return (
                <article className="library-row" key={entry.animeId}>
                  <Link to={`/anime/${entry.anime.id}`} className="library-cover-link">
                    <img src={mediaUrl(entry.anime.cover)} alt={`Sampul ${entry.anime.title}`} />
                  </Link>
                  <div className="library-row-main">
                    <div className="library-row-top">
                      <div>
                        <p className="card-kicker">{FORMAT_LABELS[entry.anime.format]} · {entry.anime.seasonYear ?? '—'}</p>
                        <h3><Link to={`/anime/${entry.anime.id}`}>{entry.anime.title}</Link></h3>
                      </div>
                      <span className={`library-status status-${entry.status.toLowerCase()}`}>{STATUS_LABELS[entry.status]}</span>
                    </div>
                    <div className="library-progress-row">
                      <div className="library-progress">
                        <div className="side-progress-label">
                          <span>{entry.progress} / {total ?? '—'} episode</span>
                          <span>{Math.round(percent)}%</span>
                        </div>
                        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
                      </div>
                      <button
                        className={`episode-add ${complete ? 'is-complete' : ''}`}
                        onClick={() => increment(entry)}
                        disabled={busyId === entry.animeId || complete}
                        aria-label={`Catat episode berikutnya dari ${entry.anime.title}`}
                        title={complete ? 'Selesai' : 'Catat satu episode lagi'}
                      >
                        {busyId === entry.animeId ? <LoaderCircle size={14} className="spin" /> : complete ? <Check size={14} /> : <Plus size={14} />}
                        <span>{complete ? 'Selesai' : '+1'}</span>
                      </button>
                    </div>
                    {entry.notes && <p className="library-note">“{entry.notes}”</p>}
                  </div>
                  <div className="library-row-side">
                    <div className="library-score">
                      <span className="library-score-label">Skor</span>
                      <strong>{formatScore(entry.score !== null ? entry.score * 10 : null)}</strong>
                    </div>
                    <div className="library-row-actions">
                      <button className="icon-button" onClick={() => open(entry.anime!)} aria-label={`Ubah ${entry.anime.title}`} title="Ubah catatan">
                        <ArrowUpRight size={17} />
                      </button>
                      <button
                        className="icon-button icon-danger"
                        onClick={() => void remove(entry)}
                        disabled={busyId === entry.animeId}
                        aria-label={`Hapus ${entry.anime.title}`}
                        title="Hapus dari daftar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span className="library-updated">Diperbarui {formatDate(entry.updatedAt, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
