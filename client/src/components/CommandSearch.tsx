import {
  ArrowRight,
  CalendarDays,
  Compass,
  CornerDownLeft,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  Play,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useDebouncedValue, useLockBodyScroll } from '../lib/hooks';
import { mediaUrl } from '../lib/media';
import type { OtakuCard } from '../types';

interface CommandSearchProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_LINKS = [
  { label: 'Airing now', description: 'Every ongoing series', to: '/ongoing', Icon: Play },
  { label: 'Completed anime', description: 'Series with an ending', to: '/completed', Icon: LayoutGrid },
  { label: 'Genres', description: 'Browse by mood', to: '/genres', Icon: Compass },
  { label: 'All anime A–Z', description: 'The complete catalog', to: '/all', Icon: ListFilter },
  { label: 'Release schedule', description: 'What airs this week', to: '/schedule', Icon: CalendarDays },
];

function ResultCover({ anime }: { anime: OtakuCard }) {
  const [failed, setFailed] = useState(false);
  if (!anime.poster || failed) {
    return <span className="command-cover command-cover-fallback">{anime.title.slice(0, 1)}</span>;
  }
  return (
    <img
      src={mediaUrl(anime.poster)}
      alt=""
      className="command-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function CommandSearch({ open, onClose }: CommandSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 420);
  const [results, setResults] = useState<OtakuCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = debouncedQuery.trim();

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setError(null);
    setLoading(false);
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // While the debounce catches up, never fetch a stale query.
    if (normalizedQuery !== query.trim()) return;
    if (normalizedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    api.otaku
      .search(normalizedQuery, controller.signal)
      .then((payload) => {
        if (!active) return;
        setResults(payload.data);
        setActiveIndex(0);
      })
      .catch((reason: unknown) => {
        if (!active || (reason instanceof DOMException && reason.name === 'AbortError')) return;
        setError(reason instanceof Error ? reason.message : 'Anime search is unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [normalizedQuery, open, query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (!results.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === 'Enter' && results[activeIndex]) {
        event.preventDefault();
        navigate(`/watch/anime/${results[activeIndex].slug}`);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, navigate, onClose, open, results]);

  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.querySelectorAll<HTMLElement>('.command-result')[activeIndex];
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open) return null;

  const openSearchPage = () => {
    onClose();
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  };

  return (
    <div className="search-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="command-panel command-panel-watch" role="dialog" aria-modal="true" aria-label="Search the anime catalog">
        <div className="command-input-row">
          <Search size={19} strokeWidth={1.7} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search every anime title…"
            aria-label="Search anime titles"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !results.length && query.trim().length >= 2) {
                event.preventDefault();
                openSearchPage();
              }
            }}
          />
          {loading ? <LoaderCircle size={17} className="spin muted-icon" /> : null}
          <button className="command-close" onClick={onClose} aria-label="Close search">
            <X size={17} />
          </button>
        </div>

        <div className="command-meta">
          <span>
            {normalizedQuery.length >= 2
              ? `Results for “${normalizedQuery}”`
              : normalizedQuery
                ? 'Keep typing…'
                : 'Quick navigation'}
          </span>
          <span>{normalizedQuery.length >= 2 ? `${results.length} ${results.length === 1 ? 'title' : 'titles'}` : 'ReogNime'}</span>
        </div>

        <div className="command-results" ref={listRef}>
          {normalizedQuery.length < 2 ? (
            <div className="command-quick">
              <p className="command-quick-label">
                {normalizedQuery ? 'Type at least 2 characters to search.' : 'Search by title, or jump straight in.'}
              </p>
              {QUICK_LINKS.map(({ label, description, to, Icon }) => (
                <button
                  key={to}
                  className="command-quick-link"
                  onClick={() => {
                    onClose();
                    navigate(to);
                  }}
                >
                  <span className="command-quick-icon"><Icon size={17} /></span>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          ) : error ? (
            <p className="command-empty">{error}</p>
          ) : !loading && results.length === 0 ? (
            <div className="command-empty">
              <p>Nothing found.</p>
              <span>Try a shorter title, or use the full search page.</span>
            </div>
          ) : (
            results.map((anime, index) => (
              <button
                key={anime.slug}
                className={`command-result ${index === activeIndex ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  navigate(`/watch/anime/${anime.slug}`);
                  onClose();
                }}
              >
                <ResultCover anime={anime} />
                <span className="command-result-body">
                  <strong>{anime.title}</strong>
                  <span>
                    {[anime.status, anime.type, anime.season, anime.episodes ? `Ep. ${anime.episodes}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="command-result-score">{anime.score !== null ? `★ ${anime.score.toFixed(2)}` : ''}</span>
                <ArrowRight size={15} className="command-arrow" />
              </button>
            ))
          )}
        </div>

        <footer className="command-footer">
          {normalizedQuery.length >= 2 ? (
            <span><CornerDownLeft size={12} /> to open</span>
          ) : (
            <span><Search size={12} /> ReogNime catalog</span>
          )}
          <span><kbd>esc</kbd> to close</span>
          <button onClick={openSearchPage}>Full search page</button>
        </footer>
      </div>
    </div>
  );
}
