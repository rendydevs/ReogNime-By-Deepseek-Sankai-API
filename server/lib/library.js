import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const LIBRARY_STATUSES = ['WATCHING', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'DROPPED'];

function defaultState() {
  return { version: 1, entries: [] };
}

function validateEntryShape(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('Invalid library entry');
  if (!Number.isInteger(entry.animeId)) throw new Error('Library entry has an invalid animeId');
  if (!LIBRARY_STATUSES.includes(entry.status)) throw new Error(`Library entry has an invalid status: ${entry.status}`);
  return entry;
}

export class LibraryStore {
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
      const entries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(entries)) throw new Error('Library file must contain an entries array');
      this.state = { version: 1, entries: entries.map(validateEntryShape) };
      this.ready = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.state = defaultState();
      await this.persist();
      this.ready = true;
    }
    return this;
  }

  all() {
    return this.state.entries;
  }

  get(animeId) {
    return this.state.entries.find((entry) => entry.animeId === Number(animeId)) ?? null;
  }

  async create(entry) {
    if (this.get(entry.animeId)) {
      const error = new Error('This title is already in your library.');
      error.code = 'ALREADY_EXISTS';
      throw error;
    }
    this.state.entries.push(entry);
    await this.persist();
    return entry;
  }

  async update(animeId, patch) {
    const index = this.state.entries.findIndex((entry) => entry.animeId === Number(animeId));
    if (index === -1) return null;
    const next = { ...this.state.entries[index], ...patch, animeId: Number(animeId), updatedAt: new Date().toISOString() };
    this.state.entries[index] = next;
    await this.persist();
    return next;
  }

  async remove(animeId) {
    const index = this.state.entries.findIndex((entry) => entry.animeId === Number(animeId));
    if (index === -1) return false;
    this.state.entries.splice(index, 1);
    await this.persist();
    return true;
  }

  async persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      const tempFile = `${this.filePath}.tmp`;
      await writeFile(tempFile, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8');
      await rename(tempFile, this.filePath);
    });
    return this.writeQueue;
  }
}
