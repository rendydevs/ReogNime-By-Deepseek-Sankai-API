import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MESSAGE_STATUSES = ['new', 'read', 'resolved'];
const MAX_MESSAGES = 1000;

function defaultState() {
  return { version: 1, messages: [] };
}

function validateMessage(message) {
  if (!message || typeof message !== 'object') throw new Error('Invalid message entry');
  if (typeof message.id !== 'string' || !message.id) throw new Error('Message entry has an invalid id');
  if (!MESSAGE_STATUSES.includes(message.status)) throw new Error(`Message entry has an invalid status: ${message.status}`);
  if (typeof message.message !== 'string') throw new Error('Message entry has invalid text');
  return message;
}

export class MessageStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.state = defaultState();
    this.ready = false;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const messages = Array.isArray(parsed) ? parsed : parsed.messages;
      if (!Array.isArray(messages)) throw new Error('Message file must contain a messages array');
      this.state = { version: 1, messages: messages.map(validateMessage) };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.state = defaultState();
    }
    this.ready = true;
    await this.persist();
    return this;
  }

  all() {
    return this.state.messages;
  }

  list({ status = 'all', limit = 100 } = {}) {
    return this.state.messages
      .filter((message) => status === 'all' || message.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  stats() {
    const counts = { new: 0, read: 0, resolved: 0 };
    for (const message of this.state.messages) {
      if (counts[message.status] !== undefined) counts[message.status] += 1;
    }
    return { ...counts, total: this.state.messages.length };
  }

  async add({ message, page }) {
    const now = new Date().toISOString();
    const entry = {
      id: randomUUID(),
      message: message.trim(),
      page: page || '/',
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
    this.state.messages.unshift(entry);
    if (this.state.messages.length > MAX_MESSAGES) this.state.messages.length = MAX_MESSAGES;
    await this.persist();
    return entry;
  }

  async updateStatus(id, status) {
    const entry = this.state.messages.find((item) => item.id === id);
    if (!entry) return null;
    entry.status = status;
    entry.updatedAt = new Date().toISOString();
    await this.persist();
    return entry;
  }

  async remove(id) {
    const index = this.state.messages.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.state.messages.splice(index, 1);
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
