import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { OPENAPI_URL } from '../lib/api';
import { ChatWidget } from './ChatWidget';
import { CommandSearch } from './CommandSearch';
import { Logo } from './Logo';

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/ongoing', label: 'Tayang' },
  { to: '/completed', label: 'Tamat' },
  { to: '/schedule', label: 'Jadwal' },
  { to: '/genres', label: 'Genre' },
  { to: '/all', label: 'A–Z' },
];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((value) => !value);
        return;
      }
      if (event.key === '/' && !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="site-shell">
      <a href="#main" className="skip-link">Lewati ke konten</a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Navigasi utama">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button className="search-trigger" onClick={() => { setMenuOpen(false); setSearchOpen(true); }} aria-label="Cari anime">
              <Search size={16} strokeWidth={1.8} />
              <span>Cari</span>
              <kbd>⌘K</kbd>
            </button>
            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={`Ganti ke tema ${theme === 'light' ? 'gelap' : 'terang'}`}
              title={`Ganti ke tema ${theme === 'light' ? 'gelap' : 'terang'}`}
            >
              {theme === 'light' ? <Moon size={18} strokeWidth={1.6} /> : <Sun size={18} strokeWidth={1.6} />}
            </button>
            <button
              className="icon-button mobile-menu-button"
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Navigasi seluler">
            {NAV_ITEMS.map((item, index) => (
              <NavLink key={item.to} to={item.to} className="mobile-nav-link">
                <span className="mobile-nav-index">0{index + 1}</span>
                {item.label}
              </NavLink>
            ))}
            <button
              className="mobile-nav-link mobile-search-link"
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
            >
              <span className="mobile-nav-index">07</span>
              Cari
            </button>
          </nav>
        )}
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Logo />
            <p className="footer-made">made by aldi with love</p>
            <p className="footer-source">Data streaming dari <a href="https://otakudesu.or.at" target="_blank" rel="noreferrer">Otakudesu API</a>.</p>
          </div>
          <div className="footer-links">
            <div>
              <p className="footer-heading">Tonton</p>
              <Link to="/ongoing">Sedang tayang</Link>
              <Link to="/completed">Tamat</Link>
              <Link to="/schedule">Jadwal rilis</Link>
              <Link to="/search">Cari judul</Link>
            </div>
            <div>
              <p className="footer-heading">Jelajah</p>
              <Link to="/genres">Genre</Link>
              <Link to="/all">Semua anime A–Z</Link>
              <Link to="/developers">Referensi API</Link>
              <a href={OPENAPI_URL} target="_blank" rel="noreferrer">Spesifikasi OpenAPI</a>
            </div>
            <div>
              <p className="footer-heading">Arsip</p>
              <Link to="/archive">Arsip ReogNime</Link>
              <Link to="/discover">Indeks penemuan</Link>
              <Link to="/library">Daftar saya</Link>
              <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ReogNime. Data streaming dari Otakudesu API. Arsip dari AniList.</span>
          <span className="footer-colophon">Dibuat dengan cinta di Ponorogo.</span>
        </div>
      </footer>

      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {location.pathname !== '/admin' && <ChatWidget />}
    </div>
  );
}
