import crypto from 'node:crypto';
import { config } from './config.mjs';

export function encrypt(value) {
  const text = String(value ?? '');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.dataEncryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decrypt(payload) {
  if (!payload) return '';
  const [version, ivText, tagText, cipherText] = String(payload).split('.');
  if (version !== 'v1' || !ivText || !tagText || cipherText == null) throw new Error('Unsupported encrypted value.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.dataEncryptionKey, Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(cipherText, 'base64url')), decipher.final()]).toString('utf8');
}

export function blindHash(value) {
  return crypto.createHmac('sha256', config.hashSecret).update(String(value)).digest('hex');
}

export function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashPassword(password, iterations = 310_000) {
  const salt = crypto.randomBytes(16);
  const result = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2$${iterations}$${salt.toString('base64url')}$${result.toString('base64url')}`;
}

export function verifyPassword(password, encoded) {
  try {
    const [algorithm, iterationsText, saltText, hashText] = String(encoded).split('$');
    if (algorithm !== 'pbkdf2') return false;
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.pbkdf2Sync(password, Buffer.from(saltText, 'base64url'), Number(iterationsText), expected.length, 'sha256');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
