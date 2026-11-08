import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  Lock,
  LogOut,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { API_BASE } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';

type ThreadStatus = 'open' | 'resolved';
type Filter = 'all' | ThreadStatus;

interface ThreadSummary {
  id: string;
  status: ThreadStatus;
  page: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messageCount: number;
  lastMessage: string;
  lastFrom: 'visitor' | 'admin' | 'system';
}

interface ThreadMessage {
  id: string;
  from: 'visitor' | 'admin' | 'system';
  text: string;
  createdAt: string;
}

interface ThreadDetail {
  id: string;
  status: ThreadStatus;
  page: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages: ThreadMessage[];
}

interface ThreadPayload {
  data: ThreadSummary[];
  meta: {
    total: number;
    status: Filter;
    stats: { open: number; resolved: number; total: number };
    storage: 'file' | 'ephemeral';
  };
}

class AdminAuthError extends Error {}

class AdminRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminRequestError';
    this.status = status;
  }
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'open', label: 'Terbuka' },
  { value: 'resolved', label: 'Selesai' },
];

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
  if (!response.ok) throw new AdminRequestError(body?.error?.message ?? 'Permintaan admin gagal.', response.status);
  return body as T;
}

export function AdminPage() {
  useDocumentTitle('Admin');
  const [auth, setAuth] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [stats, setStats] = useState({ open: 0, resolved: 0, total: 0 });
  const [storage, setStorage] = useState<'file' | 'ephemeral'>('file');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const detailAbort = useRef<AbortController | null>(null);
  const detailRequest = useRef(0);
  const busyRef = useRef(false);

  const loadList = useCallback(async (nextAuth: string, nextFilter: Filter, selectMissing = true) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminRequest<ThreadPayload>(`/admin/threads?status=${nextFilter}&limit=100`, nextAuth);
      setThreads(result.data);
      setStats(result.meta.stats);
      setStorage(result.meta.storage);
      if (selectMissing) {
        setSelectedId((current) => result.data.some((thread) => thread.id === current) ? current : result.data[0]?.id ?? null);
      }
    } catch (reason) {
      if (reason instanceof AdminAuthError) {
        setAuth(null);
        setThreads([]);
        setDetail(null);
        setLoginError('Sesi admin tidak valid. Masukkan password lagi.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Tidak bisa memuat percakapan.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (nextAuth: string, id: string, quiet = false) => {
    if (quiet && busyRef.current) return;
    detailAbort.current?.abort();
    const controller = new AbortController();
    detailAbort.current = controller;
    const requestId = detailRequest.current + 1;
    detailRequest.current = requestId;
    if (!quiet) setDetailLoading(true);
    try {
      const result = await adminRequest<{ data: ThreadDetail }>(`/admin/threads/${id}`, nextAuth, { signal: controller.signal });
      if (requestId !== detailRequest.current) return;
      setDetail(result.data);
      setError(null);
    } catch (reason) {
      if (controller.signal.aborted || requestId !== detailRequest.current) return;
      if (reason instanceof AdminAuthError) {
        setAuth(null);
        setDetail(null);
        setLoginError('Sesi admin tidak valid. Masukkan password lagi.');
        return;
      }
      if (reason instanceof AdminRequestError && reason.status === 404) {
        setDetail(null);
        setSelectedId(null);
        return;
      }
      if (!quiet) setError(reason instanceof Error ? reason.message : 'Tidak bisa memuat percakapan.');
    } finally {
      if (detailAbort.current === controller && !quiet) setDetailLoading(false);
    }
  }, [busy]);

  useEffect(() => () => detailAbort.current?.abort(), []);

  useEffect(() => {
    if (!auth) return;
    void loadList(auth, filter);
  }, [auth, filter, loadList]);

  useEffect(() => {
    if (!auth || !selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(auth, selectedId);
  }, [auth, selectedId, loadDetail]);

  useEffect(() => { setReply(''); }, [selectedId]);

  useEffect(() => {
    if (!auth) return;
    const listTimer = window.setInterval(() => void loadList(auth, filter, false), 20_000);
    const detailTimer = selectedId
      ? window.setInterval(() => void loadDetail(auth, selectedId, true), 15_000)
      : undefined;
    return () => {
      window.clearInterval(listTimer);
      if (detailTimer) window.clearInterval(detailTimer);
    };
  }, [auth, filter, selectedId, loadList, loadDetail]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || loginBusy) return;
    const nextAuth = authHeader(password);
    setLoginBusy(true);
    setLoginError(null);
    try {
      const result = await adminRequest<ThreadPayload>('/admin/threads?status=all&limit=100', nextAuth);
      setAuth(nextAuth);
      setThreads(result.data);
      setStats(result.meta.stats);
      setStorage(result.meta.storage);
      setFilter('all');
      setSelectedId(result.data[0]?.id ?? null);
      setPassword('');
    } catch (reason) {
      if (reason instanceof AdminAuthError) setLoginError('Kata sandi admin salah.');
      else setLoginError(reason instanceof Error ? reason.message : 'Tidak bisa masuk.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleReplyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || !detail || !reply.trim() || busy) return;
    setBusy(true);
    setError(null);
    detailAbort.current?.abort();
    detailRequest.current += 1;
    try {
      const result = await adminRequest<{ data: ThreadDetail }>(`/admin/threads/${detail.id}/messages`, auth, {
        method: 'POST',
        body: JSON.stringify({ message: reply.trim() }),
      });
      detailRequest.current += 1;
      setDetail(result.data);
      setReply('');
      await loadList(auth, filter, false);
    } catch (reason) {
      if (reason instanceof AdminRequestError && reason.status === 404) {
        setDetail(null);
        setSelectedId(null);
        void loadList(auth, filter);
      } else if (reason instanceof AdminAuthError) {
        setAuth(null);
      } else {
        setError(reason instanceof Error ? reason.message : 'Balasan tidak terkirim.');
      }
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: ThreadStatus) => {
    if (!auth || !detail || busy) return;
    setBusy(true);
    setError(null);
    detailAbort.current?.abort();
    detailRequest.current += 1;
    try {
      const result = await adminRequest<{ data: ThreadDetail }>(`/admin/threads/${detail.id}`, auth, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      detailRequest.current += 1;
      setDetail(result.data);
      await loadList(auth, filter, false);
    } catch (reason) {
      if (reason instanceof AdminRequestError && reason.status === 404) {
        setDetail(null);
        setSelectedId(null);
        void loadList(auth, filter);
      } else if (reason instanceof AdminAuthError) {
        setAuth(null);
      } else {
        setError(reason instanceof Error ? reason.message : 'Status tidak bisa diubah.');
      }
    } finally {
      setBusy(false);
    }
  };

  const removeThread = async () => {
    if (!auth || !detail || !window.confirm('Hapus seluruh percakapan ini?')) return;
    setBusy(true);
    detailAbort.current?.abort();
    detailRequest.current += 1;
    try {
      await adminRequest(`/admin/threads/${detail.id}`, auth, { method: 'DELETE' });
      setDetail(null);
      setSelectedId(null);
      await loadList(auth, filter);
    } catch (reason) {
      if (reason instanceof AdminRequestError && reason.status === 404) {
        setDetail(null);
        setSelectedId(null);
        await loadList(auth, filter);
      } else if (reason instanceof AdminAuthError) {
        setAuth(null);
      } else {
        setError(reason instanceof Error ? reason.message : 'Percakapan tidak bisa dihapus.');
      }
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    setAuth(null);
    setThreads([]);
    setDetail(null);
    setPassword('');
    setLoginError(null);
    setSelectedId(null);
  };

  if (!auth) {
    return (
      <div className="admin-page">
        <div className="admin-login-shell">
          <div className="admin-login-card">
            <span className="admin-lock" aria-hidden="true"><Lock size={19} strokeWidth={1.8} /></span>
            <p className="eyebrow">Area privat</p>
            <h1>Akses admin.</h1>
            <p className="admin-login-copy">Masuk untuk membaca dan membalas pesan pengunjung.</p>
            <form onSubmit={handleLogin} className="admin-login-form">
              <label htmlFor="admin-password">Kata sandi admin</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan kata sandi"
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

  return (
    <div className="admin-page">
      <div className="container admin-shell">
        <header className="admin-head">
          <div>
            <p className="eyebrow">Antrean privat</p>
            <h1>Pesan masuk.</h1>
            <p className="admin-subtitle">Percakapan dua arah antara pengunjung dan Admin ReogNime.</p>
          </div>
          <div className="admin-head-actions">
            <button className="button button-outline" onClick={() => void loadList(auth, filter)} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Muat ulang
            </button>
            <button className="button button-quiet" onClick={logout}><LogOut size={14} /> Keluar</button>
          </div>
        </header>

        <div className="admin-stats">
          <div><span>Terbuka</span><strong>{stats.open}</strong><Inbox size={16} /></div>
          <div><span>Selesai</span><strong>{stats.resolved}</strong><CheckCircle2 size={16} /></div>
          <div><span>Total</span><strong>{stats.total}</strong><Inbox size={16} /></div>
        </div>

        {storage === 'ephemeral' && (
          <p className="admin-storage-note"><AlertCircle size={13} /> Penyimpanan sementara di Vercel—percakapan bisa hilang saat instance restart.</p>
        )}

        <div className="admin-toolbar">
          <div className="admin-filters" role="tablist" aria-label="Filter percakapan">
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
          <span className="admin-message-count">{loading ? 'Memuat…' : `${threads.length} percakapan`}</span>
        </div>

        {error && <p className="admin-error" role="alert"><AlertCircle size={14} /> {error}</p>}

        <div className="admin-threads-layout">
          <aside className="admin-thread-list" aria-label="Daftar percakapan">
            {loading && !threads.length ? (
              <div className="admin-loading"><LoaderCircle size={18} className="spin" /> Memuat…</div>
            ) : threads.length === 0 ? (
              <div className="admin-thread-empty">
                <Inbox size={22} />
                <p>Belum ada percakapan.</p>
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`admin-thread-item ${selectedId === thread.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(thread.id)}
                >
                  <span className="admin-thread-item-top">
                    <span className={`admin-status admin-status-${thread.status}`}>{thread.status === 'open' ? 'Terbuka' : 'Selesai'}</span>
                    <time dateTime={thread.updatedAt}>{formatDate(thread.updatedAt)}</time>
                  </span>
                  <strong>{thread.lastMessage || 'Percakapan baru'}</strong>
                  <span className="admin-thread-item-meta">
                    {thread.page === '/' ? 'Beranda' : thread.page}
                    <i>·</i>
                    {thread.messageCount} pesan
                  </span>
                </button>
              ))
            )}
          </aside>

          <section className="admin-thread-detail">
            {!detail && !detailLoading ? (
              <div className="admin-thread-empty admin-thread-empty-large">
                <Inbox size={24} />
                <p>Pilih percakapan untuk membalas.</p>
              </div>
            ) : detailLoading && !detail ? (
              <div className="admin-loading"><LoaderCircle size={18} className="spin" /> Memuat percakapan…</div>
            ) : detail ? (
              <>
                <header className="admin-thread-head">
                  <button className="admin-thread-back" onClick={() => setSelectedId(null)} aria-label="Tutup percakapan">
                    <ArrowLeft size={15} />
                  </button>
                  <div>
                    <p className="eyebrow">{detail.page === '/' ? 'Beranda' : detail.page}</p>
                    <h2>{detail.status === 'open' ? 'Percakapan terbuka' : 'Percakapan selesai'}</h2>
                  </div>
                  <div className="admin-thread-head-actions">
                    {detail.status === 'open' ? (
                      <button className="button button-outline" onClick={() => void setStatus('resolved')} disabled={busy}>
                        <CheckCircle2 size={14} /> Tandai selesai
                      </button>
                    ) : (
                      <button className="button button-outline" onClick={() => void setStatus('open')} disabled={busy}>
                        <RotateCcw size={14} /> Buka lagi
                      </button>
                    )}
                    <button className="admin-thread-delete" onClick={() => void removeThread()} disabled={busy} aria-label="Hapus percakapan">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </header>

                <div className="admin-thread-conversation">
                  {detail.messages.map((message) => (
                    message.from === 'system' ? (
                      <div className="admin-thread-system" key={message.id}>
                        {message.text.includes('selesai') && <CheckCircle2 size={13} />}
                        <span>{message.text}</span>
                      </div>
                    ) : (
                      <div className={`admin-thread-msg admin-thread-msg-${message.from}`} key={message.id}>
                        {message.from === 'admin' && (
                          <span className="admin-thread-avatar"><UserRound size={13} /></span>
                        )}
                        <div>
                          <span>{message.from === 'admin' ? 'Admin ReogNime' : 'Pengunjung'} · {formatDate(message.createdAt)}</span>
                          <p>{message.text}</p>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {detail.status === 'resolved' ? (
                  <div className="admin-thread-closed">
                    <CheckCircle2 size={15} />
                    <span>Percakapan sudah ditandai selesai. Buka lagi untuk membalas.</span>
                  </div>
                ) : (
                  <form className="admin-thread-reply" onSubmit={handleReply}>
                    <div className="admin-thread-reply-field">
                      <textarea
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        onKeyDown={handleReplyKeyDown}
                        placeholder="Tulis balasan untuk pengunjung…"
                        rows={3}
                        maxLength={1000}
                        disabled={busy}
                      />
                      <span className="admin-thread-reply-hint">Enter untuk kirim · Shift + Enter untuk baris baru</span>
                    </div>
                    <button type="submit" className="button button-primary" disabled={!reply.trim() || busy}>
                      {busy ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />}
                      Kirim balasan
                    </button>
                  </form>
                )}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
