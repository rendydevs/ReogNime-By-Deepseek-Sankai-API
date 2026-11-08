import { Link } from 'react-router-dom';
import type { OtakuCard } from '../types';

export function TitleMarquee({ items }: { items: OtakuCard[] }) {
  if (!items.length) return null;
  const repeated = [...items, ...items];

  return (
    <div className="title-marquee" aria-label="Sedang tayang">
      <span className="marquee-label"><span className="marquee-dot" /> Tayang</span>
      <div className="marquee-viewport">
        <div className="marquee-track">
          {repeated.map((anime, index) => (
            <Link
              to={`/watch/anime/${anime.slug}`}
              className="marquee-item"
              key={`${anime.slug}-${index}`}
              tabIndex={index >= items.length ? -1 : 0}
              aria-hidden={index >= items.length}
            >
              <span>{anime.title}</span>
              <span className="marquee-separator">✦</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
