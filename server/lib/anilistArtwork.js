const ANILIST_URL = 'https://graphql.anilist.co';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 10;
const CACHE_LIMIT = 800;

function cacheKey(title) {
  return String(title ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export class AniListArtwork {
  constructor({ fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.cache = new Map();
  }

  async apply(cards) {
    const items = (Array.isArray(cards) ? cards : []).filter(
      (card) => card && typeof card.title === 'string' && card.title.trim(),
    );
    if (!items.length) return cards;

    const titles = new Map();
    for (const card of items) {
      const key = cacheKey(card.title);
      if (!key) continue;
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > this.now()) continue;
      titles.set(key, card.title);
    }

    const pending = [...titles.values()];
    const batches = [];
    for (let index = 0; index < pending.length; index += BATCH_SIZE) {
      batches.push(this.fetchBatch(pending.slice(index, index + BATCH_SIZE)));
    }
    await Promise.all(batches);

    for (const card of items) {
      const art = this.cache.get(cacheKey(card.title))?.value;
      if (!art) continue;
      if (art.cover) card.poster = art.cover;
      if (art.banner) card.banner = art.banner;
    }
    return cards;
  }

  async fetchBatch(titles) {
    const query = `query (${titles.map((_, index) => `$s${index}: String`).join(', ')}) {
      ${titles
        .map(
          (_, index) =>
            `a${index}: Page(page: 1, perPage: 1) { media(search: $s${index}, type: ANIME) { coverImage { extraLarge } bannerImage } }`,
        )
        .join('\n')}
    }`;
    const variables = Object.fromEntries(titles.map((title, index) => [`s${index}`, title]));
    let payload;
    try {
      const response = await this.fetchImpl(ANILIST_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return;
      payload = await response.json();
    } catch {
      return;
    }

    const expiresAt = this.now() + CACHE_TTL;
    titles.forEach((title, index) => {
      const media = payload?.data?.[`a${index}`]?.media?.[0] ?? null;
      this.set(title, media ? { cover: media.coverImage?.extraLarge ?? null, banner: media.bannerImage ?? null } : null, expiresAt);
    });
  }

  set(title, value, expiresAt) {
    const key = cacheKey(title);
    if (!key) return;
    this.cache.delete(key);
    this.cache.set(key, { value, expiresAt });
    while (this.cache.size > CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value);
  }
}
