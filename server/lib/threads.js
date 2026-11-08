import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const THREAD_STATUSES = ['open', 'resolved'];
const MAX_THREADS = 1000;
const ACK_TEXT = 'Baik pesan anda dikirim ke admin mohon tunggu ya.';
const RESOLVED_TEXT = 'Pesan ini ditandai selesai oleh admin.';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function defaultState() {
  return { version: 2, threads: [] };
}

function validateThread(thread) {
  if (!thread || typeof thread !== 'object') throw new Error('Invalid thread entry');
  if (typeof thread.id !== 'string' || !thread.id) throw new Error('Thread has an invalid id');
  if (!THREAD_STATUSES.includes(thread.status)) throw new Error(`Thread has an invalid status: ${thread.status}`);
  if (typeof thread.tokenHash !== 'string' || thread.tokenHash.length !== 64) throw new Error('Thread has an invalid token hash');
  if (!Array.isArray(thread.messages)) throw new Error('Thread has invalid messages');
  return thread;
}

function messageText(text, from) {
  const now = new Date().toISOString();
  return { id: randomUUID(), from, text: text.trim(), createdAt: now };
}

export class ThreadStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.state = defaultState();
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const threads = Array.isArray(parsed) ? parsed : parsed.threads;
      this.state = Array.isArray(threads)
        ? { version: 2, threads: threads.map(validateThread) }
        : defaultState();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.state = defaultState();
    }
    await this.persist();
    return this;
  }

  get(id) {
    return this.state.threads.find((thread) => thread.id === id) ?? null;
  }

  publicView(thread) {
    return {
      id: thread.id,
      status: thread.status,
      page: thread.page,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      resolvedAt: thread.resolvedAt ?? null,
      messages: thread.messages,
    };
  }

  summary(thread) {
    const visible = thread.messages.filter((message) => message.from !== 'system');
    return {
      id: thread.id,
      status: thread.status,
      page: thread.page,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      resolvedAt: thread.resolvedAt ?? null,
      messageCount: visible.length,
      lastMessage: visible.at(-1)?.text ?? '',
      lastFrom: visible.at(-1)?.from ?? 'visitor',
    };
  }

  list({ status = 'all', limit = 100 } = {}) {
    return this.state.threads
      .filter((thread) => status === 'all' || thread.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map((thread) => this.summary(thread));
  }

  stats() {
    return {
      open: this.state.threads.filter((thread) => thread.status === 'open').length,
      resolved: this.state.threads.filter((thread) => thread.status === 'resolved').length,
      total: this.state.threads.length,
    };
  }

  verifyToken(thread, token) {
    if (!thread || typeof token !== 'string' || token.length < 20) return false;
    const expected = Buffer.from(thread.tokenHash, 'hex');
    const actual = Buffer.from(hashToken(token), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  async create({ message, page }) {
    const token = randomBytes(32).toString('base64url');
    const now = new Date().toISOString();
    const thread = {
      id: randomUUID(),
      tokenHash: hashToken(token),
      status: 'open',
      page: page || '/',
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      messages: [messageText(message, 'visitor'), messageText(ACK_TEXT, 'system')],
    };
    this.state.threads.unshift(thread);
    if (this.state.threads.length > MAX_THREADS) this.state.threads.length = MAX_THREADS;
    await this.persist();
    return { thread, token };
  }

  async addVisitorMessage(id, text) {
    const thread = this.get(id);
    if (!thread) return null;
    if (thread.status === 'resolved') return { error: 'RESOLVED' };
    thread.messages.push(messageText(text, 'visitor'));
    thread.updatedAt = new Date().toISOString();
    await this.persist();
    return { thread };
  }

  async addAdminMessage(id, text) {
    const thread = this.get(id);
    if (!thread) return null;
    if (thread.status === 'resolved') {
      thread.status = 'open';
      thread.resolvedAt = null;
    }
    thread.messages.push(messageText(text, 'admin'));
    thread.updatedAt = new Date().toISOString();
    await this.persist();
    return thread;
  }

  async setStatus(id, status) {
    const thread = this.get(id);
    if (!thread) return null;
    if (thread.status !== status) {
      thread.status = status;
      thread.updatedAt = new Date().toISOString();
      thread.resolvedAt = status === 'resolved' ? thread.updatedAt : null;
      thread.messages.push(
        messageText(status === 'resolved' ? RESOLVED_TEXT : 'Percakapan dibuka kembali oleh admin.', 'system'),
      );
      await this.persist();
    }
    return thread;
  }

  async remove(id) {
    const index = this.state.threads.findIndex((thread) => thread.id === id);
    if (index === -1) return false;
    this.state.threads.splice(index, 1);
    await this.persist();
    return true;
  }

  async persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      const temporary = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(temporary, `${JSON.stringify(this.state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.filePath);
    });
    return this.writeQueue;
  }
}
