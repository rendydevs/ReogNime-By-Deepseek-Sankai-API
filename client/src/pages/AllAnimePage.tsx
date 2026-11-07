import { ArrowRight, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import type { OtakuUnlimitedGroup } from '../types';

function groupId(index: number) {
  return `az-group-${index}`;
}

export function AllAnimePage() {
  useDocumentTitle('All anime A–Z');
  const all = useApi((signal) => api.otaku.unlimited(signal), []);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const data = all.data?.data ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data
      .map((group: OtakuUnlimitedGroup) => ({
        ...group,
        animeList: group.animeList.filter((anime) => anime.title.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.animeList.length > 0);
  }, [all.data, query]);

  const total = useMemo(() => (all.data?.data ?? []).reduce((sum, group) => sum + group.animeList.length, 0), [all.data]);
  const visibleTotal = useMemo(() => groups.reduce((sum, group) => sum + group.animeList.length, 0), [groups]);

  const jump = (index: number) => {
    document.getElementById(groupId(index))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="watch-page all-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><span className="watch-live-dot" /> ReogNime / Complete catalog</p>
          <Link to="/search" className="text-link">Search titles <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">The unlimited shelf</p>
            <h1>Everything,<br /><em>A–Z.</em></h1>
          </div>
          <div className="catalog-title-aside">
            <p>
              The complete anime catalog — {total || '…'} titles, indexed and searchable locally
              after a single cached request.
            </p>
            <div className="az-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter the A–Z shelf"
                aria-label="Filter all anime titles"
              />
              {query && <button onClick={() => setQuery('')} aria-label="Clear filter"><X size={14} /></button>}
            </div>
          </div>
        </div>
      </header>

      <div className="container all-content">
        {all.loading ? (
          <div className="all-loading">
            <div className="skeleton skeleton-line skeleton-line-short" />
            {Array.from({ length: 8 }, (_, index) => (
              <div className="skeleton all-loading-row" key={index} />
            ))}
          </div>
        ) : all.error ? (
          <div className="inline-error">
            <p>{all.error}</p>
            <button className="button button-primary" onClick={all.reload}>Try again</button>
          </div>
        ) : (
          <div className="all-layout">
            <aside className="az-index" aria-label="Jump to letter">
              <span className="az-index-label">Jump</span>
              {groups.map((group, index) => (
                <button key={group.letter} onClick={() => jump(index)}>{group.letter}</button>
              ))}
            </aside>
            <div className="az-content">
              <div className="az-summary">
                <span>{query ? `${visibleTotal} matching titles` : `${total} titles`}</span>
                <span>{groups.length} letters</span>
              </div>
              {groups.length ? groups.map((group, index) => (
                <section className="az-group" id={groupId(index)} key={group.letter}>
                  <header>
                    <h2>{group.letter}</h2>
                    <span>{group.animeList.length}</span>
                  </header>
                  <div className="az-titles">
                    {group.animeList.map((anime) => (
                      <Link to={`/watch/anime/${anime.slug}`} className="az-title" key={anime.slug}>
                        <span>{anime.title}</span>
                        <ArrowRight size={12} />
                      </Link>
                    ))}
                  </div>
                </section>
              )) : (
                <div className="empty-state">
                  <p className="empty-index">No match</p>
                  <h2>No title starts there.</h2>
                  <p>Try fewer letters.</p>
                  <div className="empty-actions">
                    <button className="button button-primary" onClick={() => setQuery('')}>Clear filter</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
