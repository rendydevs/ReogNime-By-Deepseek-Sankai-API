import { scrypt, timingSafeEqual } from 'node:crypto';

export const ADMIN_USERNAME = 'admin';
const DEFAULT_SALT = 'ab393a474ccdcf6945aeeeedff9bcfa6';
const DEFAULT_HASH = '79d3b50020ced3999ba9b57ea98c100618ac4e3672412b91eb4eba90bd827b24aaa301915369a76352451e5e6eb4b55a1c6affa6115acf5d7bd1762e75eff94c';

function configuredHash() {
  const value = process.env.ADMIN_PASSWORD_HASH;
  if (!value) return { salt: DEFAULT_SALT, hash: DEFAULT_HASH };
  const [salt, hash] = value.split(':');
  if (!salt || !hash || !/^[a-f0-9]+$/i.test(hash)) return { salt: 'invalid', hash: '' };
  return { salt, hash };
}

function derive(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function verifyAdminPassword(password) {
  if (typeof password !== 'string' || password.length > 200) return false;
  const { salt, hash } = configuredHash();
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== 64) return false;
  try {
    const actual = await derive(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function parseBasic(header) {
  if (typeof header !== 'string' || !header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export async function requireAdmin(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const credentials = parseBasic(req.headers.authorization);
  const valid = credentials
    ? (await verifyAdminPassword(credentials.password)) && credentials.username === ADMIN_USERNAME
    : false;
  if (!valid) {
    return res.status(401).json({ error: { code: 'ADMIN_UNAUTHORIZED', message: 'Autentikasi admin diperlukan.' } });
  }
  req.admin = { username: ADMIN_USERNAME };
  return next();
}
