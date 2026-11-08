import { Bot, MessageCircle, Send, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { API_BASE } from '../lib/api';

type Sender = 'bot' | 'admin' | 'user';

interface ChatMessage {
  id: number;
  from: Sender;
  text: string;
}

interface BotReply {
  text: string;
  escalate: boolean;
}

const GREETING = 'Hai, aku NimeBot. Mau tanya soal anime, jadwal, atau My List? Kalau butuh bantuan lain, kirim pesan ke admin ya.';
const ESCALATION = 'Baik pesan anda dikirim ke admin mohon tunggu ya.';
const ADMIN_REPLY = 'Pesan Anda sudah masuk ke antrean admin. Admin akan membalas secepatnya.';
const DELIVERY_FAILED = 'Maaf, pesan belum terkirim. Coba lagi sebentar lagi ya.';

const QUICK_PROMPTS = [
  { label: 'Cara nonton', prompt: 'Bagaimana cara nonton anime?' },
  { label: 'My List', prompt: 'Apa itu fitur My List?' },
  { label: 'Jadwal', prompt: 'Di mana saya bisa melihat jadwal anime?' },
  { label: 'Hubungi admin', prompt: 'Saya ingin menghubungi admin.' },
];

function replyFor(raw: string): BotReply {
  const text = raw.toLowerCase();

  if (/^(halo|hai|hi|hello|pagi|siang|malam|sore)\b/.test(text)) {
    return { text: 'Hai juga! Aku NimeBot. Mau cari anime, cek jadwal, atau menyimpan judul ke My List?', escalate: false };
  }
  if (/admin|manusia|lapor|masalah|error|rusak|gak bisa|tidak bisa|kendala|bantuan|bantu|request|saran|hubungi/.test(text)) {
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

async function submitToAdmin(message: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message, page: `${window.location.pathname}${window.location.search}` }),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, from: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState<Sender | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(true);
  const idRef = useRef(2);
  const timers = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
  }, []);

  const openChat = () => {
    setClosing(false);
    setOpen(true);
    setHasOpened(true);
    setNudgeVisible(false);
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

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    const nudgeTimer = window.setTimeout(() => setNudgeVisible(false), 12_000);
    return () => window.clearTimeout(nudgeTimer);
  }, []);

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
  }, [messages, typing, open, adminOpen]);

  const addMessage = (from: Sender, text: string) => {
    setMessages((current) => [...current, { id: idRef.current++, from, text }]);
  };

  const sendMessage = (value: string) => {
    const text = value.trim();
    if (!text) return;
    addMessage('user', text);
    setInput('');
    setTyping('bot');

    const reply = replyFor(text);
    const delivery = reply.escalate ? submitToAdmin(text) : Promise.resolve(true);
    later(async () => {
      const delivered = await delivery;
      if (reply.escalate && !delivered) {
        addMessage('bot', DELIVERY_FAILED);
        setTyping(null);
        return;
      }
      addMessage('bot', reply.text);
      if (!reply.escalate) {
        setTyping(null);
        return;
      }
      setTyping('admin');
      later(() => {
        addMessage('admin', ADMIN_REPLY);
        setTyping(null);
      }, 750);
    }, 620);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const hasUserMessage = messages.some((message) => message.from === 'user');

  return (
    <div className="chat-widget">
      {!open && !hasOpened && nudgeVisible && (
        <aside className="chat-nudge" role="status">
          <span className="chat-nudge-icon" aria-hidden="true"><MessageCircle size={17} strokeWidth={1.8} /></span>
          <div>
            <strong>Ada keluhan?</strong>
            <span>Chat di sini, kami bantu.</span>
          </div>
          <button type="button" onClick={() => setNudgeVisible(false)} aria-label="Tutup notifikasi chat">
            <X size={13} strokeWidth={1.8} />
          </button>
        </aside>
      )}
      {open && (
        <section
          className={`chat-panel ${closing ? 'is-closing' : ''}`}
          role="dialog"
          aria-label="Chat dengan NimeBot dan Admin ReogNime"
        >
          <header className="chat-header">
            <div className="chat-bot-profile">
              <span className="chat-avatar chat-avatar-bot" aria-hidden="true"><Bot size={19} strokeWidth={1.8} /></span>
              <span className="chat-profile-copy">
                <strong>NimeBot</strong>
                <small>{typing === 'bot' ? 'sedang mengetik…' : 'Bot · online'}</small>
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
                <p>Pesan yang diteruskan NimeBot akan masuk ke antrean admin.</p>
              </div>
            </div>
          )}

          <div className="chat-messages" ref={listRef} aria-live="polite">
            <div className="chat-day">Hari ini</div>
            {messages.map((message) => (
              <div key={message.id} className={`chat-message chat-message-${message.from}`}>
                {message.from !== 'user' && (
                  <span className={`chat-avatar chat-msg-avatar ${message.from === 'admin' ? 'chat-avatar-admin' : 'chat-avatar-bot'}`} aria-hidden="true">
                    {message.from === 'admin' ? <UserRound size={13} strokeWidth={1.8} /> : <Bot size={13} strokeWidth={1.8} />}
                  </span>
                )}
                <div className="chat-message-copy">
                  {message.from !== 'user' && <span className="chat-sender">{message.from === 'admin' ? 'Admin ReogNime' : 'NimeBot'}</span>}
                  <div className="chat-bubble">{message.text}</div>
                </div>
              </div>
            ))}
            {typing && (
              <div className={`chat-message chat-message-${typing}`}>
                <span className={`chat-avatar chat-msg-avatar ${typing === 'admin' ? 'chat-avatar-admin' : 'chat-avatar-bot'}`} aria-hidden="true">
                  {typing === 'admin' ? <UserRound size={13} strokeWidth={1.8} /> : <Bot size={13} strokeWidth={1.8} />}
                </span>
                <div className="chat-message-copy">
                  <span className="chat-sender">{typing === 'admin' ? 'Admin ReogNime' : 'NimeBot'}</span>
                  <div className="chat-bubble chat-typing" aria-label="sedang mengetik">
                    <i /><i /><i />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!hasUserMessage && !typing && (
            <div className="chat-quick">
              {QUICK_PROMPTS.map((item) => (
                <button key={item.label} type="button" onClick={() => sendMessage(item.prompt)}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <form className="chat-compose" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tulis pesan…"
              aria-label="Tulis pesan untuk NimeBot"
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" className="chat-send" disabled={!input.trim()} aria-label="Kirim pesan">
              <Send size={16} strokeWidth={1.8} />
            </button>
          </form>
          <p className="chat-footnote">Bot otomatis · pesan bisa diteruskan ke admin</p>
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
        {!open && !hasOpened && <span className="chat-fab-badge">1</span>}
      </button>
    </div>
  );
}
