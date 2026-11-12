import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/hooks';
import { SITE_URL, breadcrumbJsonLd, pageGraph, usePageSeo } from '../lib/seo';

export function AboutPage() {
  useDocumentTitle('Tentang ReogNime');
  usePageSeo({
    title: 'Tentang ReogNime — Katalog Anime Sub Indo',
    description: 'Tentang ReogNime: katalog anime subtitle Indonesia, sumber data Otakudesu API, kebijakan video pihak ketiga, daftar tontonan, dan privasi.',
    image: '/og-reognime.jpg',
    jsonLd: pageGraph(
      {
        '@type': 'AboutPage',
        name: 'Tentang ReogNime',
        description: 'Tentang katalog anime subtitle Indonesia ReogNime.',
        url: `${SITE_URL}/tentang`,
        inLanguage: 'id-ID',
      },
      breadcrumbJsonLd([
        { name: 'Beranda', path: '/' },
        { name: 'Tentang', path: '/tentang' },
      ]),
    ),
  });

  return (
    <div className="watch-page about-page">
      <header className="container catalog-masthead">
        <div className="watch-masthead-bar">
          <Link to="/" className="text-link"><ArrowLeft size={14} /> Beranda</Link>
          <Link to="/ongoing" className="text-link">Lihat katalog <ArrowRight size={14} /></Link>
        </div>
        <div className="catalog-title-row">
          <div>
            <p className="section-index">Tentang ReogNime</p>
            <h1>Tentang <em>ReogNime.</em></h1>
          </div>
          <div className="catalog-title-aside">
            <p>
              Katalog anime subtitle Indonesia: jadwal tayang, daftar tamat, pencarian, dan pemutar episode.
            </p>
          </div>
        </div>
      </header>

      <div className="container about-content">
        <section>
          <p className="section-index">01 — Apa ini</p>
          <h2>Apa itu ReogNime?</h2>
          <p>
            ReogNime membantu kamu menemukan anime, membaca sinopsis, melihat jadwal,
            dan memilih episode. Video di-embed dari server pihak ketiga; ReogNime tidak
            menghosting atau mengunggah file video.
          </p>
        </section>

        <section>
          <p className="section-index">02 — Sumber data</p>
          <h2>Sumber data.</h2>
          <p>
            Data streaming berasal dari Otakudesu API. Arsip editorial dan katalog
            tambahan menggunakan data AniList. Hak atas judul, artwork, dan video tetap
            milik pemegang hak masing-masing.
          </p>
        </section>

        <section>
          <p className="section-index">03 — Daftar & privasi</p>
          <h2>Daftar tanpa akun.</h2>
          <p>
            Daftar tontonan tidak memerlukan akun. Data tersimpan di profil lokal ReogNime
            dan bisa diekspor sebagai JSON. Pada deployment Vercel, profil lokal dapat
            direset saat instance restart. Analitik situs dapat menggunakan cookie dari
            Google Tag Manager/GA4.
          </p>
        </section>

        <section>
          <p className="section-index">04 — Koreksi</p>
          <h2>Ada data yang salah?</h2>
          <p>
            Kalau ada judul, jadwal, mirror, atau informasi yang keliru, sampaikan lewat
            chat admin di kanan bawah. Jangan mengirim data pribadi atau sensitif ke chat.
          </p>
          <div className="about-actions">
            <Link to="/ongoing" className="button button-primary">Lihat anime tayang <ArrowRight size={15} /></Link>
            <Link to="/archive" className="button button-quiet">Buka arsip</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
