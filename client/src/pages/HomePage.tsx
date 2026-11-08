import { ArrowRight, CalendarDays, ChevronRight, Compass, ListFilter, Play, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { LandingAtmosphere } from '../components/LandingAtmosphere';
import { OtakuPoster } from '../components/OtakuPoster';
import { Reveal } from '../components/Reveal';
import { TitleMarquee } from '../components/TitleMarquee';
import { API_HEALTH_URL, api } from '../lib/api';
import { otakuStatusLabel } from '../lib/format';
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
  useDocumentTitle('Nonton Anime Sub Indo Tanpa Ribet');
  const home = useApi((signal) => api.otaku.home(signal), []);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ phase: 'checking' | 'online' | 'offline'; ms: number | null }>({ phase: 'checking', ms: null });

  useEffect(() => {
    let active = true;
    const ping = async () => {
      const startedAt = performance.now();
      try {
        const response = await fetch(API_HEALTH_URL, { cache: 'no-store' });
        const ms = Math.round(performance.now() - startedAt);
        if (active) setApiStatus({ phase: response.ok ? 'online' : 'offline', ms });
      } catch {
        if (active) setApiStatus({ phase: 'offline', ms: null });
      }
    };
    void ping();
    const timer = window.setInterval(ping, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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
        <p className="eyebrow">ReogNime / tidak tersedia</p>
        <h1>Ruang ini sedang sepi.</h1>
        <p>{home.error}</p>
        <div className="empty-actions">
          <button className="button button-primary" onClick={home.reload}>Coba lagi</button>
          <Link to="/developers" className="button button-quiet">Status API</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-page home-watch-page">
      <LandingAtmosphere />
      <header className="container watch-masthead home-watch-masthead">
        <div className="watch-masthead-bar">
          <p className="eyebrow"><span className="watch-live-dot" /> Streaming · Subtitle Indonesia</p>
          <div className="watch-masthead-actions">
            <span
              className={`server-status is-${apiStatus.phase}`}
              title={apiStatus.phase === 'offline' ? 'API server tidak terjangkau' : 'Latensi API server'}
              aria-label={apiStatus.phase === 'online' ? `API online, ${apiStatus.ms} milidetik` : apiStatus.phase === 'offline' ? 'API offline' : 'Memeriksa API'}
              aria-live="polite"
            >
              <i aria-hidden="true" />
              <span className="server-status-label">API</span>
              <b>{apiStatus.phase === 'online' ? `${apiStatus.ms} ms` : apiStatus.phase === 'offline' ? 'offline' : '…'}</b>
            </span>
            <Link to="/schedule" className="text-link">Jadwal tayang <ArrowRight size={14} /></Link>
          </div>
        </div>
        <div className="home-watch-title-row">
          <div>
            <h1>Nonton anime,<br /><em>tenang.</em></h1>
            <p>
              Jadwal mingguan, tanpa kebisingan. Temukan yang sedang tayang,
              yang sudah tamat, atau yang sempat terlewat.
            </p>
          </div>
          <form className="watch-search home-search" onSubmit={search}>
            <Search size={19} strokeWidth={1.6} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari judul anime…"
              aria-label="Cari anime"
              type="search"
            />
            <button type="submit" className="watch-search-submit">Cari</button>
          </form>
        </div>
        <div className="home-quick-links">
          <Link to="/ongoing"><span>01</span> Tayang <small>{ongoing.length}</small></Link>
          <Link to="/completed"><span>02</span> Tamat <small>{completed.length}</small></Link>
          <Link to="/genres"><span>03</span> Genre</Link>
          <Link to="/all"><span>04</span> Semua anime A–Z</Link>
          <Link to="/schedule"><span>05</span> Minggu ini</Link>
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
          <div className="screening-ambient" aria-hidden="true">
            {features.map((item, index) => {
              const image = item.banner || item.poster;
              return image ? (
                <img
                  key={item.slug}
                  src={image}
                  alt=""
                  className={`screening-ambient-image ${index === active ? 'is-active' : ''}`}
                  referrerPolicy="no-referrer"
                />
              ) : null;
            })}
            <div className="screening-ambient-shade" />
          </div>
          <div className="screening-visual">
            <div className="screening-visual-veil" />
            <div className="screening-poster-frame" key={feature.slug}>
              <OtakuPoster title={feature.title} poster={feature.poster} className="screening-poster" eager />
            </div>
            <span className="screening-poster-caption">SUB INDO</span>
            <span className="screening-live"><span className="marquee-dot" /> Tayang</span>
          </div>
          <div className="screening-copy" key={feature.slug}>
            <p className="eyebrow"><span className="accent-dot" /> Sedang tayang</p>
            <h2>{feature.title}</h2>
            <div className="screening-meta">
              <span>{otakuStatusLabel(feature.status)}</span>
              {feature.episodes !== null && <span>Episode {feature.episodes}</span>}
              {feature.releaseDay && <span>{feature.releaseDay}</span>}
              {feature.latestReleaseDate && <span>Diperbarui {feature.latestReleaseDate}</span>}
            </div>
            <p className="screening-lede">
              Baru dari rak mingguan. Subtitle Indonesia, daftar episode lengkap,
              dan semua mirror dalam satu tempat.
            </p>
            <div className="screening-actions">
              <Link to={`/watch/anime/${feature.slug}`} className="button button-paper">
                <Play size={15} fill="currentColor" /> Lihat seri
              </Link>
              <Link to="/schedule" className="button button-ghost-light">
                <CalendarDays size={15} /> Jadwal rilis
              </Link>
            </div>
          </div>
          <div className="screening-aside home-feature-aside">
            {features.length > 1 ? (
              <div className="home-feature-pager" aria-label="Anime tayang pilihan">
                {features.map((item, index) => (
                  <button
                    key={item.slug}
                    className={index === active ? 'is-active' : ''}
                    onClick={() => setActive(index)}
                    aria-label={`Sorotan ${item.title}`}
                    aria-current={index === active}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span className="home-feature-line"><span /></span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="screening-aside-label">Tayangan 01</span>
            )}
            <div className="screening-aside-index">{String(active + 1).padStart(2, '0')}</div>
            <span className="screening-aside-rule" />
            <span className="screening-aside-note">Subtitle Indonesia.<br />Setiap minggu.</span>
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
              index="01 — Tayang"
              title={<>Sedang <em>tayang.</em></>}
              description={`${ongoing.length} seri dengan subtitle Indonesia baru, langsung dari feed mingguan.`}
              to="/ongoing"
              action="Semua tayang"
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
              index="02 — Tamat"
              title={<>Tamat, <em>sekali duduk.</em></>}
              description={`${completed.length} seri yang baru tamat untuk malam ketika kamu butuh akhir cerita.`}
              to="/completed"
              action="Semua tamat"
            />
            <div className="watch-grid">
              {completed.map((anime) => <OtakuCard key={anime.slug} anime={anime} />)}
            </div>
          </Reveal>
        )}

        <Reveal className="home-browse" delay={30}>
          <div className="home-browse-head">
            <p className="section-index">03 — Jelajahi</p>
            <h2>Sisi lain <em>ruang ini.</em></h2>
            <p>Setiap sudut katalog punya tempatnya. Mulai dari sini.</p>
          </div>
          <div className="home-browse-grid">
            <Link to="/all" className="home-browse-card">
              <span className="home-browse-index">01</span>
              <ListFilter size={22} />
              <div>
                <h3>Semua anime, A–Z</h3>
                <p>Katalog lengkap, diurutkan berdasarkan judul.</p>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link to="/genres" className="home-browse-card">
              <span className="home-browse-index">02</span>
              <Compass size={22} />
              <div>
                <h3>Jelajahi semua genre</h3>
                <p>Dari aksi sampai vampir, semua rak tersedia.</p>
              </div>
              <ArrowRight size={17} />
            </Link>
            <Link to="/schedule" className="home-browse-card">
              <span className="home-browse-index">03</span>
              <CalendarDays size={22} />
              <div>
                <h3>Jadwal minggu ini</h3>
                <p>Tujuh hari rilisan, sesuai daftar provider.</p>
              </div>
              <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>

        <Reveal className="home-archive-cta" delay={20}>
          <div>
            <p className="section-index">Arsip ReogNime</p>
            <h3>Masih ada rak yang tenang.</h3>
            <p>Indeks editorial dan daftar pribadi ada sedikit lebih dalam.</p>
          </div>
          <div className="home-archive-actions">
            <Link to="/archive" className="text-link">Masuk arsip <ChevronRight size={14} /></Link>
            <Link to="/library" className="text-link">Daftar saya <Sparkles size={13} /></Link>
          </div>
        </Reveal>

        <p className="watch-attribution">
          ReogNime tidak menghosting atau mengunggah file video.
        </p>
      </div>
    </div>
  );
}
