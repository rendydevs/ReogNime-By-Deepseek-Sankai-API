import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { OtakuPoster } from '../components/OtakuPoster';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';
import { SITE_URL, usePageSeo } from '../lib/seo';

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];

function todayName() {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date());
}

export function WatchSchedulePage() {
  useDocumentTitle('Jadwal Rilis Anime Sub Indo');
  usePageSeo({
    title: 'Jadwal Rilis Anime Sub Indo — ReogNime',
    description: 'Jadwal rilis anime mingguan subtitle Indonesia di ReogNime. Lihat anime yang tayang setiap hari, lengkap dengan jam dan daftar judul.',
    image: '/og-reognime.jpg',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Jadwal Rilis Anime Sub Indo',
      description: 'Jadwal anime tayang mingguan subtitle Indonesia.',
      url: `${SITE_URL}/schedule`,
    },
  });
  const schedule = useApi((signal) => api.otaku.schedule(signal), []);
  const today = todayName();

  const ordered = useMemo(() => {
    const days = schedule.data?.data ?? [];
    return [...days].sort((a, b) => {
      const aIndex = DAY_ORDER.indexOf(a.day);
      const bIndex = DAY_ORDER.indexOf(b.day);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [schedule.data]);

  const totalTitles = ordered.reduce((total, day) => total + day.animeList.length, 0);
  const jumpDays = ordered.filter((day) => day.day !== 'Random');

  const jumpToDay = (index: number) => {
    document.getElementById(`schedule-day-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="watch-page schedule-page">
      <header className="container watch-sub-masthead">
        <Link to="/" className="back-link-dark"><ArrowLeft size={15} /> Beranda</Link>
        <div className="schedule-title-row">
          <div>
            <p className="eyebrow"><CalendarDays size={13} /> Jadwal tayang</p>
            <h1>Jadwal <span className="schedule-title-rest"><em>minggu ini.</em></span></h1>
          </div>
          <p>
            Jadwal rilis dari provider. {totalTitles ? `${totalTitles} judul` : 'Seminggu penuh'} di seluruh rak.
          </p>
        </div>
      </header>

      <div className="container schedule-content">
        {schedule.loading ? (
          <div className="schedule-grid">
            {Array.from({ length: 7 }, (_, index) => (
              <div className="schedule-day" key={index}>
                <div className="skeleton skeleton-line skeleton-line-short" />
                <div className="skeleton skeleton-schedule-row" />
                <div className="skeleton skeleton-schedule-row" />
                <div className="skeleton skeleton-schedule-row" />
              </div>
            ))}
          </div>
        ) : schedule.error ? (
          <div className="inline-error watch-error">
            <p>{schedule.error}</p>
            <button className="button button-primary" onClick={schedule.reload}>Coba lagi</button>
          </div>
        ) : (
          <>
            {jumpDays.length > 0 && (
              <nav className="schedule-jump" aria-label="Lompat ke hari">
                {jumpDays.map((day) => {
                  const index = ordered.indexOf(day);
                  return (
                    <button
                      type="button"
                      key={day.day}
                      className={`schedule-jump-day ${day.day === today ? 'is-today' : ''}`}
                      onClick={() => jumpToDay(index)}
                    >
                      <span>{day.day}</span>
                      <small>{day.animeList.length}</small>
                    </button>
                  );
                })}
              </nav>
            )}
            <div className="schedule-grid">
              {ordered.map((day) => {
                const isToday = day.day === today;
                return (
                  <section id={`schedule-day-${ordered.indexOf(day)}`} className={`schedule-day ${isToday ? 'is-today' : ''}`} key={day.day}>
                    <header className="schedule-day-head">
                      <div>
                        <h2>{day.day === 'Random' ? 'Acak' : day.day}</h2>
                        <span>{day.animeList.length} judul</span>
                      </div>
                      {isToday && <span className="today-badge">Hari ini</span>}
                    </header>
                    <div className="schedule-list">
                      {day.animeList.map((anime) => (
                        <Link to={`/watch/anime/${anime.slug}`} className="schedule-anime" key={anime.slug}>
                          <OtakuPoster title={anime.title} poster={anime.poster} className="schedule-thumb" />
                          <span>{anime.title}</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="watch-attribution">
              Jadwal mengikuti provider dan bisa berubah tanpa pemberitahuan.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
