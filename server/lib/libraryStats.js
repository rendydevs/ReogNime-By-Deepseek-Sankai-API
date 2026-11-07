import { LIBRARY_STATUSES } from './library.js';

export function getLibraryStats(entries, catalog) {
  const counts = Object.fromEntries(LIBRARY_STATUSES.map((status) => [status, 0]));
  const genreCounts = new Map();
  let episodesWatched = 0;
  let minutesWatched = 0;
  let scoreTotal = 0;
  let scoredTitles = 0;
  let favorites = 0;

  for (const entry of entries) {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
    const anime = catalog.getAnime(entry.animeId);
    if (!anime) continue;
    episodesWatched += entry.progress ?? 0;
    minutesWatched += (entry.progress ?? 0) * (anime.duration ?? 24);
    if (entry.favorite) favorites += 1;
    if (typeof entry.score === 'number') {
      scoreTotal += entry.score;
      scoredTitles += 1;
    }
    for (const genre of anime.genres) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  }

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const completed = counts.COMPLETED ?? 0;
  return {
    total: entries.length,
    statusCounts: counts,
    episodesWatched,
    minutesWatched,
    hoursWatched: Math.round((minutesWatched / 60) * 10) / 10,
    daysWatched: Math.round((minutesWatched / 1440) * 10) / 10,
    meanScore: scoredTitles ? Math.round((scoreTotal / scoredTitles) * 10) / 10 : null,
    scoredTitles,
    favorites,
    completionRate: entries.length ? Math.round((completed / entries.length) * 100) : 0,
    topGenres,
  };
}
