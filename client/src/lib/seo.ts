import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SITE_URL = 'https://www.reognime.site';
const DEFAULT_IMAGE = `${SITE_URL}/og-reognime.jpg`;

type SeoInput = {
  title?: string;
  description?: string;
  image?: string | null;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function absoluteImage(image?: string | null) {
  if (!image) return DEFAULT_IMAGE;
  return /^https?:\/\//i.test(image) ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
}

function setJsonLd(jsonLd: Record<string, unknown> | null) {
  const existing = document.head.querySelector<HTMLScriptElement>('script[data-page-jsonld]');
  if (!jsonLd) {
    existing?.remove();
    return;
  }
  const script = existing ?? document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.pageJsonld = 'true';
  script.textContent = JSON.stringify(jsonLd);
  if (!existing) document.head.appendChild(script);
}

export function applySeo({ title, description, image, type = 'website', noindex = false, jsonLd = null }: SeoInput = {}) {
  const path = `${window.location.pathname}${window.location.search}`;
  const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
  const pageTitle = title || document.title;
  const ogImage = absoluteImage(image);

  if (description) setMeta('name', 'description', description);
  setCanonical(canonical);
  setMeta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large');
  setMeta('property', 'og:title', pageTitle);
  if (description) setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:image', ogImage);
  setMeta('name', 'twitter:title', pageTitle);
  if (description) setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', ogImage);
  setJsonLd(jsonLd);
}

export function usePageSeo(input: SeoInput = {}) {
  const location = useLocation();
  useEffect(() => {
    if (!input.title && !input.description && !input.image && !input.jsonLd) return;
    applySeo(input);
    // The path is part of the dependency list so canonical stays current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, input.title, input.description, input.image, input.type, input.noindex, input.jsonLd]);
}

const ROUTE_META: Record<string, { title: string; description: string; noindex?: boolean }> = {
  '/': {
    title: 'Nonton Anime Sub Indo Tanpa Ribet — ReogNime',
    description:
      'Nonton anime subtitle Indonesia terbaru di ReogNime. Cek daftar anime tayang, tamat, jadwal rilis, genre, dan pencarian judul dengan antarmuka minimalis.',
  },
  '/ongoing': {
    title: 'Anime Tayang Sub Indo — ReogNime',
    description:
      'Daftar anime tayang subtitle Indonesia terbaru. Update episode, poster, jadwal rilis, dan semua mirror streaming di ReogNime.',
  },
  '/completed': {
    title: 'Anime Tamat Sub Indo — ReogNime',
    description:
      'Koleksi anime tamat subtitle Indonesia pilihan. Temukan anime yang sudah tamat untuk ditonton sampai akhir di ReogNime.',
  },
  '/schedule': {
    title: 'Jadwal Rilis Anime Sub Indo — ReogNime',
    description:
      'Jadwal rilis anime mingguan subtitle Indonesia. Lihat anime yang tayang setiap hari dan update terbaru di ReogNime.',
  },
  '/genres': {
    title: 'Genre Anime Sub Indo — ReogNime',
    description:
      'Jelajahi genre anime: action, adventure, comedy, drama, fantasy, romance, dan banyak lagi. Nonton sub indo di ReogNime.',
  },
  '/all': {
    title: 'Semua Anime A–Z Sub Indo — ReogNime',
    description:
      'Katalog lengkap anime A–Z subtitle Indonesia. Telusuri semua judul berdasarkan huruf awal dan temukan tontonan berikutnya.',
  },
  '/search': {
    title: 'Cari Anime Sub Indo — ReogNime',
    description: 'Cari anime subtitle Indonesia berdasarkan judul di katalog ReogNime.',
    noindex: true,
  },
  '/archive': {
    title: 'Arsip Anime — ReogNime',
    description:
      'Arsip editorial ReogNime: rekomendasi anime pilihan, daftar tontonan, dan katalog AniList untuk menemukan cerita baru.',
  },
  '/discover': {
    title: 'Temukan Anime — ReogNime',
    description: 'Temukan anime baru dari katalog AniList berdasarkan genre, tahun, musim, dan skor di ReogNime.',
  },
  '/library': {
    title: 'Daftar Saya — ReogNime',
    description: 'Daftar tontonan pribadi ReogNime.',
    noindex: true,
  },
  '/admin': {
    title: 'Admin — ReogNime',
    description: 'Antrean pesan privat admin ReogNime.',
    noindex: true,
  },
  '/developers': {
    title: 'Referensi API — ReogNime',
    description: 'Dokumentasi API ReogNime dan OpenAPI 3.1.',
    noindex: true,
  },
};

function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const meta = ROUTE_META[location.pathname];
    applySeo({
      title: meta?.title ?? document.title,
      description: meta?.description ?? ROUTE_META['/'].description,
      noindex: meta?.noindex,
    });
    // A page-specific hook can replace this with dynamic anime metadata later.
    document.head.querySelector('script[data-page-jsonld]')?.remove();
  }, [location.pathname]);

  return null;
}

export { SeoManager };
