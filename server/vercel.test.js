import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'test';
const tempDir = await mkdtemp(path.join(tmpdir(), 'reognime-vercel-test-'));
process.env.LIBRARY_FILE = path.join(tempDir, 'library.json');
const { default: handler } = await import('../api/index.js');

let server;
let base;

before(async () => {
  server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(tempDir, { recursive: true, force: true });
});

test('Vercel adapter serves deep and normalized API paths', async () => {
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);

  // Vercel appends the named rewrite capture as ?path=; the adapter must strip it.
  const home = await fetch(`${base}/api/v1/home?path=v1%2Fhome`);
  assert.equal(home.status, 200);
  assert.equal((await home.json()).data.stats.titles, 45);

  // Defensive normalization when a host gives the function a path without /api.
  const normalized = await fetch(`${base}/health`);
  assert.equal(normalized.status, 200);
});
