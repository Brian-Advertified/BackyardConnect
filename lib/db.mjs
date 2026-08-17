import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.mjs';

mkdirSync(path.dirname(config.databasePath), { recursive: true });
export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA synchronous = NORMAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    legal_name TEXT NOT NULL,
    public_name TEXT NOT NULL,
    logo_path TEXT,
    brand_color TEXT NOT NULL DEFAULT '#E60000',
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tier_speed TEXT NOT NULL,
    monthly_fee_cents INTEGER NOT NULL CHECK(monthly_fee_cents >= 0),
    min_rooms INTEGER NOT NULL CHECK(min_rooms >= 1),
    max_rooms INTEGER NOT NULL CHECK(max_rooms >= min_rooms),
    description TEXT NOT NULL,
    detail TEXT,
    terms_note TEXT,
    is_featured INTEGER NOT NULL DEFAULT 0 CHECK(is_featured IN (0,1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    provider_id TEXT NOT NULL REFERENCES providers(id),
    package_id TEXT REFERENCES packages(id),
    first_name_enc TEXT NOT NULL,
    last_name_enc TEXT NOT NULL,
    mobile_enc TEXT NOT NULL,
    email_enc TEXT,
    property_area_enc TEXT NOT NULL,
    mobile_hash TEXT NOT NULL,
    email_hash TEXT,
    rental_rooms INTEGER NOT NULL CHECK(rental_rooms BETWEEN 1 AND 100),
    consent_at TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'website',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    status TEXT NOT NULL CHECK(status IN ('new','submitted_to_provider','contacted','qualified','converted','not_eligible','closed')),
    provider_reference TEXT,
    commission_status TEXT NOT NULL CHECK(commission_status IN ('pending','approved','paid','reversed','not_applicable')),
    notes_enc TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS referrals_status_created_idx ON referrals(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS referrals_mobile_hash_idx ON referrals(mobile_hash, created_at DESC);
  CREATE INDEX IF NOT EXISTS referrals_provider_idx ON referrals(provider_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS referral_events (
    id TEXT PRIMARY KEY,
    referral_id TEXT NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS referral_events_referral_idx ON referral_events(referral_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    csrf_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS public_rate_limits (
    key_hash TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    window_started_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata_json TEXT,
    ip_hash TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log(created_at DESC);
`);

const providerId = 'provider-vodacom-business';
const now = new Date().toISOString();
const existingProvider = db.prepare('SELECT id FROM providers WHERE slug = ?').get('vodacom-business');
if (!existingProvider) {
  db.prepare(`
    INSERT INTO providers (id, slug, legal_name, public_name, logo_path, brand_color, active, is_public, sort_order, created_at, updated_at)
    VALUES (?, 'vodacom-business', 'Vodacom (Pty) Ltd', 'Vodacom Business', '/voda-1.png', '#E60000', 1, 1, 10, ?, ?)
  `).run(providerId, now, now);
}

const provider = db.prepare('SELECT id FROM providers WHERE slug = ?').get('vodacom-business');
const packageSeeds = [
  {
    id: 'package-vodacom-mobile-broadband', slug: 'vodacom-mobile-broadband', name: 'Mobile Broadband',
    tier: '40GB anytime + 40GB Night Owl', price: 26200, min: 1, max: 3,
    description: 'Plug-and-play connectivity for smaller properties and individual room setups.',
    detail: 'Includes a Mobile Broadband data allocation. MiFi router pricing is confirmed by Vodacom.',
    terms: 'Coverage, eligibility, router pricing and final terms are confirmed by Vodacom.', featured: 0, sort: 10,
  },
  {
    id: 'package-vodacom-fwa-30', slug: 'vodacom-fwa-30', name: 'FWA 30 Mbps',
    tier: '30 Mbps Fixed Wireless', price: 54900, min: 1, max: 5,
    description: 'Reliable shared internet access for a small rental property.',
    detail: 'Property-wide fixed wireless connectivity, subject to coverage and network approval.',
    terms: 'Coverage, eligibility and final terms are confirmed by Vodacom.', featured: 0, sort: 20,
  },
  {
    id: 'package-vodacom-fwa-50', slug: 'vodacom-fwa-50', name: 'FWA 50 Mbps',
    tier: '50 Mbps Fixed Wireless', price: 64900, min: 6, max: 10,
    description: 'Higher capacity for concurrent streaming, studying and remote work.',
    detail: 'Designed for growing properties with multiple connected rooms.',
    terms: 'Coverage, eligibility and final terms are confirmed by Vodacom.', featured: 1, sort: 30,
  },
  {
    id: 'package-vodacom-fwa-100', slug: 'vodacom-fwa-100', name: 'FWA 100 Mbps',
    tier: '100 Mbps Fixed Wireless', price: 69900, min: 10, max: 20,
    description: 'High-capacity connectivity for larger rental properties.',
    detail: 'Designed for portfolio-scale properties and heavier shared usage.',
    terms: 'Coverage, eligibility and final terms are confirmed by Vodacom.', featured: 0, sort: 40,
  },
];

const insertPackage = db.prepare(`
  INSERT INTO packages (id, provider_id, slug, name, tier_speed, monthly_fee_cents, min_rooms, max_rooms, description, detail, terms_note, is_featured, active, is_public, sort_order, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
`);
for (const item of packageSeeds) {
  const exists = db.prepare('SELECT id FROM packages WHERE slug = ?').get(item.slug);
  if (!exists) {
    insertPackage.run(item.id, provider.id, item.slug, item.name, item.tier, item.price, item.min, item.max, item.description, item.detail, item.terms, item.featured, item.sort, now, now);
  }
}

// Routine retention cleanup.
db.prepare(`DELETE FROM admin_sessions WHERE expires_at < datetime('now', ?)`).run(`-${config.sessionRetentionDays} days`);
db.prepare(`DELETE FROM audit_log WHERE created_at < datetime('now', ?)`).run(`-${config.auditRetentionDays} days`);
db.prepare(`DELETE FROM public_rate_limits WHERE window_started_at < datetime('now', '-2 days')`).run();

export function closeDatabase() {
  db.close();
}
