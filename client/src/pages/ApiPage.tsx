import { ArrowUpRight, Check, Copy, ExternalLink, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_BASE, API_HEALTH_URL } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
}

const ENDPOINT_GROUPS: { label: string; note: string; endpoints: Endpoint[] }[] = [
  {
    label: 'Penemuan',
    note: 'Publik, hanya baca, di-cache 30–300 detik.',
    endpoints: [
      { method: 'GET', path: '/home', title: 'Beranda editorial', description: 'Sorotan, populer, skor tertinggi, rilisan baru, genre, dan total katalog dalam satu respons.' },
      { method: 'GET', path: '/anime', title: 'Daftar & cari', description: 'Pencarian dengan halaman memakai q, genre, tahun, musim, format, status, minScore, dan sort.' },
      { method: 'GET', path: '/anime/:id', title: 'Detail judul', description: 'Metadata lengkap, sinopsis, karakter, trailer, judul terkait, dan pelacak episode.' },
      { method: 'GET', path: '/anime/:id/episodes', title: 'Indeks episode', description: 'Daftar episode dengan halaman, tanggal tayang, dan durasi.' },
      { method: 'GET', path: '/anime/:id/related', title: 'Judul terkait', description: 'Kedekatan genre, studio, dan era, diurutkan berdasarkan relevansi.' },
      { method: 'GET', path: '/search/suggestions', title: 'Saran pencarian', description: 'Saran ringan untuk palet perintah. q kosong mengembalikan pilihan populer.' },
      { method: 'GET', path: '/random', title: 'Pilihan acak', description: 'Menerima filter yang sama dengan /anime dan mengembalikan satu judul.' },
      { method: 'GET', path: '/edition', title: 'Edisi harian', description: 'Pilihan anime harian, suasana hari ini, dan daftar unggulan. Dihitung dari arsip lokal dengan cache lima menit.' },
      { method: 'GET', path: '/moods', title: 'Rekomendasi suasana', description: 'Kelompok suasana dengan rekomendasi anime dan jumlah judulnya.' }
    ],
  },
  {
    label: 'Daftar',
    note: 'Satu profil lokal. Disimpan sebagai JSON, tanpa akun.',
    endpoints: [
      { method: 'GET', path: '/library', title: 'Baca daftar', description: 'Entri digabung dengan ringkasan anime dan statistik agregat.' },
      { method: 'POST', path: '/library', title: 'Tambah judul', description: 'Buat entri dengan status, skor, progres, catatan, dan tanda favorit.' },
      { method: 'GET', path: '/library/:animeId', title: 'Baca satu entri', description: 'Satu entri daftar beserta ringkasan anime-nya.' },
      { method: 'PATCH', path: '/library/:animeId', title: 'Perbarui entri', description: 'Pembaruan sebagian. Menandai selesai mengisi progres sesuai jumlah episode.' },
      { method: 'DELETE', path: '/library/:animeId', title: 'Hapus entri', description: 'Menghapus entri dan mengembalikan 204.' },
      { method: 'GET', path: '/library/stats', title: 'Statistik', description: 'Jumlah status, episode dan jam ditonton, rata-rata skor, dan genre teratas.' },
      { method: 'GET', path: '/library/export', title: 'Ekspor JSON', description: 'Unduh seluruh daftar sebagai dokumen JSON portabel.' },
    ],
  },
  {
    label: 'Streaming',
    note: 'API tontonan langsung dari Otakudesu API. Semua endpoint terhubung ke UI dan dijaga batas permintaannya oleh server ReogNime.',
    endpoints: [
      { method: 'GET', path: '/otakudesu/home', title: 'Beranda streaming', description: 'Daftar tayang dan tamat plus satu judul tayang unggulan.' },
      { method: 'GET', path: '/otakudesu/ongoing', title: 'Anime tayang', description: 'Judul yang sedang tayang dengan halaman. Opsional ?page=1.' },
      { method: 'GET', path: '/otakudesu/completed', title: 'Anime tamat', description: 'Seri selesai dengan halaman. Opsional ?page=1.' },
      { method: 'GET', path: '/otakudesu/schedule', title: 'Jadwal rilis', description: 'Judul tayang dikelompokkan per hari.' },
      { method: 'GET', path: '/otakudesu/search', title: 'Cari judul streaming', description: 'Cari judul lewat kata kunci. Wajib: ?q=frieren.' },
      { method: 'GET', path: '/otakudesu/genres', title: 'Genre streaming', description: 'Semua genre streaming beserta slug-nya.' },
      { method: 'GET', path: '/otakudesu/genres/:slug', title: 'Anime per genre', description: 'Hasil genre dengan halaman. Contoh: /otakudesu/genres/action?page=1.' },
      { method: 'GET', path: '/otakudesu/anime/:slug', title: 'Detail seri', description: 'Sinopsis, metadata, genre, daftar episode, judul terkait, dan referensi batch.' },
      { method: 'GET', path: '/otakudesu/episode/:slug', title: 'Episode + mirror', description: 'Server streaming, kualitas unduhan, episode sebelumnya/berikutnya, dan daftar episode.' },
      { method: 'GET', path: '/otakudesu/batch/:slug', title: 'Unduh batch', description: 'Kualitas batch, ukuran, dan tautan mirror untuk satu seri lengkap.' },
      { method: 'GET', path: '/otakudesu/server/:serverId', title: 'Resolusi URL embed', description: 'Ubah id server mirror menjadi URL pemutar yang bisa di-embed.' },
      { method: 'GET', path: '/otakudesu/unlimited', title: 'Semua anime (A–Z)', description: 'Semua judul streaming, dikelompokkan berdasarkan huruf awal.' },
      { method: 'GET', path: '/otakudesu/status', title: 'Status penyedia', description: 'Ukuran cache dan indeks ilustrasi serta sisa jatah permintaan upstream.' },
    ],
  },
  {
    label: 'Referensi',
    note: 'Semua yang dibutuhkan untuk membangun antarmuka dinamis.',
    endpoints: [
      { method: 'GET', path: '/genres', title: 'Genre', description: 'Nama genre beserta jumlah judul.' },
      { method: 'GET', path: '/filters', title: 'Opsi filter', description: 'Tahun, format, musim, status, dan nilai urutan yang didukung.' },
      { method: 'GET', path: '/meta', title: 'Metadata katalog', description: 'Sumber, jumlah, dan informasi versi API.' },
      { method: 'GET', path: '/openapi.json', title: 'OpenAPI 3.1', description: 'Spesifikasi API lengkap yang bisa dibaca mesin.' },
    ],
  },
];

const METHOD_CLASS: Record<Endpoint['method'], string> = {
  GET: 'method-get',
  POST: 'method-post',
  PATCH: 'method-patch',
  DELETE: 'method-delete',
};

export function ApiPage() {
  useDocumentTitle('Referensi API');
  const { notify } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
  const openApiUrl = `${base}/openapi.json`;

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1800);
    } catch {
      notify('Clipboard access was blocked by the browser.', { tone: 'info' });
    }
  };

  const quickStart = `# Seluruh rak dalam satu permintaan
curl "${base}/home"

# Cari dengan filter
curl "${base}/anime?genre=Drama&sort=score&limit=3"

# Lapisan streaming
curl "${base}/otakudesu/home"
curl "${base}/otakudesu/search?q=frieren"

# Tambahkan judul ke daftar
curl -X POST "${base}/library" \\
  -H "Content-Type: application/json" \\
  -d '{"animeId": 154587, "status": "WATCHING"}'`;

  const responseShape = `{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}`;

  return (
    <div className="api-page">
      <header className="api-masthead container">
        <div className="api-masthead-copy">
          <p className="eyebrow">Referensi pengembang / v1</p>
          <h1>Rak ini,<br />sebagai <em>API.</em></h1>
          <p>
            Katalog yang sama yang menjalankan ReogNime, plus API streaming,
            tersedia sebagai REST yang ringkas dan mudah ditebak. Tanpa key, SDK, atau ritual.
          </p>
        </div>
        <div className="api-terminal" aria-hidden="true">
          <div className="api-terminal-bar"><span /><span /><span /><em>GET /api/v1/home</em></div>
          <div className="api-terminal-body">
            <p><span className="terminal-prompt">$</span> curl /home</p>
            <p className="terminal-response">{'{'}</p>
            <p className="terminal-response">  "titles": 45,</p>
            <p className="terminal-response">  "genres": 18,</p>
            <p className="terminal-response">  "source": "AniList"</p>
            <p className="terminal-response">{'}'}</p>
            <p className="terminal-cursor"><span className="terminal-prompt">$</span> <span className="cursor" /></p>
          </div>
        </div>
      </header>

      <div className="api-base container">
        <div>
          <span className="eyebrow">URL dasar</span>
          <code>{base}</code>
        </div>
        <button className="button button-quiet" onClick={() => void copy(base, 'base')}>
          {copied === 'base' ? <Check size={15} /> : <Copy size={15} />}
          {copied === 'base' ? 'Tersalin' : 'Salin'}
        </button>
        <a className="button button-outline" href={openApiUrl} target="_blank" rel="noreferrer">
          OpenAPI 3.1 <ExternalLink size={14} />
        </a>
      </div>

      <div className="api-layout container">
        <aside className="api-toc">
          <p className="eyebrow">Di halaman ini</p>
          <a href="#quick-start">Mulai cepat</a>
          <a href="#conventions">Konvensi</a>
          {ENDPOINT_GROUPS.map((group) => (
            <a key={group.label} href={`#${group.label.toLowerCase()}`}>{group.label}</a>
          ))}
          <a href="#notes">Catatan</a>
          <div className="api-toc-footer">
            <Terminal size={15} />
            <span>Hanya JSON.<br />CORS aktif.</span>
          </div>
        </aside>

        <main className="api-content">
          <section className="api-section" id="quick-start">
            <div className="api-section-head">
              <p className="section-index">01</p>
              <div>
                <h2>Mulai cepat</h2>
                <p>Semua endpoint GET bersifat publik. Endpoint daftar menulis ke file JSON lokal.</p>
              </div>
            </div>
            <div className="code-block">
              <div className="code-block-head">
                <span>Terminal</span>
                <button onClick={() => void copy(quickStart, 'quick')}>
                  {copied === 'quick' ? <Check size={13} /> : <Copy size={13} />}
                  {copied === 'quick' ? 'Tersalin' : 'Salin'}
                </button>
              </div>
              <pre><code>{quickStart}</code></pre>
            </div>
            <div className="api-callout">
              <strong>Integrasi frontend.</strong>
              <p>
                Dev server Vite mem-proxy <code>/api</code> ke API di port 8787, jadi fetch relatif bekerja
                saat pengembangan maupun produksi tanpa base URL:
              </p>
              <pre className="inline-code"><code>{`const res = await fetch('/api/v1/anime?genre=Drama');\nconst { data, meta } = await res.json();`}</code></pre>
            </div>
          </section>

          <section className="api-section" id="conventions">
            <div className="api-section-head">
              <p className="section-index">02</p>
              <div>
                <h2>Konvensi</h2>
                <p>Kecil dan konsisten, supaya frontend bisa dibangun tanpa menebak.</p>
              </div>
            </div>
            <div className="convention-grid">
              <div>
                <h3>Struktur respons</h3>
                <p>Setiap respons sukses memakai <code>{'{ data }'}</code>. Daftar menambahkan <code>meta</code> berisi pagination dan filter.</p>
              </div>
              <div>
                <h3>Error</h3>
                <p>Error mengembalikan <code>{'{ error: { code, message } }'}</code> dengan status HTTP dan detail field opsional.</p>
              </div>
              <div>
                <h3>Validasi</h3>
                <p>Query dan body divalidasi. Input tidak valid mengembalikan <code>422</code> sebelum mencapai lapisan data.</p>
              </div>
              <div>
                <h3>Pagination</h3>
                <p>Gunakan <code>page</code> dan <code>limit</code> (maks 50). Respons selalu menyertakan <code>total</code> dan <code>hasNextPage</code>.</p>
              </div>
            </div>
            <div className="code-block code-block-small">
              <div className="code-block-head"><span>Respons daftar</span></div>
              <pre><code>{responseShape}</code></pre>
            </div>
          </section>

          {ENDPOINT_GROUPS.map((group, groupIndex) => (
            <section className="api-section" id={group.label.toLowerCase()} key={group.label}>
              <div className="api-section-head">
                <p className="section-index">{String(groupIndex + 3).padStart(2, '0')}</p>
                <div>
                  <h2>{group.label}</h2>
                  <p>{group.note}</p>
                </div>
              </div>
              <div className="endpoint-list">
                {group.endpoints.map((endpoint) => (
                  <div className="endpoint-row" key={`${endpoint.method}-${endpoint.path}`}>
                    <span className={`method ${METHOD_CLASS[endpoint.method]}`}>{endpoint.method}</span>
                    <div className="endpoint-main">
                      <div className="endpoint-path-line">
                        <code>{endpoint.path}</code>
                        <button
                          className="endpoint-copy"
                          onClick={() => void copy(`${base}${endpoint.path.replace(':id', '154587').replace(':animeId', '154587').replace(':slug', 'sousou-frieren-sub-indo').replace(':serverId', '6AE5C9-5-C75u')}`, endpoint.path)}
                          aria-label={`Salin ${endpoint.path}`}
                        >
                          {copied === endpoint.path ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                      <strong>{endpoint.title}</strong>
                      <p>{endpoint.description}</p>
                    </div>
                    {endpoint.method === 'GET' && !endpoint.path.includes(':') && endpoint.path !== '/otakudesu/search' && (
                      <a
                        className="endpoint-open"
                        href={`${base}${endpoint.path}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Buka respons"
                      >
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="api-section api-notes" id="notes">
            <div className="api-section-head">
              <p className="section-index">{String(ENDPOINT_GROUPS.length + 3).padStart(2, '0')}</p>
              <div>
                <h2>Catatan & batas</h2>
                <p>Detail kecil, tetap ringkas.</p>
              </div>
            </div>
            <ul>
              <li><strong>Sumber data.</strong> Metadata dan artwork diambil dari AniList dan di-cache lokal untuk demo. Semua hak tetap milik pemegangnya.</li>
              <li><strong>Batas permintaan.</strong> 240 permintaan per menit per IP di demo. Respons katalog di-cache di browser dan CDN.</li>
              <li><strong>Sumber streaming.</strong> Lapisan tontonan memakai Otakudesu API publik, dibatasi 30 permintaan upstream per menit (penyedia mengizinkan 45), dan di-cache. Sebagian mirror pihak ketiga bisa offline; ReogNime tidak pernah menyimpan file video.</li>
              <li><strong>Tanpa autentikasi.</strong> Ini demo lokal satu profil. Jika dipublikasikan, pasang autentikasi untuk rute daftar di reverse proxy.</li>
              <li><strong>Penyimpanan.</strong> Daftar tersimpan di <code>server/data/library.json</code>. Penulisan atomik. Ekspor kapan saja lewat tombol di atas atau <code>/library/export</code>.</li>
            </ul>
            <div className="api-notes-actions">
              <Link to="/discover" className="text-link">Jelajahi katalog <ArrowUpRight size={14} /></Link>
              <a href={API_HEALTH_URL} target="_blank" rel="noreferrer" className="text-link">Kesehatan API <ArrowUpRight size={14} /></a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
