import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanTitle, OtakudesuService } from './lib/otakudesu.js';

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://otakudesu.or.at/series/sousou-no-frieren-2nd-season/</loc>
    <image:image><image:loc>https://i0.wp.com/otakudesu.or.at/wp-content/uploads/2026/01/1768547862-1915-154528.jpg</image:loc></image:image>
  </url>
  <url>
    <loc>https://otakudesu.or.at/series/super-no-ura-de-yani-suu-futari/</loc>
    <image:image><image:loc>https://i1.wp.com/otakudesu.or.at/wp-content/uploads/2026/07/1783224842-6017-156339.jpg</image:loc></image:image>
  </url>
</urlset>`;

const HOME = {
  status: 'success',
  creator: 'Sanka Vollerei',
  ok: true,
  data: {
    ongoing: {
      animeList: [
        {
          title: 'Sousou no Frieren Season 2 Subtitle Indonesia',
          poster: 'https://otakudesu.blog/wp-content/uploads/2026/01/154528.jpg',
          episodes: 10,
          releaseDay: 'Jumat',
          latestReleaseDate: '07 Nov',
          animeId: 'sousou-frieren-s2-sub-indo',
          otakudesuUrl: 'https://otakudesu.blog/anime/sousou-frieren-s2-sub-indo/',
        },
      ],
    },
    completed: {
      animeList: [
        {
          title: 'Super no Ura de Yani Suu Futari Subtitle Indonesia',
          poster: 'https://otakudesu.blog/wp-content/uploads/2026/07/1783224842-6017-156339.jpg',
          episodes: 12,
          score: '8.20',
          animeId: 'super-yani-suu-futari-sub-indo',
        },
      ],
    },
  },
};

test('cleanTitle removes Indonesian subtitle marketing and episode ranges', () => {
  assert.equal(cleanTitle('Sousou no Frieren Season 2 Subtitle Indonesia'), 'Sousou no Frieren Season 2');
  assert.equal(cleanTitle('Sousou no Frieren (Episode 1 – 28) Subtitle Indonesia'), 'Sousou no Frieren');
  assert.equal(cleanTitle('One Piece Sub Indo'), 'One Piece');
});

test('Otakudesu normalizes upstream cards, resolves covers, and caches responses', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('sitemap')) {
      return new Response(SITEMAP, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
    if (String(url).endsWith('/home')) {
      return new Response(JSON.stringify(HOME), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ status: 'error', message: 'not found' }), { status: 404 });
  };

  const service = new OtakudesuService({
    apiBase: 'https://example.test/anime',
    sitemapUrl: 'https://example.test/series-sitemap.xml',
    fetchImpl,
  });

  const home = await service.getHome();
  assert.equal(home.ongoing.length, 1);
  assert.equal(home.ongoing[0].title, 'Sousou no Frieren Season 2');
  assert.equal(home.ongoing[0].status, 'Ongoing');
  assert.equal(home.ongoing[0].slug, 'sousou-frieren-s2-sub-indo');
  assert.match(home.ongoing[0].poster, /i0\.wp\.com/);
  assert.match(home.ongoing[0].sourceUrl, /sousou-no-frieren-2nd-season/);
  assert.equal(home.completed[0].score, 8.2);
  assert.equal(home.completed[0].episodes, 12);
  assert.equal(home.completed[0].poster, 'https://i1.wp.com/otakudesu.or.at/wp-content/uploads/2026/07/1783224842-6017-156339.jpg');
  assert.equal(home.featured.slug, 'sousou-frieren-s2-sub-indo');

  await service.getHome();
  assert.equal(calls.filter((url) => url.endsWith('/home')).length, 1, 'home response should come from cache');
  assert.equal(calls.filter((url) => url.includes('sitemap')).length, 1, 'sitemap should be cached');
});

test('Otakudesu episode normalization filters unsafe links and exposes mirrors', async () => {
  const episodePayload = {
    status: 'success',
    data: {
      title: 'Sousou no Frieren Episode 1 Subtitle Indonesia',
      animeId: 'sousou-frieren-sub-indo',
      releaseTime: 'Release on 7:33 am',
      defaultStreamingUrl: 'javascript:alert(1)',
      prevEpisode: null,
      nextEpisode: { title: 'Next', episodeId: 'snf-episode-2-sub-indo' },
      server: {
        qualities: [
          { title: '360p', serverList: [] },
          { title: '720p', serverList: [{ title: ' filedon ', serverId: 'mirror-1' }] },
        ],
      },
      downloadUrl: {
        qualities: [
          {
            title: '720p',
            size: '157.5 MB',
            urls: [
              { title: 'Safe', url: 'https://example.com/download' },
              { title: 'Unsafe', url: 'javascript:alert(1)' },
            ],
          },
        ],
      },
      info: {
        credit: 'Doronime',
        encoder: 'Desu',
        duration: '24 Menit',
        type: 'TV',
        genreList: [{ title: 'Fantasy', genreId: 'fantasy' }],
        episodeList: [{ title: 'Episode 1', eps: 1, episodeId: 'snf-episode-1-sub-indo', date: '' }],
      },
    },
  };
  const fetchImpl = async () =>
    new Response(JSON.stringify(episodePayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const service = new OtakudesuService({
    apiBase: 'https://example.test/anime',
    sitemapUrl: 'https://example.test/sitemap.xml',
    fetchImpl,
  });

  const episode = await service.getEpisode('snf-episode-1-sub-indo');
  assert.equal(episode.title, 'Sousou no Frieren Episode 1');
  assert.equal(episode.defaultStreamingUrl, null);
  assert.deepEqual(episode.servers[1].servers[0], { name: 'filedon', id: 'mirror-1' });
  assert.equal(episode.downloads[0].qualities[0].urls.length, 1);
  assert.equal(episode.next.slug, 'snf-episode-2-sub-indo');
  assert.equal(episode.info.genres[0].slug, 'fantasy');
});

test('Otakudesu rejects invalid identifiers before calling upstream', async () => {
  let called = false;
  const service = new OtakudesuService({
    apiBase: 'https://example.test/anime',
    sitemapUrl: 'https://example.test/sitemap.xml',
    fetchImpl: async () => { called = true; return new Response('{}'); },
  });

  await assert.rejects(() => service.getAnime('../secret'), /valid anime slug/);
  await assert.rejects(() => service.getServer('bad/id'), /valid streaming server id/);
  assert.equal(called, false);
});
