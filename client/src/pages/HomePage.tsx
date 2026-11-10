import { ArrowRight, CalendarDays, ChevronRight, Compass, ListFilter, Play, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OtakuCard } from '../components/OtakuCard';
import { LandingAtmosphere } from '../components/LandingAtmosphere';
import { OtakuPoster } from '../components/OtakuPoster';
import { Reveal } from '../components/Reveal';
import { TitleMarquee } from '../components/TitleMarquee';
import { API_HEALTH_URL, api } from '../lib/api';
import { formatRelativeTime, otakuStatusLabel } from '../lib/format';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { usePageSeo } from '../lib/seo';
import { useWatchHistory } from '../lib/watchHistory';


const HOME_FAQ = [
  {
    question: 'Apa itu ReogNime?',
    answer: 'ReogNime adalah katalog anime subtitle Indonesia dengan daftar tayang, anime tamat, jadwal rilis, genre, pencarian judul, dan pemutar episode dari penyedia pihak ketiga.',
  },
  {
    question: 'Apakah perlu akun untuk menyimpan daftar tontonan?',
    answer: 'Tidak perlu akun. Daftar tontonan tersimpan di profil lokal ReogNime dan bisa diekspor sebagai JSON. Pada deployment Vercel, profil lokal dapat direset saat instance restart.',
  },
  {
    question: 'Dari mana data anime di ReogNime berasal?',
    answer: 'Data streaming berasal dari Otakudesu API. ReogNime tidak menghosting atau mengunggah file video; pemutar diambil dari server video pihak ketiga.',
  },
  {
    question: 'Bagaimana cara menonton anime di ReogNime?',
    answer: 'Pilih judul dari beranda, halaman tayang, atau pencarian. Buka halaman seri, pilih episode, lalu pilih salah satu mirror yang tersedia.',
  },
];

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
  const edition = useApi((signal) => api.edition(signal), []);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ phase: 'checking' | 'online' | 'offline'; ms: number | null }>({ phase: 'checking', ms: null });
  const watchHistory = useWatchHistory();

  usePageSeo({
    title: 'Nonton Anime Sub Indo Tanpa Ribet — ReogNime',
    description: 'Nonton anime subtitle Indonesia di ReogNime: jadwal tayang, anime tamat, genre, dan pencarian judul. Streaming sub indo ringan tanpa ribet.',
    image: '/og-reognime.jpg',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  });

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
      <section
        className={`nocturne-stage ${paused ? 'is-paused' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
        }}
      >
        <div className="container nocturne-stage-inner">
          <div className="nocturne-topline">
            <p className="eyebrow"><span className="watch-live-dot" /> ReogNime / Ruang tayang</p>
            <div className="nocturne-top-actions">
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

          <div className="nocturne-main">
            <div className="nocturne-copy">
              <p className="nocturne-kicker"><span className="accent-dot" /> Streaming · Subtitle Indonesia</p>
              <h1>Nonton anime,<br /><em>tenang.</em></h1>
              <p className="nocturne-lede">
                Satu ruang untuk jadwal mingguan, anime tamat, dan cerita yang sempat terlewat.
                Tanpa riuh, tanpa lupa.
              </p>
              <form className="nocturne-search" onSubmit={search}>
                <Search size={19} strokeWidth={1.6} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari judul anime…"
                  aria-label="Cari anime"
                  type="search"
                />
                <button type="submit" className="nocturne-search-submit">Cari</button>
              </form>
              <nav className="nocturne-quick" aria-label="Jelajahi katalog">
                <Link to="/ongoing"><span>01</span> Tayang <small>{ongoing.length}</small></Link>
                <Link to="/completed"><span>02</span> Tamat <small>{completed.length}</small></Link>
                <Link to="/genres"><span>03</span> Genre</Link>
                <Link to="/all"><span>04</span> A–Z</Link>
                <Link to="/schedule"><span>05</span> Minggu ini</Link>
              </nav>
            </div>

            {feature ? (
              <aside className="nocturne-feature" aria-label="Sorotan tayang">
                <div className="nocturne-feature-head">
                  <span><span className="marquee-dot" /> Sedang tayang</span>
                  <span>{String(active + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}</span>
                </div>
                <div className="nocturne-feature-body">
                  <div className="nocturne-poster">
                    <OtakuPoster title={feature.title} poster={feature.poster} eager />
                    <span>SUB INDO</span>
                  </div>
                  <div className="nocturne-feature-copy">
                    <p className="nocturne-feature-kicker">Pilihan ruang tayang</p>
                    <h2>{feature.title}</h2>
                    <div className="nocturne-meta">
                      <span>{otakuStatusLabel(feature.status)}</span>
                      {feature.episodes !== null && <span>{feature.episodes} episode</span>}
                      {feature.releaseDay && <span>{feature.releaseDay}</span>}
                    </div>
                    <p>{feature.latestReleaseDate ? `Diperbarui ${feature.latestReleaseDate}.` : 'Subtitle Indonesia, daftar episode lengkap, dan semua mirror dalam satu tempat.'}</p>
                    <div className="nocturne-feature-actions">
                      <Link to={`/watch/anime/${feature.slug}`} className="button button-paper">
                        <Play size={15} fill="currentColor" /> Lihat seri
                      </Link>
                      <Link to="/schedule" className="nocturne-arrow-link" aria-label="Jadwal rilis">
                        <CalendarDays size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
                {features.length > 1 ? (
                  <div className="nocturne-pager" aria-label="Anime tayang pilihan">
                    {features.map((item, index) => (
                      <button
                        key={item.slug}
                        type="button"
                        className={index === active ? 'is-active' : ''}
                        onClick={() => setActive(index)}
                        aria-label={`Sorotan ${item.title}`}
                        aria-current={index === active}
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <span className="nocturne-pager-line"><span /></span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </aside>
            ) : null}
          </div>

          <div className="nocturne-stage-foot">
            {edition.data?.data ? (
              <Link to="/hari-ini" className="nocturne-edition">
                <span className="nocturne-edition-label">Edisi hari ini · {edition.data.data.weekday}</span>
                <span className="nocturne-edition-mood">{edition.data.data.mood.label}</span>
                <span className="nocturne-edition-pick">{edition.data.data.pick?.title ?? 'Pilihan harian'}</span>
                <ArrowRight size={14} />
              </Link>
            ) : <span />}
            <p className="nocturne-signature">ReogNime / 2026 <span>·</span> Sub Indo <span>·</span> Tanpa ribet</p>
          </div>
        </div>
      </section>

      {watchHistory.items.length > 0 ? (
        <div className="container home-continue-wrap">
          <Reveal className="home-continue" delay={15}>
            <div className="home-continue-head">
              <div>
                <p className="section-index">Lanjutkan</p>
                <h2>Terakhir ditonton</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (window.confirm('Hapus seluruh riwayat tontonan?')) watchHistory.clear();
                }}
              >
                Hapus riwayat
              </button>
            </div>
            <div className="home-continue-grid">
              {watchHistory.items.map((item) => (
                <article className="continue-card" key={item.episodeSlug}>
                  <Link to={`/watch/episode/${item.episodeSlug}`} className="continue-link">
                    <OtakuPoster title={item.animeTitle} poster={item.poster} className="continue-poster" />
                    <div className="continue-copy">
                      <span>{item.animeTitle}</span>
                      <strong>{item.episodeTitle}</strong>
                      <small>{formatRelativeTime(item.watchedAt)}</small>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="continue-remove"
                    onClick={() => watchHistory.remove(item.episodeSlug)}
                    aria-label={`Hapus ${item.episodeTitle} dari riwayat`}
                  >
                    <X size={13} />
                  </button>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
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

        <Reveal className="home-faq" delay={20}>
          <div className="home-faq-head">
            <p className="section-index">Pertanyaan</p>
            <h2>Sebelum mulai.</h2>
          </div>
          <div className="home-faq-list">
            {HOME_FAQ.map((item) => (
              <details key={item.question} className="home-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <p className="watch-attribution">
          ReogNime tidak menghosting atau mengunggah file video.
        </p>
      </div>
    </div>
  );
}
