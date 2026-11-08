import { ArrowRight, Bot, CheckCircle2, MessageCircle, Send, ShieldCheck, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { API_BASE } from '../lib/api';

type Sender = 'bot' | 'admin' | 'user';
type ThreadStatus = 'open' | 'resolved';
type ThreadFrom = 'visitor' | 'admin' | 'system';

interface ChatMessage {
  id: number;
  from: Sender;
  text: string;
}

interface BotReply {
  text: string;
  escalate: boolean;
}

interface ThreadMessage {
  id: string;
  from: ThreadFrom;
  text: string;
  createdAt: string;
}

interface ServerThread {
  id: string;
  status: ThreadStatus;
  page: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages: ThreadMessage[];
}

interface CachedThread extends ServerThread {
  token: string;
  lastSeenAt: string;
  resolvedSeen: boolean;
}

const STORAGE_KEY = 'reognime-chat-thread-v1';
const OPEN_TTL = 7 * 24 * 60 * 60 * 1000;
const RESOLVED_TTL = 3 * 24 * 60 * 60 * 1000;
const POLL_MS = 15_000;
const RESOLVED_CLEAR_MS = 3 * 60 * 1000;
const GREETING = 'Hai, aku NimeBot. Pilih topik cepat di bawah untuk jawaban singkat, atau tulis pesan dan langsung aku teruskan ke Admin ReogNime.';
const CONNECT_TEXT = 'Halo admin, saya ingin terhubung dan menyampaikan keluhan.';
const ESCALATION = 'Baik pesan anda dikirim ke admin mohon tunggu ya.';

const QUICK_PROMPTS = [
  { label: 'Cara nonton', prompt: 'Bagaimana cara nonton anime?' },
  { label: 'My List', prompt: 'Apa itu fitur My List?' },
  { label: 'Jadwal', prompt: 'Di mana saya bisa melihat jadwal anime?' },
];

const BOT_ID = 1;
let localId = 2;

function replyFor(raw: string): BotReply {
  const text = raw.toLowerCase();
  if (/^(halo|hai|hi|hello|pagi|siang|malam|sore)\b/.test(text)) {
    return { text: 'Hai juga! Aku NimeBot. Mau cari anime, cek jadwal, atau menyimpan judul ke My List?', escalate: false };
  }
  if (/admin|manusia|lapor|masalah|error|rusak|gak bisa|tidak bisa|kendala|bantuan|bantu|request|saran|hubungi|keluhan/.test(text)) {
    return { text: ESCALATION, escalate: true };
  }
  if (/my\s*list|mylist|simpan|favorite|favourite|favorit|daftar/.test(text)) {
    return { text: 'Buka halaman anime, lalu tekan "Add to my list". Kamu bisa menyimpan status, progres episode, skor, catatan, dan favorit. Semua tersimpan di perangkatmu.', escalate: false };
  }
  if (/jadwal|schedule|rilis|hari apa/.test(text)) {
    return { text: 'Buka menu Schedule untuk melihat jadwal tujuh hari. Hari ini ditandai, jadi kamu bisa langsung cek rilisan terdekat.', escalate: false };
  }
  if (/genre|kategori|mood/.test(text)) {
    return { text: 'Buka menu Genres. Ada 36 kategori, dari Action sampai Vampire, untuk menemukan tontonan sesuai mood-mu.', escalate: false };
  }
  if (/mirror|vidhide|mega|filelions|filedon|player|putar|loading/.test(text)) {
    return { text: 'Mirror default-nya VidHide supaya ramah mobile. Kalau tidak bisa diputar, pilih FileLions atau Filedon di daftar mirror. Mega tetap tersedia sebagai pilihan manual.', escalate: false };
  }
  if (/cara nonton|nonton|streaming|episode/.test(text)) {
    return { text: 'Pilih anime dari Home atau Ongoing, buka halaman seri, lalu pilih episode. Setelah itu pilih mirror yang tersedia dan tekan play.', escalate: false };
  }
  if (/ongoing|completed|tamat|selesai|rilisan/.test(text)) {
    return { text: 'Ongoing berisi anime yang masih berjalan, sedangkan Completed sudah tamat. Keduanya bisa dibuka dari menu utama.', escalate: false };
  }
  if (/makasih|terima kasih|thanks|thank you/.test(text)) {
    return { text: 'Sama-sama! Kalau ada pertanyaan lain, tulis saja di sini.', escalate: false };
  }
  return { text: ESCALATION, escalate: true };
}

function readCachedThread(): CachedThread | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedThread;
    if (!parsed?.id || !parsed?.token || !Array.isArray(parsed.messages) || !parsed.status) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const updated = new Date(parsed.updatedAt || parsed.createdAt).getTime();
    const resolved = parsed.status === 'resolved' ? new Date(parsed.resolvedAt || parsed.updatedAt).getTime() : null;
    const age = Date.now() - updated;
    if (!Number.isFinite(age) || age > OPEN_TTL || (resolved !== null && Date.now() - resolved > RESOLVED_TTL)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedThread(thread: CachedThread | null) {
  try {
    if (!thread) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(thread));
  } catch {
    // Private mode/full storage: keep the in-memory conversation.
  }
}

async function createThread(message: string): Promise<{ thread: ServerThread; token: string }> {
  const response = await fetch(`${API_BASE}/chat/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ message, page: `${window.location.pathname}${window.location.search}` }),
  });
  if (!response.ok) throw new Error('Tidak bisa menghubungkan ke admin.');
  const payload = await response.json();
  return payload.data;
}

async function fetchThread(thread: CachedThread): Promise<ServerThread | null> {
  const response = await fetch(`${API_BASE}/chat/threads/${encodeURIComponent(thread.id)}`, {
    headers: { Accept: 'application/json', 'X-Thread-Token': thread.token },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload.data;
}

async function sendThreadMessage(thread: CachedThread, message: string): Promise<ServerThread> {
  const response = await fetch(`${API_BASE}/chat/threads/${encodeURIComponent(thread.id)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Thread-Token': thread.token },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error('Pesan belum terkirim ke admin.');
  const payload = await response.json();
  return payload.data;
}

function withLocalMeta(remote: ServerThread, previous: CachedThread): CachedThread {
  return {
    ...remote,
    token: previous.token,
    lastSeenAt: previous.lastSeenAt,
    resolvedSeen: previous.resolvedSeen,
  };
}

function latestMessageAt(thread: CachedThread | null) {
  return thread?.messages.at(-1)?.createdAt ?? thread?.updatedAt ?? '';
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(true);
  const [thread, setThread] = useState<CachedThread | null>(readCachedThread);
  const [botMessages, setBotMessages] = useState<ChatMessage[]>([{ id: BOT_ID, from: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState<Sender | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);

  openRef.current = open;

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
  }, []);

  const openChat = () => {
    setClosing(false);
    setOpen(true);
    setHasOpened(true);
    setNudgeVisible(false);
    setThread((current) => {
      if (!current) return current;
      return {
        ...current,
        lastSeenAt: new Date().toISOString(),
        resolvedSeen: current.status === 'resolved' ? true : current.resolvedSeen,
      };
    });
  };

  const closeChat = useCallback(() => {
    if (closing) return;
    setClosing(true);
    later(() => {
      setOpen(false);
      setClosing(false);
      setAdminOpen(false);
    }, 170);
  }, [closing, later]);

  const resetToBot = useCallback((showNudge: boolean) => {
    setThread(null);
    setBotMessages([{ id: BOT_ID, from: 'bot', text: GREETING }]);
    setInput('');
    setTyping(null);
    setSyncError(null);
    setConnecting(false);
    setSending(false);
    setAdminOpen(false);
    setHasOpened(!showNudge);
    setNudgeVisible(showNudge);
  }, []);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  useEffect(() => {
    writeCachedThread(thread);
  }, [thread]);

  useEffect(() => {
    if (!thread || thread.status !== 'resolved') return;
    // Once resolved, leave the notice available for a few minutes, then clear
    // the browser cache and return to the normal bot + "Hubungkan ke admin" view.
    const cleanup = window.setTimeout(() => resetToBot(true), RESOLVED_CLEAR_MS);
    return () => window.clearTimeout(cleanup);
  }, [thread?.id, thread?.status, resetToBot]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', onKeyDown);
    later(() => inputRef.current?.focus(), 240);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeChat, later]);

  useEffect(() => {
    if (!open) return;
    const element = listRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [botMessages, thread?.messages.length, thread?.status, typing, open, adminOpen]);

  useEffect(() => {
    if (!thread) return;
    let active = true;
    const poll = async () => {
      if (document.visibilityState === 'hidden') return;
      const remote = await fetchThread(thread);
      if (!active || !remote) return;
      setThread((current) => {
        if (!current || current.id !== remote.id) return current;
        const next = withLocalMeta(remote, current);
        if (openRef.current) {
          next.lastSeenAt = new Date().toISOString();
          if (next.status === 'resolved') next.resolvedSeen = true;
        }
        return next;
      });
      setSyncError(null);
    };
    void poll();
    const interval = window.setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [thread?.id, thread?.token]);

  useEffect(() => {
    if (!open || !thread) return;
    if (thread.status === 'resolved' && !thread.resolvedSeen) {
      setThread((current) => (current ? { ...current, lastSeenAt: new Date().toISOString(), resolvedSeen: true } : current));
      return;
    }
    const latest = latestMessageAt(thread);
    if (latest && latest > thread.lastSeenAt) {
      setThread((current) => (current ? { ...current, lastSeenAt: new Date().toISOString() } : current));
    }
  }, [open, thread?.status, thread?.messages.length, thread?.lastSeenAt, thread?.resolvedSeen, thread]);

  const unreadCount = thread
    ? thread.messages.filter((message) => message.from === 'admin' && message.createdAt > thread.lastSeenAt).length
    : 0;
  const resolvedNotice = Boolean(thread && thread.status === 'resolved' && !thread.resolvedSeen);
  const defaultNudge = !thread && !hasOpened;
  const notification = resolvedNotice
    ? { title: 'Pesan selesai', body: 'Pesan Anda telah ditandai selesai oleh admin.' }
    : unreadCount > 0
      ? { title: 'Balasan baru dari admin', body: 'Buka chat untuk membaca pesan.' }
      : defaultNudge
        ? { title: 'Ada keluhan?', body: 'Chat di sini, kami bantu.' }
        : null;
  const badgeCount = resolvedNotice ? 1 : unreadCount + (defaultNudge ? 1 : 0);

  useEffect(() => {
    if (!notification) {
      setNudgeVisible(false);
      return;
    }
    setNudgeVisible(true);
    if (notification.title === 'Pesan selesai') return;
    const timer = window.setTimeout(() => setNudgeVisible(false), 12_000);
    return () => window.clearTimeout(timer);
  }, [notification?.title, notification?.body]);

  const addBotMessage = (from: Sender, text: string) => {
    setBotMessages((current) => [...current, { id: localId++, from, text }]);
  };

  const startNewConversation = () => {
    resetToBot(false);
  };

  const connectToAdmin = async (seed: string) => {
    if (connecting || thread?.status === 'open') return;
    const message = seed.trim() || CONNECT_TEXT;
    setConnecting(true);
    setSyncError(null);
    try {
      const result = await createThread(message);
      const next: CachedThread = {
        ...result.thread,
        token: result.token,
        lastSeenAt: new Date().toISOString(),
        resolvedSeen: false,
      };
      setThread(next);
      setInput('');
      setHasOpened(true);
      setNudgeVisible(false);
      setTyping(null);
    } catch (reason) {
      setSyncError(reason instanceof Error ? reason.message : 'Tidak bisa menghubungkan ke admin.');
    } finally {
      setConnecting(false);
    }
  };

  const sendToThread = async (message: string) => {
    if (!thread || thread.status === 'resolved' || sending) return;
    setSending(true);
    setSyncError(null);
    try {
      const remote = await sendThreadMessage(thread, message);
      setThread((current) => (current ? { ...withLocalMeta(remote, current), lastSeenAt: new Date().toISOString() } : current));
      setInput('');
    } catch (reason) {
      setSyncError(reason instanceof Error ? reason.message : 'Pesan belum terkirim.');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = (value: string) => {
    const text = value.trim();
    if (!text) return;
    if (thread) {
      void sendToThread(text);
      return;
    }
    addBotMessage('user', text);
    setInput('');
    // Free-form messages go straight to a human. The bot only answers the
    // explicit quick topics above, so a complaint cannot collide with FAQ keywords.
    void connectToAdmin(text);
  };

  const askBot = (value: string) => {
    const text = value.trim();
    if (!text || thread) return;
    addBotMessage('user', text);
    setInput('');
    const reply = replyFor(text);
    if (reply.escalate) {
      void connectToAdmin(text);
      return;
    }
    setTyping('bot');
    later(() => {
      addBotMessage('bot', reply.text);
      setTyping(null);
    }, 560);
  };

  const handleConnect = () => {
    void connectToAdmin(input.trim() || CONNECT_TEXT);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!thread && connecting) return;
    sendMessage(input);
  };

  const hasUserBotMessage = botMessages.some((message) => message.from === 'user');
  const threadResolved = thread?.status === 'resolved';

  return (
    <div className="chat-widget">
      {!open && nudgeVisible && notification && (
        <aside className="chat-nudge" role="status">
          <span className="chat-nudge-icon" aria-hidden="true"><MessageCircle size={17} strokeWidth={1.8} /></span>
          <div>
            <strong>{notification.title}</strong>
            <span>{notification.body}</span>
          </div>
          <button type="button" onClick={() => setNudgeVisible(false)} aria-label="Tutup notifikasi chat">
            <X size={13} strokeWidth={1.8} />
          </button>
        </aside>
      )}

      {open && (
        <section className={`chat-panel ${closing ? 'is-closing' : ''}`} role="dialog" aria-label="Chat dengan NimeBot dan Admin ReogNime">
          <header className="chat-header">
            <div className="chat-bot-profile">
              <span className={`chat-avatar ${thread ? 'chat-avatar-admin' : 'chat-avatar-bot'}`} aria-hidden="true">
                {thread ? <UserRound size={19} strokeWidth={1.8} /> : <Bot size={19} strokeWidth={1.8} />}
              </span>
              <span className="chat-profile-copy">
                <strong>{thread ? 'Admin ReogNime' : 'NimeBot'}</strong>
                <small>
                  {thread
                    ? (threadResolved ? 'Percakapan selesai' : 'Admin terhubung')
                    : typing === 'bot' ? 'sedang mengetik…' : 'Bot · topik cepat'}
                </small>
              </span>
            </div>
            <button
              type="button"
              className={`chat-admin-trigger ${adminOpen ? 'is-open' : ''}`}
              onClick={() => setAdminOpen((value) => !value)}
              aria-expanded={adminOpen}
              aria-label="Lihat profil Admin ReogNime"
            >
              <span className="chat-avatar chat-avatar-admin" aria-hidden="true"><UserRound size={15} strokeWidth={1.8} /></span>
              <span>Admin</span>
            </button>
            <button type="button" className="chat-close" onClick={closeChat} aria-label="Tutup chat">
              <X size={17} strokeWidth={1.8} />
            </button>
          </header>

          {adminOpen && (
            <div className="chat-admin-card">
              <span className="chat-avatar chat-avatar-admin chat-avatar-large" aria-hidden="true"><UserRound size={20} strokeWidth={1.7} /></span>
              <div>
                <strong>Admin ReogNime</strong>
                <span>Admin · biasanya online 09.00–22.00</span>
                <p>Balasan admin akan muncul di percakapan ini. Percakapan tersimpan di browser selama beberapa hari.</p>
              </div>
            </div>
          )}

          <div className="chat-messages" ref={listRef} aria-live="polite">
            <div className="chat-day">Hari ini</div>
            {thread ? (
              <>
                {thread.messages.map((message) => (
                  message.from === 'system' ? (
                    <div className="chat-system" key={message.id}>
                      {message.from === 'system' && message.text.includes('selesai') && <CheckCircle2 size={13} />}
                      <span>{message.text}</span>
                    </div>
                  ) : (
                    <div className={`chat-message chat-message-${message.from === 'admin' ? 'admin' : 'user'}`} key={message.id}>
                      {message.from === 'admin' && (
                        <span className="chat-avatar chat-avatar-admin chat-msg-avatar" aria-hidden="true"><UserRound size={13} strokeWidth={1.8} /></span>
                      )}
                      <div className="chat-message-copy">
                        {message.from === 'admin' && <span className="chat-sender">Admin ReogNime</span>}
                        <div className="chat-bubble">{message.text}</div>
                      </div>
                    </div>
                  )
                ))}
                {resolvedNotice && (
                  <div className="chat-resolved-banner">
                    <CheckCircle2 size={15} />
                    <span>Pesan ini ditandai selesai oleh admin.</span>
                  </div>
                )}
                {syncError && <p className="chat-sync-error">{syncError}</p>}
              </>
            ) : (
              <>
                {botMessages.map((message) => (
                  <div key={message.id} className={`chat-message chat-message-${message.from === 'user' ? 'user' : message.from}`}>
                    {message.from !== 'user' && (
                      <span className={`chat-avatar chat-msg-avatar ${message.from === 'admin' ? 'chat-avatar-admin' : 'chat-avatar-bot'}`} aria-hidden="true">
                        {message.from === 'admin' ? <UserRound size={13} strokeWidth={1.8} /> : <Bot size={13} strokeWidth={1.8} />}
                      </span>
                    )}
                    <div className="chat-message-copy">
                      {message.from !== 'user' && <span className="chat-sender">NimeBot</span>}
                      <div className="chat-bubble">{message.text}</div>
                    </div>
                  </div>
                ))}
                {typing === 'bot' && (
                  <div className="chat-message chat-message-bot">
                    <span className="chat-avatar chat-avatar-bot chat-msg-avatar" aria-hidden="true"><Bot size={13} strokeWidth={1.8} /></span>
                    <div className="chat-message-copy">
                      <span className="chat-sender">NimeBot</span>
                      <div className="chat-bubble chat-typing" aria-label="sedang mengetik"><i /><i /><i /></div>
                    </div>
                  </div>
                )}
                {syncError && <p className="chat-sync-error">{syncError}</p>}
              </>
            )}
          </div>

          {!thread && !hasUserBotMessage && !typing && (
            <div className="chat-quick">
              {QUICK_PROMPTS.map((item) => (
                <button key={item.label} type="button" onClick={() => askBot(item.prompt)}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {!thread && (
            <div className="chat-connect">
              <div>
                <ShieldCheck size={15} />
                <span>
                  <strong>Butuh admin?</strong>
                  <small>Hubungkan percakapan ini ke Admin ReogNime.</small>
                </span>
              </div>
              <button type="button" onClick={handleConnect} disabled={connecting}>
                {connecting ? 'Menghubungkan…' : 'Hubungkan ke admin'} <ArrowRight size={13} />
              </button>
            </div>
          )}

          {threadResolved && (
            <div className="chat-resolved-bar">
              <span><CheckCircle2 size={14} /> Ditandai selesai oleh admin.</span>
              <button type="button" onClick={startNewConversation}>Mulai chat baru</button>
            </div>
          )}

          <form className="chat-compose" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={threadResolved ? 'Percakapan ini sudah selesai.' : thread ? 'Tulis balasan untuk admin…' : 'Tulis pesan…'}
              aria-label={thread ? 'Tulis pesan untuk admin' : 'Tulis pesan untuk NimeBot'}
              maxLength={500}
              autoComplete="off"
              disabled={threadResolved || connecting}
            />
            <button type="submit" className="chat-send" disabled={!input.trim() || threadResolved || sending} aria-label="Kirim pesan">
              {sending ? <span className="chat-send-dot" /> : <Send size={16} strokeWidth={1.8} />}
            </button>
          </form>
          <p className="chat-footnote">
            {thread ? 'Percakapan tersimpan di browser · admin dapat membalas' : 'Bot otomatis · keluhan bisa dihubungkan ke admin'}
          </p>
        </section>
      )}

      <button
        type="button"
        className={`chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => (open ? closeChat() : openChat())}
        aria-label={open ? 'Tutup chat' : 'Buka chat bantuan dan keluhan'}
        title="Chat bantuan & keluhan"
        aria-expanded={open}
      >
        {open ? <X size={21} strokeWidth={1.7} /> : <MessageCircle size={22} strokeWidth={1.7} />}
        {!open && badgeCount > 0 && <span className="chat-fab-badge">{badgeCount > 9 ? '9+' : badgeCount}</span>}
      </button>
    </div>
  );
}
