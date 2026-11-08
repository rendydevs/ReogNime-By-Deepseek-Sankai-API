import { Check, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { useLibraryDialog } from './LibraryDialog';
import { FORMAT_LABELS, formatScore, formatYear } from '../lib/format';
import { mediaUrl } from '../lib/media';
import type { AnimeSummary } from '../types';

interface AnimeCardProps {
  anime: AnimeSummary;
  rank?: number;
  compact?: boolean;
}

export function AnimeCard({ anime, rank, compact = false }: AnimeCardProps) {
  const { getEntry } = useLibrary();
  const { open } = useLibraryDialog();
  const entry = getEntry(anime.id);

  return (
    <article className={`anime-card ${compact ? 'anime-card-compact' : ''}`}>
      {rank !== undefined && <span className="card-rank">{String(rank).padStart(2, '0')}</span>}
      <div className="poster-wrap" style={{ '--anime-accent': anime.accent } as CSSProperties}>
        <Link to={`/anime/${anime.id}`} className="poster-link" aria-label={`Lihat ${anime.title}`}>
          {anime.cover ? (
            <img src={mediaUrl(anime.cover)} alt={`Sampul ${anime.title}`} className="poster-image" loading="lazy" />
          ) : (
            <span className="poster-fallback">{anime.title.slice(0, 1)}</span>
          )}
          <span className="poster-wash" />
          <span className="poster-score">★ {formatScore(anime.score)}</span>
          <span className="poster-view">Lihat judul</span>
        </Link>
        <button
          className={`quick-add ${entry ? 'is-saved' : ''}`}
          onClick={() => open(anime)}
          aria-label={entry ? `Ubah ${anime.title} di daftar` : `Tambah ${anime.title} ke daftar`}
          title={entry ? 'Ubah di daftar' : 'Tambah ke daftar'}
        >
          {entry ? <Check size={14} /> : <Plus size={14} />}
        </button>
      </div>
      <div className="card-copy">
        <p className="card-kicker">
          {FORMAT_LABELS[anime.format]} <span>·</span> {formatYear(anime.seasonYear)}
        </p>
        <h3>
          <Link to={`/anime/${anime.id}`}>{anime.title}</Link>
        </h3>
        {!compact && <p className="card-native">{anime.nativeTitle}</p>}
      </div>
    </article>
  );
}
