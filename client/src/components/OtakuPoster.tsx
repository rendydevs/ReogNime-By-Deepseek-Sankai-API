import { useEffect, useState, type CSSProperties } from 'react';

interface OtakuPosterProps {
  title: string;
  poster: string | null;
  className?: string;
  eager?: boolean;
}

const FALLBACK_PALETTES = [
  ['#1c2a23', '#d1d8c0', '#e57749'],
  ['#211d2b', '#d8d1e4', '#dd4a2b'],
  ['#2b241c', '#e6dac4', '#c98d4d'],
  ['#1b252b', '#c6d8df', '#e8a049'],
  ['#2b1e1d', '#e5cec5', '#d34f38'],
];

function hashTitle(title: string) {
  let hash = 0;
  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) % 997;
  }
  return hash;
}

export function OtakuPoster({ title, poster, className = '', eager = false }: OtakuPosterProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [poster]);

  const hash = hashTitle(title);
  const palette = FALLBACK_PALETTES[hash % FALLBACK_PALETTES.length];
  const style = {
    '--fallback-bg': palette[0],
    '--fallback-ink': palette[1],
    '--fallback-accent': palette[2],
  } as CSSProperties;

  return (
    <div className={`otaku-poster ${className}`} style={style}>
      {poster && !failed ? (
        <img
          src={poster}
          alt={`Poster ${title}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="otaku-poster-fallback" aria-label={`${title} — gambar tidak tersedia`}>
          <span className="fallback-ghost" aria-hidden="true">アニメ</span>
          <span className="fallback-rule" aria-hidden="true" />
          <span className="fallback-initial" aria-hidden="true">{title.slice(0, 1).toUpperCase()}</span>
          <span className="fallback-title">{title}</span>
          <span className="fallback-label">ReogNime / Sub Indo</span>
        </div>
      )}
    </div>
  );
}
