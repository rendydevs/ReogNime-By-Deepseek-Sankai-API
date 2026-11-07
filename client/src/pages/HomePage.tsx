import { ArrowRight, CalendarDays, ChevronRight, Compass, ListFilter, Play, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { OtakuPoster } from '../components/OtakuPoster';
import { Reveal } from '../components/Reveal';
import { TitleMarquee } from '../components/TitleMarquee';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';

function HomeSkeleton() {
  return (
    <div className="container watch-loading home-watch-loading">
      <div className="skeleton skeleton-watch-title" />
      <div className="skeleton skeleton-home-search" />
      <div className="skeleton screening-hero-skeleton" />
      <div className="watch-section">
        <div className="skeleton skeleton-title" />
        <div className="watch-grid">
          {Array.from({ length: 10 }, (_, index) => (
            <div className="otaku-skeleton" key={index}>
              <div className="skeleton otaku-skeleton-poster" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line skeleton-line-short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CatalogHead({
  index,
  title,
  description,
  to,
  action,
}: {
  index: string;
  title: ReactNode;
  description: string;
  to: string;
  action: string;
}) {
  return (
    <div className="watch-section-head">
      <div>
        <p className="section-index">{index}</p>
        <h2>{title}</h2>
      </div>
      <p>
        {description}{' '}
        <Link to={to} className="home-section-link">
          {action} <ArrowRight size={13} />
        </Link>
      </p>
    </div>
  );
}

export function HomePage() {
  useDocumentTitle('Nonton anime tanpa ribet');
  const home = useApi((signal) => api.otaku.home(signal), []);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const ongoing = home.data?.data.ongoing ?? [];
  const completed = home.data?.data.completed ?? [];
  const features = useMemo(() => ongoing.slice(0, 4), [ongoing]);
  const feature = features[active] ?? ongoing[0] ?? completed[0] ?? null;

  useEffect(() => {
    if (active >= features.length) setActive(0);
  }, [active, features.length]);

  useEffect(() => {
    if (paused || features.length < 2) return;
    // Auto-advance only where the pager is visible, so phones and tablets
    // never get a hero that changes underneath them without a control.
    if (!window.matchMedia('(min-width: 1181px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % features.length);
    }, 7600);
    return () => window.clearTimeout(timer);
  }, [active, features.length, paused]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };

  if (home.loading) return <HomeSkeleton />;

  if (home.error) {
    return (
      <div className="container error-page">
        <p className="eyebrow">ReogNime / unavailable</p>
        <h1>The room is quiet right now.</h1>
        <p>{home.error}</p>
        <div className="empty-actions">
          <button className="button button-primary" onClick={home.reload}>Try again</button>
          <Link to="/developers" className="button button-quiet">API status</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-page home-watch-page">
      <header className="container watch-masthead home-watch-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><span className="watch-live-dot" /> Streaming · Subtitle Indonesia</p>
          <Link to="/schedule" className="text-link">Airing schedule <ArrowRight size={14} /></Link>
        </div>
        <div className="home-watch-title-row">
          <div>
            <h1>Watch anime,<br /><em>quietly.</em></h1>
            <p>
              The weekly lineup, without the noise. Find something airing,
              something finished, or something you missed the first time.
            </p>
          </div>
          <form className="watch-search home-search" onSubmit={search}>
            <Search size={19} strokeWidth={1.6} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search every anime title…"
              aria-label="Search anime"
              type="search"
            />
            <button type="submit" className="watch-search-submit">Search</button>
          </form>
        </div>
        <div className="home-quick-links">
          <Link to="/ongoing"><span>01</span> Ongoing <small>{ongoing.length}</small></Link>
          <Link to="/completed"><span>02</span> Completed <small>{completed.length}</small></Link>
          <Link to="/genres"><span>03</span> Genres</Link>
          <Link to="/all"><span>04</span> All anime A–Z</Link>
          <Link to="/schedule"><span>05</span> This week</Link>
        </div>
      </header>

      {feature ? (
        <section
          className={`screening-hero container home-screening-hero ${paused ? 'is-paused' : ''}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
          }}
        >
          <div className="screening-visual">
            {features.map((item, index) => (
              item.poster ? (
                <img
                  key={item.slug}
                  src={item.poster}
                  alt=""
                  aria-hidden="true"
                  className={`screening-backdrop ${index === active ? 'is-active' : ''}`}
                  referrerPolicy="no-referrer"
                />
              ) : null
            ))}
            <div className="screening-visual-veil" />
            <div className="screening-poster-frame" key={feature.slug}>
              <OtakuPoster title={feature.title} poster={feature.poster} className="screening-poster" eager />
            </div>
            <span className="screening-poster-caption">SUB INDO</span>
            <span className="screening-live"><span className="marquee-dot" /> On air</span>
          </div>
          <div className="screening-copy" key={feature.slug}>
            <p className="eyebrow"><span className="accent-dot" /> Now airing</p>
            <h2>{feature.title}</h2>
            <div className="screening-meta">
              <span>{feature.status ?? 'Ongoing'}</span>
              {feature.episodes !== null && <span>Episode {feature.episodes}</span>}
              {feature.releaseDay && <span>{feature.releaseDay}</span>}
              {feature.latestReleaseDate && <span>Updated {feature.latestReleaseDate}</span>}
            </div>
            <p className="screening-lede">
              Fresh from the weekly shelf. Indonesian subtitles, a full episode list,
              and every available mirror in one place.
            </p>
            <div className="screening-actions">
              <Link to={`/watch/anime/${feature.slug}`} className="button button-paper">
                <Play size={15} fill="currentColor" /> View series
              </Link>
              <Link to="/schedule" className="button button-ghost-light">
                <CalendarDays size={15} /> Release schedule
              </Link>
            </div>
          </div>
          <div className="screening-aside home-feature-aside">
            {features.length > 1 ? (
              <div className="home-feature-pager" aria-label="Featured ongoing anime">
                {features.map((item, index) => (
                  <button
                    key={item.slug}
                    className={index === active ? 'is-active' : ''}
                    onClick={() => setActive(index)}
                    aria-label={`Feature ${item.title}`}
                    aria-current={index === active}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span className="home-feature-line"><span /></span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="screening-aside-label">Screening 01</span>
            )}
            <div className="screening-aside-index">{String(active + 1).padStart(2, '0')}</div>
            <span className="screening-aside-rule" />
            <span className="screening-aside-note">Subtitle Indonesia.<br />Every single week.</span>
          </div>
        </section>
      ) : null}

      <div className="container home-marquee-wrap">
        <TitleMarquee items={ongoing.slice(0, 9)} />
      </div>

      <div className="container watch-content home-watch-content">
        {ongoing.length > 0 && (
          <Reveal className="watch-section" delay={20}>
            <CatalogHead
              index="01 — Ongoing"
              title={<>Airing <em>now.</em></>}
              description={`${ongoing.length} series with fresh Indonesian subtitles, straight from the weekly home feed.`}
              to="/ongoing"
              action="All ongoing"
            />
            <div className="watch-grid">
              {ongoing.map((anime, index) => (
                <OtakuCard key={anime.slug} anime={anime} eager={index < 5} />
              ))}
            </div>
          </Reveal>
        )}

        {completed.length > 0 && (
          <Reveal className="watch-section" delay={40}>
            <CatalogHead
              index="02 — Completed"
              title={<>Finished, <em>in one sitting.</em></>}
              description={`${completed.length} recently completed series for the nights when you need an ending.`}
              to="/completed"
              action="All completed"
            />
            <div className="watch-grid">
              {completed.map((anime) => <OtakuCard key={anime.slug} anime={anime} />)}
            </div>
          </Reveal>
        )}

        <Reveal className="home-browse" delay={30}>
          <div className="home-browse-head">
            <p className="section-index">03 — Keep exploring</p>
            <h2>The rest of the <em>room.</em></h2>
            <p>Every corner of the streaming catalog has a place in the interface. Start here.</p>
          </div>
          <div className="home-browse-grid">
            <Link to="/all" className="home-browse-card">
              <span className="home-browse-index">01</span>
              <ListFilter size={22} />
              <div>
                <h3>All anime, A–Z</h3>
                <p>The complete anime catalog, indexed by title.</p>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link to="/genres" className="home-browse-card">
              <span className="home-browse-index">02</span>
              <Compass size={22} />
              <div>
                <h3>Browse every genre</h3>
                <p>From action to vampire, all 36 shelves.</p>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link to="/schedule" className="home-browse-card">
              <span className="home-browse-index">03</span>
              <CalendarDays size={22} />
              <div>
                <h3>This week's schedule</h3>
                <p>Seven days of releases, exactly as the provider lists them.</p>
              </div>
              <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>

        <Reveal className="home-archive-cta" delay={20}>
          <div>
            <p className="section-index">The ReogNime archive</p>
            <h3>Still keep a quiet shelf.</h3>
            <p>Our original editorial index and personal list live a little further in.</p>
          </div>
          <div className="home-archive-actions">
            <Link to="/archive" className="text-link">Enter the archive <ChevronRight size={14} /></Link>
            <Link to="/library" className="text-link">My list <Sparkles size={13} /></Link>
          </div>
        </Reveal>

        <p className="watch-attribution">
          ReogNime does not host or upload video files.
        </p>
      </div>
    </div>
  );
}
