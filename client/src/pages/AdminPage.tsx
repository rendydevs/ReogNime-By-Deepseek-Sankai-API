import {
  AlertCircle,
  Check,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  Lock,
  LogOut,
  MailOpen,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { API_BASE } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';

type MessageStatus = 'new' | 'read' | 'resolved';
type Filter = 'all' | MessageStatus;

interface AdminMessage {
  id: string;
  message: string;
  page: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  new: number;
  read: number;
  resolved: number;
  total: number;
}

interface AdminPayload {
  data: AdminMessage[];
  meta: {
    total: number;
    status: Filter;
    stats: AdminStats;
    storage: 'file' | 'ephemeral';
  };
}

class AdminAuthError extends Error {}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'new', label: 'Baru' },
  { value: 'read', label: 'Dibaca' },
  { value: 'resolved', label: 'Selesai' },
];

const STATUS_LABEL: Record<MessageStatus, string> = {
  new: 'Baru',
  read: 'Dibaca',
  resolved: 'Selesai',
};

function authHeader(password: string) {
  return `Basic ${btoa(`admin:${password}`)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

async function adminRequest<T>(path: string, auth: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: auth,
    },
  });
  if (response.status === 401) throw new AdminAuthError('AUTH');
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message ?? 'Permintaan admin gagal.';
    throw new Error(message);
  }
  return body as T;
}

export function AdminPage() {
  useDocumentTitle('Admin');
  const [auth, setAuth] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AdminPayload | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (nextAuth: string, nextFilter: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminRequest<AdminPayload>(`/admin/messages?status=${nextFilter}&limit=100`, nextAuth);
      setPayload(result);
    } catch (reason) {
      if (reason instanceof AdminAuthError) {
        setAuth(null);
        setPayload(null);
        setLoginError('Sesi admin tidak valid. Masukkan password lagi.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Tidak bisa memuat pesan.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    void load(auth, filter);
  }, [auth, filter, load]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || loginBusy) return;
    const nextAuth = authHeader(password);
    setLoginBusy(true);
    setLoginError(null);
    try {
      const result = await adminRequest<AdminPayload>('/admin/messages?status=all&limit=100', nextAuth);
      setAuth(nextAuth);
      setPayload(result);
      setFilter('all');
      setPassword('');
    } catch (reason) {
      if (reason instanceof AdminAuthError) setLoginError('Password admin salah.');
      else setLoginError(reason instanceof Error ? reason.message : 'Tidak bisa masuk.');
    } finally {
      setLoginBusy(false);
    }
  };

  const updateStatus = async (id: string, status: MessageStatus) => {
    if (!auth) return;
    setBusyId(id);
    try {
      await adminRequest(`/admin/messages/${id}`, auth, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load(auth, filter);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Status pesan tidak bisa diubah.');
    } finally {
      setBusyId(null);
    }
  };

  const removeMessage = async (id: string) => {
    if (!auth || !window.confirm('Hapus pesan ini dari antrean?')) return;
    setBusyId(id);
    try {
      await adminRequest(`/admin/messages/${id}`, auth, { method: 'DELETE' });
      await load(auth, filter);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pesan tidak bisa dihapus.');
    } finally {
      setBusyId(null);
    }
  };

  const logout = () => {
    setAuth(null);
    setPayload(null);
    setPassword('');
    setLoginError(null);
  };

  if (!auth) {
    return (
      <div className="admin-page">
        <div className="admin-login-shell">
          <div className="admin-login-card">
            <span className="admin-lock" aria-hidden="true"><Lock size={19} strokeWidth={1.8} /></span>
            <p className="eyebrow">Private area</p>
            <h1>Admin access.</h1>
            <p className="admin-login-copy">Masuk untuk membaca antrean pesan pengunjung.</p>
            <form onSubmit={handleLogin} className="admin-login-form">
              <label htmlFor="admin-password">Password admin</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                autoFocus
                disabled={loginBusy}
              />
              {loginError && <p className="admin-login-error" role="alert"><AlertCircle size={14} /> {loginError}</p>}
              <button type="submit" className="button button-primary" disabled={!password || loginBusy}>
                {loginBusy ? <LoaderCircle size={15} className="spin" /> : <ShieldCheck size={15} />}
                {loginBusy ? 'Memeriksa…' : 'Masuk'}
              </button>
            </form>
            <p className="admin-login-note">Area ini tidak ditautkan dari navigasi publik.</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = payload?.meta.stats ?? { new: 0, read: 0, resolved: 0, total: 0 };
  const messages = payload?.data ?? [];

  return (
    <div className="admin-page">
      <div className="container admin-shell">
        <header className="admin-head">
          <div>
            <p className="eyebrow">Private queue</p>
            <h1>Pesan masuk.</h1>
            <p className="admin-subtitle">Pesan dari NimeBot yang diteruskan pengunjung.</p>
          </div>
          <div className="admin-head-actions">
            <button className="button button-outline" onClick={() => void load(auth, filter)} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button className="button button-quiet" onClick={logout}>
              <LogOut size={14} /> Keluar
            </button>
          </div>
        </header>

        <div className="admin-stats">
          <div><span>Baru</span><strong>{stats.new}</strong><Inbox size={16} /></div>
          <div><span>Dibaca</span><strong>{stats.read}</strong><MailOpen size={16} /></div>
          <div><span>Selesai</span><strong>{stats.resolved}</strong><CheckCircle2 size={16} /></div>
          <div><span>Total</span><strong>{stats.total}</strong><Inbox size={16} /></div>
        </div>

        {payload?.meta.storage === 'ephemeral' && (
          <p className="admin-storage-note"><AlertCircle size={13} /> Penyimpanan sementara di Vercel—pesan bisa hilang saat instance restart.</p>
        )}

        <div className="admin-toolbar">
          <div className="admin-filters" role="tablist" aria-label="Filter pesan">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                role="tab"
                aria-selected={filter === item.value}
                className={filter === item.value ? 'is-active' : ''}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
                {item.value !== 'all' && <span>{stats[item.value]}</span>}
              </button>
            ))}
          </div>
          <span className="admin-message-count">{loading ? 'Memuat…' : `${messages.length} pesan`}</span>
        </div>

        {error && <p className="admin-error" role="alert"><AlertCircle size={14} /> {error}</p>}

        {loading && !messages.length ? (
          <div className="admin-loading"><LoaderCircle size={19} className="spin" /> Memuat antrean…</div>
        ) : messages.length === 0 ? (
          <div className="admin-empty">
            <Inbox size={24} strokeWidth={1.5} />
            <h2>Belum ada pesan di filter ini.</h2>
            <p>Pesan yang diteruskan bot akan muncul di sini.</p>
          </div>
        ) : (
          <div className="admin-message-list">
            {messages.map((message) => (
              <article className={`admin-message admin-message-${message.status}`} key={message.id}>
                <header>
                  <span className={`admin-status admin-status-${message.status}`}>{STATUS_LABEL[message.status]}</span>
                  <time dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
                  <span className="admin-page-path">{message.page === '/' ? 'Home' : message.page}</span>
                </header>
                <p>{message.message}</p>
                <footer>
                  {message.status === 'new' && (
                    <button onClick={() => void updateStatus(message.id, 'read')} disabled={busyId === message.id}>
                      <MailOpen size={13} /> Tandai dibaca
                    </button>
                  )}
                  {message.status !== 'resolved' && (
                    <button onClick={() => void updateStatus(message.id, 'resolved')} disabled={busyId === message.id}>
                      <Check size={13} /> Selesai
                    </button>
                  )}
                  {message.status === 'resolved' && (
                    <button onClick={() => void updateStatus(message.id, 'new')} disabled={busyId === message.id}>
                      <RefreshCw size={13} /> Buka lagi
                    </button>
                  )}
                  <button className="admin-delete" onClick={() => void removeMessage(message.id)} disabled={busyId === message.id}>
                    <Trash2 size={13} /> Hapus
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
