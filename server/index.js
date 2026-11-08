import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '0.0.0.0';

const app = await createApp({
  libraryFile: process.env.LIBRARY_FILE || path.join(ROOT, 'server', 'data', 'library.json'),
  messagesFile: process.env.MESSAGES_FILE || path.join(ROOT, 'server', 'data', 'messages.json'),
});

const server = app.listen(PORT, HOST, () => {
  console.log(`\n  REOGNIME API  →  http://localhost:${PORT}/api/v1`);
  console.log(`  OpenAPI     →  http://localhost:${PORT}/api/v1/openapi.json\n`);
});

function shutdown(signal) {
  console.log(`\n${signal} received — closing server.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
