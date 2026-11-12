import { animeList, toSummary } from './catalog.js';

export const MOODS = [
  {
    key: 'tenang',
    label: 'Tenang',
    genres: ['Slice of Life', 'Drama'],
    description: 'Anime dengan tempo lambat dan cerita sehari-hari.',
  },
  {
    key: 'hangat',
    label: 'Hangat',
    genres: ['Romance', 'Comedy'],
    description: 'Romansa dan komedi ringan.',
  },
  {
    key: 'seru',
    label: 'Seru',
    genres: ['Action', 'Adventure', 'Sports'],
    description: 'Aksi, petualangan, dan olahraga.',
  },
  {
    key: 'gelap',
    label: 'Gelap',
    genres: ['Thriller', 'Psychological', 'Horror', 'Mystery'],
    description: 'Misteri, thriller, dan cerita psikologis.',
  },
];

const JAKARTA = 'Asia/Jakarta';
let moodCache = null;
let editionCache = { key: null, value: null };

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 1_000_003;
  }
  return result;
}

function jakartaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? '';
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = Number(value('hour')) || 0;
  const dateIso = `${year}-${month}-${day}`;
  const label = new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return { dateIso, label, weekday: value('weekday'), hour };
}

function greeting(hour) {
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function moodScore(anime, mood) {
  const shared = anime.genres.filter((genre) => mood.genres.includes(genre)).length;
  return shared * 100 + (anime.score ?? 0) * 2 + anime.popularity / 10_000;
}

function moodPool(mood) {
  return animeList
    .filter((anime) => anime.genres.some((genre) => mood.genres.includes(genre)))
    .sort((a, b) => moodScore(b, mood) - moodScore(a, mood));
}

function moodSummary(mood) {
  const pool = moodPool(mood);
  return {
    key: mood.key,
    label: mood.label,
    genres: mood.genres,
    description: mood.description,
    count: pool.length,
  };
}

export function getMoods() {
  if (moodCache) return moodCache;
  moodCache = MOODS.map((mood) => {
    const pool = moodPool(mood);
    return {
      ...moodSummary(mood),
      anime: pool.slice(0, 6).map(toSummary),
    };
  });
  return moodCache;
}

export function getEdition(date = new Date()) {
  const parts = jakartaParts(date);
  const cacheKey = `${parts.dateIso}-${parts.hour}`;
  if (editionCache.key === cacheKey) return editionCache.value;

  const mood = MOODS[hash(parts.dateIso) % MOODS.length];
  const pool = moodPool(mood);
  const pick = pool[hash(`${parts.dateIso}-${mood.key}`) % Math.max(pool.length, 1)] ?? null;
  const top = [...animeList]
    .filter((anime) => anime.score !== null)
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .slice(0, 4)
    .map(toSummary);

  const value = {
    date: parts.dateIso,
    dateLabel: parts.label,
    weekday: parts.weekday,
    greeting: greeting(parts.hour),
    mood: moodSummary(mood),
    pick: pick
      ? {
          ...toSummary(pick),
          synopsis: pick.synopsis.slice(0, 600),
          reason: `Pilihan dari arsip untuk suasana ${mood.label.toLowerCase()}.`,
        }
      : null,
    top,
    stats: {
      archive: animeList.length,
      moods: MOODS.length,
      genres: new Set(animeList.flatMap((anime) => anime.genres)).size,
    },
  };
  editionCache = { key: cacheKey, value };
  return value;
}
