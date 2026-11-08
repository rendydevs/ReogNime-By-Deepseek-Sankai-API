import { access, copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';

const TMP_LIBRARY = '/tmp/reognime-library.json';
const TMP_LIBRARY_SEED_MARKER = '/tmp/reognime-library-empty-v2';
const EMPTY_LIBRARY = `${JSON.stringify({ version: 1, entries: [] }, null, 2)}\n`;
const TMP_MESSAGES = '/tmp/reognime-messages.json';
const libraryFile = process.env.LIBRARY_FILE || TMP_LIBRARY;
const messagesFile = process.env.MESSAGES_FILE || TMP_MESSAGES;
let appPromise;

function normalizeRequestUrl(req) {
  const url = new URL(req.url, 'http://reognime.local');
  const vercelPath = url.searchParams.get('path');
  if (vercelPath) {
    // Vercel appends a named rewrite capture as ?path=; keep Express on real paths.
    url.searchParams.delete('path');
    if (url.pathname === '/api') url.pathname = `/api/${vercelPath.replace(/^\/+/, '')}`;
  }
  if (!url.pathname.startsWith('/api')) url.pathname = `/api${url.pathname}`;
  req.url = `${url.pathname}${url.search}`;
}

async function seedLibrary() {
  if (process.env.LIBRARY_FILE) return Promise.resolve();
  await mkdir(path.dirname(TMP_LIBRARY), { recursive: true });
  try {
    await access(TMP_LIBRARY_SEED_MARKER);
    return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  // The public demo starts with an empty personal library. This one-time marker
  // also clears the old six-entry demo file left in /tmp by earlier deployments.
  await writeFile(TMP_LIBRARY, EMPTY_LIBRARY, 'utf8').catch((error) => {
    console.warn('Could not reset the demo library:', error.message);
  });
  await writeFile(TMP_LIBRARY_SEED_MARKER, new Date().toISOString(), 'utf8').catch((error) => {
    console.warn('Could not write the library seed marker:', error.message);
  });
}

function seedMessages() {
  if (process.env.MESSAGES_FILE) return Promise.resolve();
  return mkdir(path.dirname(TMP_MESSAGES), { recursive: true })
    .then(() => access(TMP_MESSAGES))
    .catch(async (error) => {
      if (error.code !== 'ENOENT') throw error;
      const seed = fileURLToPath(new URL('../server/data/messages.json', import.meta.url));
      await copyFile(seed, TMP_MESSAGES).catch((copyError) => {
        console.warn('Could not seed the message queue:', copyError.message);
      });
    });
}

async function getApp() {
  appPromise ??= (async () => {
    await Promise.all([seedLibrary(), seedMessages()]);
    return createApp({ libraryFile, messagesFile, trustProxy: true });
  })();
  return appPromise;
}

export default async function handler(req, res) {
  try {
    normalizeRequestUrl(req);
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error('ReogNime API failed to start:', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: { code: 'FUNCTION_BOOT_FAILED', message: 'The API could not start.' } }));
  }
}
