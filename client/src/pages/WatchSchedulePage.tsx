import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { OtakuPoster } from '../components/OtakuPoster';
import { api } from '../lib/api';
import { useApi, useDocumentTitle } from '../lib/hooks';

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];

function todayName() {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date());
}

export function WatchSchedulePage() {
  useDocumentTitle('Jadwal Rilis Anime Sub Indo');
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

  return (
    <div className="watch-page schedule-page">
      <header className="container watch-sub-masthead">
        <Link to="/" className="back-link-dark"><ArrowLeft size={15} /> The screening room</Link>
        <div className="schedule-title-row">
          <div>
            <p className="eyebrow"><CalendarDays size={13} /> ReogNime / weekly</p>
            <h1>What airs<br /><em>this week.</em></h1>
          </div>
          <p>
            The whole weekly rhythm, exactly as the provider lists it. {totalTitles ? `${totalTitles} titles` : 'A full week'} across the shelf.
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
            <button className="button button-primary" onClick={schedule.reload}>Try again</button>
          </div>
        ) : (
          <>
            <div className="schedule-grid">
              {ordered.map((day) => {
                const isToday = day.day === today;
                return (
                  <section className={`schedule-day ${isToday ? 'is-today' : ''}`} key={day.day}>
                    <header className="schedule-day-head">
                      <div>
                        <h2>{day.day}</h2>
                        <span>{day.animeList.length} titles</span>
                      </div>
                      {isToday && <span className="today-badge">Today</span>}
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
              Release days follow the source provider and can shift without notice.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
