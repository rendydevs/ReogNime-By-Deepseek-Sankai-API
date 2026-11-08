import { ArrowRight, Compass, LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';

export function SearchPage() {
  useDocumentTitle('Cari Anime Sub Indo');
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const [query, setQuery] = useState(q);
  const search = useApi(
    (signal) => (q ? api.otaku.search(q, signal) : Promise.resolve(null)),
    [q],
  );

  useEffect(() => {
    setQuery(q);
  }, [q]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    setParams(next ? { q: next } : {});
  };

  const results = search.data?.data ?? [];
  const searching = Boolean(q) && search.loading;

  return (
    <div className="watch-page search-page">
      <header className="container search-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><span className="watch-live-dot" /> ReogNime / Search</p>
          <Link to="/all" className="text-link">All anime A–Z <ArrowRight size={14} /></Link>
        </div>
        <div className="search-title-row">
          <div>
            <p className="section-index">Find your next episode</p>
            <h1>Search the<br /><em>room.</em></h1>
          </div>
          <p>One query across every title, with Indonesian subtitles and episode mirrors waiting inside.</p>
        </div>
        <form className="watch-search search-page-field" onSubmit={submit}>
          <Search size={19} strokeWidth={1.6} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a title, a season, a feeling…"
            aria-label="Search anime"
            autoFocus
          />
          {query && (
            <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear query">
              <X size={16} />
            </button>
          )}
          <button type="submit" className="watch-search-submit">
            {searching ? <LoaderCircle size={15} className="spin" /> : 'Search'}
          </button>
        </form>
      </header>

      <div className="container search-content">
        {!q ? (
          <div className="search-empty">
            <div className="search-empty-copy">
              <p className="section-index">Start somewhere</p>
              <h2>What sounds like tonight?</h2>
              <p>Search by the Japanese romaji title, or take a door into the shelf.</p>
            </div>
            <div className="search-empty-links">
              <Link to="/ongoing"><Compass size={18} /><span>Airing now</span><ArrowRight size={14} /></Link>
              <Link to="/completed"><Compass size={18} /><span>Completed series</span><ArrowRight size={14} /></Link>
              <Link to="/genres"><Compass size={18} /><span>All genres</span><ArrowRight size={14} /></Link>
              <Link to="/all"><Compass size={18} /><span>Everything A–Z</span><ArrowRight size={14} /></Link>
            </div>
          </div>
        ) : searching ? (
          <div className="searching-indicator"><LoaderCircle size={18} className="spin" /> Searching the shelf…</div>
        ) : search.error ? (
          <div className="inline-error">
            <p>{search.error}</p>
            <button className="button button-primary" onClick={search.reload}>Try again</button>
          </div>
        ) : (
          <>
            <div className="search-results-head">
              <div>
                <p className="section-index">Search results</p>
                <h2>“{q}”</h2>
              </div>
              <span>{results.length} {results.length === 1 ? 'title' : 'titles'}</span>
            </div>
            {results.length ? (
              <div className="watch-grid">
                {results.map((anime) => <OtakuCard key={anime.slug} anime={anime} />)}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-index">No. 00</p>
                <h2>Nothing in the room.</h2>
                <p>Try a shorter title, the Japanese name, or browse the full catalog.</p>
                <div className="empty-actions">
                  <Link to="/all" className="button button-primary">Browse A–Z</Link>
                  <button className="button button-quiet" onClick={() => { setQuery(''); setParams({}); }}>Clear search</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
