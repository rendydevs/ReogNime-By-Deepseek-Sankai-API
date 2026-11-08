import type { AnimeFormat, AnimeStatus, LibraryStatus, Season } from '../types';

export const STATUS_LABELS: Record<LibraryStatus, string> = {
  WATCHING: 'Menonton',
  PLANNING: 'Rencana',
  COMPLETED: 'Selesai',
  ON_HOLD: 'Ditunda',
  DROPPED: 'Berhenti',
};

export const STATUS_ORDER: LibraryStatus[] = ['WATCHING', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'DROPPED'];

export const FORMAT_LABELS: Record<AnimeFormat, string> = {
  TV: 'Seri TV',
  MOVIE: 'Film',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Spesial',
  MUSIC: 'Musik',
};

export const AIRING_LABELS: Record<AnimeStatus, string> = {
  FINISHED: 'Selesai',
  RELEASING: 'Tayang',
  NOT_YET_RELEASED: 'Segera',
  CANCELLED: 'Dibatalkan',
  HIATUS: 'Hiatus',
};

export const SEASON_LABELS: Record<Season, string> = {
  WINTER: 'Dingin',
  SPRING: 'Semi',
  SUMMER: 'Panas',
  FALL: 'Gugur',
};

const GENRE_LABELS: Record<string, string> = {
  Action: 'Aksi',
  Adventure: 'Petualangan',
  Comedy: 'Komedi',
  Demons: 'Iblis',
  Drama: 'Drama',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasi',
  Game: 'Gim',
  Harem: 'Harem',
  Historical: 'Sejarah',
  Horror: 'Horor',
  Isekai: 'Isekai',
  Josei: 'Josei',
  Magic: 'Sihir',
  'Martial Arts': 'Bela Diri',
  Mecha: 'Mecha',
  Military: 'Militer',
  Music: 'Musik',
  Mystery: 'Misteri',
  Psychological: 'Psikologis',
  Romance: 'Romansa',
  School: 'Sekolah',
  'Sci-Fi': 'Sci-Fi',
  Seinen: 'Seinen',
  Shoujo: 'Shoujo',
  Shounen: 'Shounen',
  'Slice of Life': 'Keseharian',
  Space: 'Angkasa',
  Sports: 'Olahraga',
  'Super Power': 'Kekuatan Super',
  Supernatural: 'Supranatural',
  Thriller: 'Thriller',
  Vampire: 'Vampir',
  'Award Winning': 'Pemenang Penghargaan',
  'Boys Love': 'Boys Love',
  'Girls Love': 'Girls Love',
  Gourmet: 'Kuliner',
  'Avant Garde': 'Avant Garde',
  Mythology: 'Mitologi',
  Parody: 'Parodi',
  Samurai: 'Samurai',
  'Time Travel': 'Perjalanan Waktu',
};

export function genreLabel(name: string): string {
  const direct = GENRE_LABELS[name];
  if (direct) return direct;
  const key = Object.keys(GENRE_LABELS).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? GENRE_LABELS[key] : name;
}

export function seasonName(value: string | null | undefined): string {
  if (!value) return '—';
  const [first, ...rest] = value.trim().split(/\s+/);
  const translated = { WINTER: 'Dingin', SPRING: 'Semi', SUMMER: 'Panas', FALL: 'Gugur' }[first.toUpperCase()];
  return translated ? [translated, ...rest].join(' ') : value;
}

export function otakuStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Tayang';
  if (/ongoing|airing|releasing/i.test(status)) return 'Tayang';
  if (/completed|finished/i.test(status)) return 'Tamat';
  return status;
}


const MONTHS_ID: Record<string, string> = {
  Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', May: 'Mei', Jun: 'Jun',
  Jul: 'Jul', Aug: 'Agu', Sep: 'Sep', Oct: 'Okt', Nov: 'Nov', Dec: 'Des',
};

export function formatProviderDate(value: string | null | undefined): string {
  if (!value) return '—';
  const short = value.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/);
  if (short) return `${short[2]} ${MONTHS_ID[short[1]] ?? short[1]} ${short[3]}`;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
  return value;
}



export function formatRelativeTime(value: string | null | undefined, now = Date.now()): string {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '—';
  const diff = Math.max(0, now - time);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDate(value, { month: 'short', day: 'numeric' });
}

export function formatReleaseTime(value: string | null | undefined): string {
  if (!value) return 'Subtitle Indonesia';
  const match = value.match(/^Release on\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match) {
    let hour = Number(match[1]);
    const suffix = match[3].toLowerCase();
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    return `Rilis pukul ${String(hour).padStart(2, '0')}.${match[2]}`;
  }
  return value.replace(/^Release on\s+/i, 'Rilis pukul ');
}

export function formatDurationLabel(value: string | null | undefined): string {
  return value ? value.replace(/\bmin\b/i, 'mnt').replace(/\bminutes?\b/i, 'menit') : '—';
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—';
  return (score / 10).toFixed(1);
}

export function formatYear(year: number | null | undefined): string {
  return year ? String(year) : '—';
}

export function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'UTC' }).format(date);
}

export function formatMinutes(minutes: number): string {
  if (!minutes) return '0 mnt';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} mnt`;
  return rest ? `${hours} jam ${rest} mnt` : `${hours} jam`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('id-ID', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

export function truncate(value: string, length = 170): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function plural(value: number, singular: string, pluralForm = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralForm}`;
}

export function episodeLabel(total: number | null): string {
  if (total === null) return 'Episode —';
  return `${total} episode`;
}

export function scoreTone(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'muted';
  if (score >= 88) return 'high';
  if (score >= 80) return 'mid';
  return 'low';
}
