import { writeFile } from 'node:fs/promises';

const SITE = 'https://www.reognime.site';
const API = 'https://www.sankavollerei.web.id/anime';
const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; ReogNimeSitemap/1.0)' };
const today = new Date().toISOString().slice(0, 10);

const staticPages = [
  ['/', '1.0', 'daily'],
  ['/ongoing', '0.9', 'daily'],
  ['/completed', '0.8', 'weekly'],
  ['/schedule', '0.8', 'weekly'],
  ['/genres', '0.7', 'weekly'],
  ['/all', '0.7', 'weekly'],
  ['/search', '0.5', 'monthly'],
  ['/archive', '0.6', 'monthly'],
  ['/discover', '0.6', 'monthly'],
];

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);
const urlTag = (path, priority = '0.6', changefreq = 'weekly') =>
  `  <url><loc>${escapeXml(SITE + path)}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

async function json(path) {
  const response = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

const [unlimited, genres] = await Promise.all([json('/unlimited'), json('/genre')]);
const entries = new Set(staticPages.map(([path]) => path));

for (const group of unlimited.data?.list ?? []) {
  for (const anime of group.animeList ?? []) {
    if (anime.animeId) entries.add(`/watch/anime/${encodeURIComponent(anime.animeId)}`);
  }
}
for (const genre of genres.data?.genreList ?? []) {
  if (genre.genreId) entries.add(`/genre/${encodeURIComponent(genre.genreId)}`);
}

const urls = [...entries].map((path) => {
  const known = staticPages.find(([value]) => value === path);
  return urlTag(path, known?.[1] ?? '0.6', known?.[2] ?? 'weekly');
});
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml, 'utf8');
console.log(`Wrote public/sitemap.xml with ${entries.size} URLs`);
