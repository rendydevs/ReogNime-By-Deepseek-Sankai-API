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
  plural,
} from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import { mediaUrl } from '../lib/media';
import type { LibraryEntry, LibraryStatus } from '../types';

type Tab = 'ALL' | LibraryStatus;
type Sort = 'updated' | 'title' | 'score';

const TABS: Tab[] = ['ALL', ...STATUS_ORDER];

export function LibraryPage() {
  useDocumentTitle('My list');
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
      notify('This title is already complete.', { tone: 'info' });
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
      notify(reason instanceof Error ? reason.message : 'Could not update progress.', { tone: 'error' });
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
      notify(`${entry.anime.title} removed.`, {
        tone: 'info',
        action: {
          label: 'Undo',
          onClick: () => {
            void addEntry({
              animeId: snapshot.animeId,
              status: snapshot.status,
              score: snapshot.score,
              progress: snapshot.progress,
              notes: snapshot.notes,
              favorite: snapshot.favorite,
            })
              .then(() => notify(`${snapshot.anime?.title ?? 'Title'} restored.`))
              .catch((reason: unknown) => notify(reason instanceof Error ? reason.message : 'Could not undo.', { tone: 'error' }));
          },
        },
      });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Could not remove this title.', { tone: 'error' });
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
        <p className="eyebrow">Your shelf</p>
        <h1>We couldn't open your list.</h1>
        <p>{error}</p>
        <button className="button button-primary" onClick={() => void refresh()}>Try again</button>
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
          <p className="eyebrow">Your shelf</p>
          <p className="masthead-edition">Private by default · Local file</p>
        </div>
        <div className="library-title-row">
          <div>
            <h1>Keep the good ones close.</h1>
            <p className="library-subtitle">
              A list of what you're watching, saving, and still thinking about.
              {refreshing && <span className="saving-indicator"><LoaderCircle size={12} className="spin" /> saving</span>}
            </p>
          </div>
          <div className="library-actions">
            <a className="button button-outline" href={api.exportUrl()} download>
              <Download size={15} /> Export
            </a>
            <Link to="/discover" className="button button-primary">
              <Plus size={15} /> Add a title
            </Link>
          </div>
        </div>
      </header>

      <section className="library-stats container">
        <div className="library-stat">
          <span className="stat-label">On the shelf</span>
          <strong className="stat-value">{stats.total}</strong>
          <span className="stat-note">{plural(stats.favorites, 'favourite')}</span>
        </div>
        <div className="library-stat">
          <span className="stat-label">Episodes logged</span>
          <strong className="stat-value">{stats.episodesWatched}</strong>
          <span className="stat-note">{stats.hoursWatched}h watched</span>
        </div>
        <div className="library-stat">
          <span className="stat-label">Mean score</span>
          <strong className="stat-value">{stats.meanScore?.toFixed(1) ?? '—'}</strong>
          <span className="stat-note">{stats.scoredTitles} titles scored</span>
        </div>
        <div className="library-stat library-stat-dial">
          <div className="completion-dial" style={completionStyle}>
            <span>{stats.completionRate}%</span>
          </div>
          <div>
            <span className="stat-label">Completion</span>
            <span className="stat-note">{stats.statusCounts.COMPLETED} of {stats.total || 0} finished</span>
          </div>
        </div>
      </section>

      {stats.topGenres.length > 0 && (
        <div className="mood-strip container">
          <span className="eyebrow">Your moods</span>
          <div className="mood-list">
            {stats.topGenres.map((genre) => (
              <Link key={genre.name} to={`/discover?genre=${encodeURIComponent(genre.name)}`} className="mood-chip">
                {genre.name} <span>{genre.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="library-list-section container">
        <div className="library-toolbar">
          <div className="library-tabs" role="tablist" aria-label="Filter library by status">
            {TABS.map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                className={`library-tab ${tab === value ? 'is-active' : ''}`}
                onClick={() => setTab(value)}
              >
                {value === 'ALL' ? 'All' : STATUS_LABELS[value]}
                <span>{tabCount(value)}</span>
              </button>
            ))}
          </div>
          <div className="library-list-controls">
            <label className="library-search">
              <Search size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter your list" aria-label="Filter your list" />
            </label>
            <label className="select-wrap">
              <span className="sr-only">Sort your list</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                <option value="updated">Recently updated</option>
                <option value="title">Title A–Z</option>
                <option value="score">Highest score</option>
              </select>
            </label>
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="empty-state library-empty">
            <p className="empty-index">{tab === 'ALL' && !query ? 'No. 00' : 'No match'}</p>
            <h2>{tab === 'ALL' && !query ? 'An empty shelf is a beginning.' : 'Nothing here yet.'}</h2>
            <p>
              {tab === 'ALL' && !query
                ? 'Find a title that sounds like tonight, and add it to your list.'
                : 'Try another status or clear the filter.'}
            </p>
            <div className="empty-actions">
              <Link to="/discover" className="button button-primary">Browse the index <ArrowRight size={15} /></Link>
              {(tab !== 'ALL' || query) && (
                <button className="button button-quiet" onClick={() => { setTab('ALL'); setQuery(''); }}>Clear filters</button>
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
                    <img src={mediaUrl(entry.anime.cover)} alt={`${entry.anime.title} cover`} />
                  </Link>
                  <div className="library-row-main">
                    <div className="library-row-top">
                      <div>
                        <p className="card-kicker">{FORMAT_LABELS[entry.anime.format]} · {entry.anime.seasonYear ?? 'TBA'}</p>
                        <h3><Link to={`/anime/${entry.anime.id}`}>{entry.anime.title}</Link></h3>
                      </div>
                      <span className={`library-status status-${entry.status.toLowerCase()}`}>{STATUS_LABELS[entry.status]}</span>
                    </div>
                    <div className="library-progress-row">
                      <div className="library-progress">
                        <div className="side-progress-label">
                          <span>{entry.progress} / {total ?? '—'} episodes</span>
                          <span>{Math.round(percent)}%</span>
                        </div>
                        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
                      </div>
                      <button
                        className={`episode-add ${complete ? 'is-complete' : ''}`}
                        onClick={() => increment(entry)}
                        disabled={busyId === entry.animeId || complete}
                        aria-label={`Log next episode of ${entry.anime.title}`}
                        title={complete ? 'Complete' : 'Log one more episode'}
                      >
                        {busyId === entry.animeId ? <LoaderCircle size={14} className="spin" /> : complete ? <Check size={14} /> : <Plus size={14} />}
                        <span>{complete ? 'Done' : '+1'}</span>
                      </button>
                    </div>
                    {entry.notes && <p className="library-note">“{entry.notes}”</p>}
                  </div>
                  <div className="library-row-side">
                    <div className="library-score">
                      <span className="library-score-label">Score</span>
                      <strong>{formatScore(entry.score !== null ? entry.score * 10 : null)}</strong>
                    </div>
                    <div className="library-row-actions">
                      <button className="icon-button" onClick={() => open(entry.anime!)} aria-label={`Edit ${entry.anime.title}`} title="Edit entry">
                        <ArrowUpRight size={17} />
                      </button>
                      <button
                        className="icon-button icon-danger"
                        onClick={() => void remove(entry)}
                        disabled={busyId === entry.animeId}
                        aria-label={`Remove ${entry.anime.title}`}
                        title="Remove from list"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span className="library-updated">Updated {formatDate(entry.updatedAt, { month: 'short', day: 'numeric' })}</span>
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
