import { ArrowRight, Compass, LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { usePageSeo } from '../lib/seo';
import { addRecentSearch, useRecentSearches } from '../lib/searchHistory';

export function SearchPage() {
  useDocumentTitle('Cari Anime Sub Indo');
  usePageSeo({
    title: 'Cari Anime Sub Indo — ReogNime',
    description: 'Cari anime subtitle Indonesia berdasarkan judul di katalog ReogNime.',
    noindex: true,
  });
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const recentSearches = useRecentSearches();
  const [query, setQuery] = useState(q);
  const search = useApi(
    (signal) => (q ? api.otaku.search(q, signal) : Promise.resolve(null)),
    [q],
  );

  useEffect(() => {
    setQuery(q);
    if (q.length >= 2) addRecentSearch(q);
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
          <p className="eyebrow"><span className="watch-live-dot" /> ReogNime / Cari</p>
          <Link to="/all" className="text-link">Semua anime A–Z <ArrowRight size={14} /></Link>
        </div>
        <div className="search-title-row">
          <div>
            <p className="section-index">Pencarian</p>
            <h1>Cari <em>anime.</em></h1>
          </div>
          <p>Cari berdasarkan judul dari seluruh katalog. Hasil mencakup seri tayang dan tamat.</p>
        </div>
        <form className="watch-search search-page-field" onSubmit={submit}>
          <Search size={19} strokeWidth={1.6} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari judul atau musim…"
            aria-label="Cari anime"
            autoFocus
          />
          {query && (
            <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Bersihkan pencarian">
              <X size={16} />
            </button>
          )}
          <button type="submit" className="watch-search-submit">
            {searching ? <LoaderCircle size={15} className="spin" />  : 'Cari'}
          </button>
        </form>
      </header>

      <div className="container search-content">
        {!q ? (
          <>
            {recentSearches.items.length > 0 && (
              <div className="recent-searches">
                <div className="recent-searches-head">
                  <p className="section-index">Pencarian terakhir</p>
                  <button type="button" className="text-button" onClick={recentSearches.clear}>Hapus</button>
                </div>
                <div className="recent-searches-list">
                  {recentSearches.items.map((item) => (
                    <Link key={item} to={`/search?q=${encodeURIComponent(item)}`} className="recent-search-chip">
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="search-empty">
              <div className="search-empty-copy">
                <p className="section-index">Belum tahu mau nonton apa?</p>
                <h2>Mulai dari daftar.</h2>
                <p>Pilih tayang, tamat, genre, atau lihat semua judul A–Z.</p>
              </div>
              <div className="search-empty-links">
                <Link to="/ongoing"><Compass size={18} /><span>Tayang</span><ArrowRight size={14} /></Link>
                <Link to="/completed"><Compass size={18} /><span>Tamat</span><ArrowRight size={14} /></Link>
                <Link to="/genres"><Compass size={18} /><span>Genre</span><ArrowRight size={14} /></Link>
                <Link to="/all"><Compass size={18} /><span>Semua anime</span><ArrowRight size={14} /></Link>
              </div>
            </div>
          </>
        ) : searching ? (
          <div className="searching-indicator"><LoaderCircle size={18} className="spin" /> Mencari…</div>
        ) : search.error ? (
          <div className="inline-error">
            <p>{search.error}</p>
            <button className="button button-primary" onClick={search.reload}>Coba lagi</button>
          </div>
        ) : (
          <>
            <div className="search-results-head">
              <div>
                <p className="section-index">Hasil pencarian</p>
                <h2>“{q}”</h2>
              </div>
              <span>{results.length} judul</span>
            </div>
            {results.length ? (
              <div className="watch-grid">
                {results.map((anime, index) => <OtakuCard key={anime.slug} anime={anime} eager={index < 5} />)}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-index">No. 00</p>
                <h2>Tidak ditemukan.</h2>
                <p>Coba kata kunci lebih pendek, judul Jepangnya, atau lihat katalog lengkap.</p>
                <div className="empty-actions">
                  <Link to="/all" className="button button-primary">Lihat A–Z</Link>
                  <button className="button button-quiet" onClick={() => { setQuery(''); setParams({}); }}>Bersihkan pencarian</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
