import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';

const TMP_LIBRARY = '/tmp/reognime-library.json';
const libraryFile = process.env.LIBRARY_FILE || TMP_LIBRARY;
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

function seedLibrary() {
  if (process.env.LIBRARY_FILE) return Promise.resolve();
  return mkdir(path.dirname(TMP_LIBRARY), { recursive: true })
    .then(() => access(TMP_LIBRARY))
    .catch(async (error) => {
      if (error.code !== 'ENOENT') throw error;
      const seed = fileURLToPath(new URL('../server/data/library.json', import.meta.url));
      await copyFile(seed, TMP_LIBRARY).catch((copyError) => {
        console.warn('Could not seed the demo library:', copyError.message);
      });
    });
}

async function getApp() {
  appPromise ??= (async () => {
    await seedLibrary();
    return createApp({ libraryFile, trustProxy: true });
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
