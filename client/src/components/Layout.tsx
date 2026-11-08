import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { OPENAPI_URL } from '../lib/api';
import { ChatWidget } from './ChatWidget';
import { CommandSearch } from './CommandSearch';
import { Logo } from './Logo';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/ongoing', label: 'Ongoing' },
  { to: '/completed', label: 'Completed' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/genres', label: 'Genres' },
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
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
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
            <button className="search-trigger" onClick={() => { setMenuOpen(false); setSearchOpen(true); }} aria-label="Search anime">
              <Search size={16} strokeWidth={1.8} />
              <span>Search</span>
              <kbd>⌘K</kbd>
            </button>
            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={18} strokeWidth={1.6} /> : <Sun size={18} strokeWidth={1.6} />}
            </button>
            <button
              className="icon-button mobile-menu-button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
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
              Search
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
              <p className="footer-heading">Watch</p>
              <Link to="/ongoing">Airing now</Link>
              <Link to="/completed">Completed</Link>
              <Link to="/schedule">Release schedule</Link>
              <Link to="/search">Search titles</Link>
            </div>
            <div>
              <p className="footer-heading">Browse</p>
              <Link to="/genres">Genres</Link>
              <Link to="/all">All anime A–Z</Link>
              <Link to="/developers">API reference</Link>
              <a href={OPENAPI_URL} target="_blank" rel="noreferrer">OpenAPI spec</a>
            </div>
            <div>
              <p className="footer-heading">The archive</p>
              <Link to="/archive">ReogNime archive</Link>
              <Link to="/discover">Discovery index</Link>
              <Link to="/library">My list</Link>
              <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ReogNime. Data streaming dari Otakudesu API. Arsip dari AniList.</span>
          <span className="footer-colophon">Made with love in Ponorogo.</span>
        </div>
      </footer>

      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {location.pathname !== '/admin' && <ChatWidget />}
    </div>
  );
}
