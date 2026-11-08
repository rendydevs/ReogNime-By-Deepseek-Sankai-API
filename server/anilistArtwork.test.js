import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AniListArtwork } from './lib/anilistArtwork.js';

test('AniList artwork enriches cards, caches results, and leaves misses intact', async () => {
  const calls = [];
  const resolver = new AniListArtwork({
    fetchImpl: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return new Response(
        JSON.stringify({
          data: {
            a0: {
              media: [
                {
                  coverImage: { extraLarge: 'https://cdn.test/cover.jpg' },
                  bannerImage: 'https://cdn.test/banner.jpg',
                },
              ],
            },
            a1: { media: [] },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    },
  });

  const cards = [
    { title: 'Vertex Force', poster: 'https://old.test/poster.jpg', banner: null },
    { title: 'Unknown Show', poster: 'https://old.test/unknown.jpg', banner: null },
  ];
  await resolver.apply(cards);
  assert.equal(cards[0].poster, 'https://cdn.test/cover.jpg');
  assert.equal(cards[0].banner, 'https://cdn.test/banner.jpg');
  assert.equal(cards[1].poster, 'https://old.test/unknown.jpg');
  assert.equal(calls.length, 1);

  await resolver.apply(cards);
  assert.equal(calls.length, 1, 'cached titles should not trigger another AniList request');
});


test('AniList artwork treats an empty Page result as a miss', async () => {
  const resolver = new AniListArtwork({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: {
            a0: { media: [{ coverImage: { extraLarge: 'https://cdn.test/good.jpg' }, bannerImage: null }] },
            a1: { media: [] },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  });
  const cards = [
    { title: 'Good Show', poster: 'old', banner: null },
    { title: 'Missing Show', poster: 'old', banner: null },
  ];
  await resolver.apply(cards);
  assert.equal(cards[0].poster, 'https://cdn.test/good.jpg');
  assert.equal(cards[1].poster, 'old');
});
