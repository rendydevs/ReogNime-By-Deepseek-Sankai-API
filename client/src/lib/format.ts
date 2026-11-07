import type { AnimeFormat, AnimeStatus, LibraryStatus, Season } from '../types';

export const STATUS_LABELS: Record<LibraryStatus, string> = {
  WATCHING: 'Watching',
  PLANNING: 'Plan to watch',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
  DROPPED: 'Dropped',
};

export const STATUS_ORDER: LibraryStatus[] = ['WATCHING', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'DROPPED'];

export const FORMAT_LABELS: Record<AnimeFormat, string> = {
  TV: 'TV series',
  MOVIE: 'Film',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Special',
  MUSIC: 'Music',
};

export const AIRING_LABELS: Record<AnimeStatus, string> = {
  FINISHED: 'Finished',
  RELEASING: 'Airing',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'On hiatus',
};

export const SEASON_LABELS: Record<Season, string> = {
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer',
  FALL: 'Fall',
};

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—';
  return (score / 10).toFixed(1);
}

export function formatYear(year: number | null | undefined): string {
  return year ? String(year) : 'TBA';
}

export function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(date);
}

export function formatMinutes(minutes: number): string {
  if (!minutes) return '0m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

export function truncate(value: string, length = 170): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function plural(value: number, singular: string, pluralForm = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralForm}`;
}

export function episodeLabel(total: number | null): string {
  if (total === null) return 'Episodes TBA';
  return total === 1 ? '1 episode' : `${total} episodes`;
}

export function scoreTone(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'muted';
  if (score >= 88) return 'high';
  if (score >= 80) return 'mid';
  return 'low';
}
