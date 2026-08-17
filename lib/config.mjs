import crypto from 'node:crypto';
import path from 'node:path';

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function integer(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const port = integer(process.env.PORT, 3000);
const host = process.env.HOST || '0.0.0.0';
const siteOrigin = (process.env.SITE_ORIGIN || `http://localhost:${port}`).replace(/\/$/, '');

let sessionSecret = process.env.SESSION_SECRET || '';
let dataEncryptionKey = process.env.DATA_ENCRYPTION_KEY || '';
let hashSecret = process.env.HASH_SECRET || '';

if (!isProduction) {
  sessionSecret ||= 'development-session-secret-change-before-production';
  hashSecret ||= 'development-hash-secret-change-before-production';
  dataEncryptionKey ||= crypto.createHash('sha256').update(`${sessionSecret}:encryption`).digest('base64');
}

const required = [];
if (isProduction && sessionSecret.length < 32) required.push('SESSION_SECRET');
if (isProduction && hashSecret.length < 32) required.push('HASH_SECRET');
if (isProduction && !dataEncryptionKey) required.push('DATA_ENCRYPTION_KEY');
if (isProduction && !process.env.ADMIN_PASSWORD_HASH) required.push('ADMIN_PASSWORD_HASH');
if (required.length) {
  throw new Error(`Missing or weak production configuration: ${required.join(', ')}. See .env.example.`);
}

let encryptionBuffer;
try {
  encryptionBuffer = Buffer.from(dataEncryptionKey, 'base64');
} catch {
  encryptionBuffer = Buffer.alloc(0);
}
if (encryptionBuffer.length !== 32) {
  throw new Error('DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key. Run npm run generate-secrets.');
}

export const config = Object.freeze({
  nodeEnv,
  isProduction,
  port,
  host,
  siteOrigin,
  databasePath: path.resolve(process.env.DATABASE_PATH || './data/backyardconnect.sqlite'),
  trustProxy: bool(process.env.TRUST_PROXY, false),
  sessionSecret,
  dataEncryptionKey: encryptionBuffer,
  hashSecret,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  adminSessionHours: integer(process.env.ADMIN_SESSION_HOURS, 8),
  contactEmail: process.env.PUBLIC_CONTACT_EMAIL || 'connect@backyardconnect.co.za',
  contactPhone: process.env.PUBLIC_CONTACT_PHONE || '',
  whatsappNumber: process.env.PUBLIC_WHATSAPP_NUMBER || '',
  businessHours: process.env.PUBLIC_BUSINESS_HOURS || 'Monday to Friday, 08:00 - 17:00',
  referralWebhookUrl: process.env.REFERRAL_WEBHOOK_URL || '',
  referralWebhookSecret: process.env.REFERRAL_WEBHOOK_SECRET || '',
  referralRateLimit: integer(process.env.REFERRAL_RATE_LIMIT, 8),
  referralRateWindowMinutes: integer(process.env.REFERRAL_RATE_WINDOW_MINUTES, 60),
  sessionRetentionDays: integer(process.env.SESSION_RETENTION_DAYS, 7),
  auditRetentionDays: integer(process.env.AUDIT_RETENTION_DAYS, 2190),
});
