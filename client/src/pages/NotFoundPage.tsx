import { ArrowLeft, ListFilter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/hooks';
import { usePageSeo } from '../lib/seo';

export function NotFoundPage() {
  useDocumentTitle('Halaman Tidak Ditemukan');
  usePageSeo({
    title: 'Halaman Tidak Ditemukan — ReogNime',
    description: 'Halaman yang kamu cari tidak ada di indeks ReogNime.',
    noindex: true,
  });
  return (
    <div className="not-found container">
      <p className="eyebrow">404 / Di luar rak</p>
      <h1>Halaman ini<br />tersesat.</h1>
      <p>Alamat ini tidak menuju ke mana pun di indeks. Yang bagus masih di tempatnya.</p>
      <div className="empty-actions">
        <Link to="/" className="button button-primary"><ArrowLeft size={15} /> Kembali ke beranda</Link>
        <Link to="/all" className="button button-quiet"><ListFilter size={15} /> Jelajahi semua anime</Link>
      </div>
      <span className="not-found-jp">迷子</span>
    </div>
  );
}
