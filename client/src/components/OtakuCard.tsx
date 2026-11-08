import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OtakuCard as OtakuCardType } from '../types';
import { otakuStatusLabel, seasonName } from '../lib/format';
import { OtakuPoster } from './OtakuPoster';

interface Props {
  anime: OtakuCardType;
  eager?: boolean;
}

export function OtakuCard({ anime, eager = false }: Props) {
  const episodeMeta = anime.status === 'Ongoing'
    ? anime.episodes ? `Ep. ${anime.episodes}` : anime.releaseDay
    : anime.episodes ? `${anime.episodes} ep` : anime.type;

  return (
    <article className="otaku-card">
      <Link to={`/watch/anime/${anime.slug}`} className="otaku-card-link" aria-label={`Lihat ${anime.title}`}>
        <div className="otaku-card-poster">
          <OtakuPoster title={anime.title} poster={anime.poster} eager={eager} />
          {anime.score !== null && <span className="otaku-score">★ {anime.score.toFixed(2)}</span>}
          <span className="otaku-state">{otakuStatusLabel(anime.status)}</span>
          <span className="otaku-hover-cue"><Play size={13} fill="currentColor" /> Lihat seri</span>
        </div>
        <div className="otaku-card-copy">
          <p className="otaku-kicker">
            {anime.type ?? 'Sub Indo'}
            {anime.season ? <span> · {seasonName(anime.season)}</span> : null}
            {anime.releaseDay && anime.status === 'Ongoing' ? <span> · {anime.releaseDay}</span> : null}
          </p>
          <h3>{anime.title}</h3>
          <div className="otaku-card-meta">
            <span>{episodeMeta ?? 'Subtitle Indonesia'}</span>
            {anime.latestReleaseDate && <span>{anime.latestReleaseDate}</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
