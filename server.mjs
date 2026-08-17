import http from 'node:http';
import { URL } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './lib/config.mjs';
import { db, closeDatabase } from './lib/db.mjs';
import { createLogger } from './lib/logger.mjs';
import { parseCookies, serializeCookie, readJsonBody, sendJson, sendHtml, sendText, redirect, securityHeaders, getClientIp } from './lib/http.mjs';
import { validateReferral, validateReferralUpdate, validateProvider, validatePackage } from './lib/validation.mjs';
import { encrypt, decrypt, blindHash, createSessionToken, tokenHash, verifyPassword } from './lib/crypto.mjs';
import { renderPage, renderAdminPage, renderNotFound } from './lib/pages.mjs';
import { dispatchReferralWebhook } from './lib/notifications.mjs';

const logger = createLogger();
const publicDir = path.resolve('public');

function runTransaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  }
}

function setSecurity(res, nonce = '') {
  for (const [name, value] of Object.entries(securityHeaders({ production: config.isProduction, nonce }))) {
    res.setHeader(name, value);
  }
}

function publicPackageRows() {
  return db.prepare(`
    SELECT p.id, p.slug AS provider_slug, p.public_name AS provider_name, p.logo_path,
           k.id, k.slug, k.name, k.tier_speed, k.monthly_fee_cents, k.min_rooms,
           k.max_rooms, k.description, k.detail, k.is_featured, k.terms_note
    FROM packages k
    JOIN providers p ON p.id = k.provider_id
    WHERE p.active = 1 AND p.is_public = 1 AND k.active = 1 AND k.is_public = 1
    ORDER BY p.sort_order ASC, k.sort_order ASC, k.monthly_fee_cents ASC
  `).all();
}

function publicProviders() {
  return db.prepare(`
    SELECT id, slug, public_name, logo_path, brand_color
    FROM providers
    WHERE active = 1 AND is_public = 1
    ORDER BY sort_order, public_name
  `).all();
}

function getPackageBySlug(slug) {
  if (!slug || slug === 'help-me-choose') return null;
  return db.prepare(`
    SELECT k.*, p.slug AS provider_slug, p.public_name AS provider_name
    FROM packages k JOIN providers p ON p.id = k.provider_id
    WHERE k.slug = ? AND k.active = 1 AND k.is_public = 1 AND p.active = 1 AND p.is_public = 1
  `).get(slug);
}

function createReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BC-${date}-${random}`;
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.bc_admin;
  if (!token) return null;
  const row = db.prepare(`
    SELECT id, username, csrf_token, expires_at
    FROM admin_sessions
    WHERE token_hash = ? AND expires_at > datetime('now')
  `).get(tokenHash(token));
  return row || null;
}

function requireAdmin(req, res, { csrf = false } = {}) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return null;
  }
  if (csrf && req.headers['x-csrf-token'] !== session.csrf_token) {
    sendJson(res, 403, { error: 'Invalid security token.' });
    return null;
  }
  return session;
}

function audit({ actor = 'system', action, entityType, entityId = null, metadata = null, ip = null }) {
  db.prepare(`
    INSERT INTO audit_log (id, actor, action, entity_type, entity_id, metadata_json, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    crypto.randomUUID(), actor, action, entityType, entityId,
    metadata ? JSON.stringify(metadata) : null,
    ip ? blindHash(ip) : null,
  );
}

function checkPublicRateLimit(ip) {
  const key = blindHash(ip);
  const windowMinutes = config.referralRateWindowMinutes;
  const row = db.prepare(`
    SELECT count, window_started_at
    FROM public_rate_limits
    WHERE key_hash = ?
  `).get(key);

  if (!row) {
    db.prepare(`INSERT INTO public_rate_limits (key_hash, count, window_started_at) VALUES (?, 1, datetime('now'))`).run(key);
    return true;
  }

  const elapsed = Date.now() - new Date(`${row.window_started_at}Z`).getTime();
  if (elapsed >= windowMinutes * 60_000) {
    db.prepare(`UPDATE public_rate_limits SET count = 1, window_started_at = datetime('now') WHERE key_hash = ?`).run(key);
    return true;
  }

  if (row.count >= config.referralRateLimit) return false;
  db.prepare(`UPDATE public_rate_limits SET count = count + 1 WHERE key_hash = ?`).run(key);
  return true;
}

function decodeReferral(row) {
  if (!row) return null;
  return {
    ...row,
    first_name: decrypt(row.first_name_enc),
    last_name: decrypt(row.last_name_enc),
    mobile: decrypt(row.mobile_enc),
    email: row.email_enc ? decrypt(row.email_enc) : '',
    property_area: decrypt(row.property_area_enc),
    notes: row.notes_enc ? decrypt(row.notes_enc) : '',
    first_name_enc: undefined,
    last_name_enc: undefined,
    mobile_enc: undefined,
    email_enc: undefined,
    property_area_enc: undefined,
    notes_enc: undefined,
  };
}

function referralQueryBase() {
  return `
    SELECT r.*, k.name AS package_name, k.tier_speed, p.public_name AS provider_name
    FROM referrals r
    LEFT JOIN packages k ON k.id = r.package_id
    JOIN providers p ON p.id = r.provider_id
  `;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function serveStatic(req, res, pathname) {
  const relative = pathname.replace(/^\//, '');
  const filePath = path.resolve(publicDir, relative);
  if (!filePath.startsWith(publicDir)) return false;
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8',
      '.webmanifest': 'application/manifest+json',
    };
    const body = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', body.length);
    res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    setSecurity(res);
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const ip = getClientIp(req, config.trustProxy);

  if (pathname === '/api/health' && req.method === 'GET') {
    const databaseOk = db.prepare('SELECT 1 AS ok').get()?.ok === 1;
    return sendJson(res, databaseOk ? 200 : 503, {
      status: databaseOk ? 'ok' : 'degraded',
      service: 'backyardconnect',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
    });
  }

  if (pathname === '/api/public/packages' && req.method === 'GET') {
    return sendJson(res, 200, { providers: publicProviders(), packages: publicPackageRows() });
  }

  if (pathname === '/api/referrals' && req.method === 'POST') {
    if (!checkPublicRateLimit(ip)) {
      res.setHeader('Retry-After', String(config.referralRateWindowMinutes * 60));
      return sendJson(res, 429, { error: 'Too many requests. Please try again later.' });
    }

    const origin = req.headers.origin;
    if (origin && origin !== config.siteOrigin) {
      return sendJson(res, 403, { error: 'Request origin is not allowed.' });
    }

    const body = await readJsonBody(req, 64_000);
    if (body.website) return sendJson(res, 202, { reference: 'BC-RECEIVED' });
    const result = validateReferral(body);
    if (!result.success) return sendJson(res, 422, { error: 'Please correct the highlighted fields.', fields: result.errors });

    const data = result.data;
    const selectedPackage = getPackageBySlug(data.packageSlug);
    const provider = selectedPackage
      ? db.prepare('SELECT * FROM providers WHERE id = ?').get(selectedPackage.provider_id)
      : db.prepare(`SELECT * FROM providers WHERE active = 1 AND is_public = 1 ORDER BY sort_order LIMIT 1`).get();

    if (!provider) return sendJson(res, 503, { error: 'No connectivity partner is currently available.' });

    const mobileHash = blindHash(data.mobile);
    const existing = db.prepare(`
      SELECT id, reference FROM referrals
      WHERE mobile_hash = ? AND created_at >= datetime('now', '-30 days')
      ORDER BY created_at DESC LIMIT 1
    `).get(mobileHash);

    if (existing) {
      db.prepare(`
        INSERT INTO referral_events (id, referral_id, event_type, actor, metadata_json, created_at)
        VALUES (?, ?, 'duplicate_submission', 'public', ?, datetime('now'))
      `).run(crypto.randomUUID(), existing.id, JSON.stringify({ package_slug: data.packageSlug }));
      return sendJson(res, 200, { reference: existing.reference, duplicate: true });
    }

    const id = crypto.randomUUID();
    const reference = createReference();
    runTransaction(() => {
      db.prepare(`
        INSERT INTO referrals (
          id, reference, provider_id, package_id, first_name_enc, last_name_enc,
          mobile_enc, mobile_hash, email_enc, property_area_enc, rental_rooms,
          consent, consent_text, consented_at, status, source, utm_source, utm_medium,
          utm_campaign, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), 'new', ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        id, reference, provider.id, selectedPackage?.id || null,
        encrypt(data.firstName), encrypt(data.lastName), encrypt(data.mobile), mobileHash,
        data.email ? encrypt(data.email) : null, encrypt(data.propertyArea), data.rentalRooms,
        data.consentText, data.source, data.utmSource, data.utmMedium, data.utmCampaign,
      );
      db.prepare(`
        INSERT INTO referral_events (id, referral_id, event_type, actor, to_status, metadata_json, created_at)
        VALUES (?, ?, 'created', 'public', 'new', ?, datetime('now'))
      `).run(crypto.randomUUID(), id, JSON.stringify({ package_slug: selectedPackage?.slug || 'help-me-choose', provider: provider.slug }));
      audit({ actor: 'public', action: 'referral.created', entityType: 'referral', entityId: id, ip });
    });

    const webhookPayload = {
      event: 'backyardconnect.enquiry.created',
      reference,
      provider: provider.public_name,
      package: selectedPackage?.name || 'Help me choose',
      customer: {
        firstName: data.firstName,
        lastName: data.lastName,
        mobile: data.mobile,
        email: data.email,
        propertyArea: data.propertyArea,
        rentalRooms: data.rentalRooms,
      },
      createdAt: new Date().toISOString(),
    };
    dispatchReferralWebhook(webhookPayload, logger).catch((error) => logger.error('webhook_dispatch_failed', { error: error.message, reference }));

    logger.info('enquiry_created', { reference, provider: provider.slug, package: selectedPackage?.slug || null });
    return sendJson(res, 201, { reference });
  }

  if (pathname === '/api/admin/session' && req.method === 'GET') {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { authenticated: false });
    return sendJson(res, 200, { authenticated: true, username: session.username, csrfToken: session.csrf_token });
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await readJsonBody(req, 16_000);
    if (String(body.username || '').trim() !== config.adminUsername || !verifyPassword(String(body.password || ''), config.adminPasswordHash)) {
      audit({ actor: String(body.username || 'unknown'), action: 'admin.login_failed', entityType: 'admin_session', ip });
      return sendJson(res, 401, { error: 'Invalid username or password.' });
    }
    const token = createSessionToken();
    const csrfToken = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + config.adminSessionHours * 3_600_000).toISOString().replace('T', ' ').slice(0, 19);
    db.prepare(`INSERT INTO admin_sessions (id, token_hash, username, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`)
      .run(crypto.randomUUID(), tokenHash(token), config.adminUsername, csrfToken, expiresAt);
    res.setHeader('Set-Cookie', serializeCookie('bc_admin', token, { httpOnly: true, secure: config.isProduction, sameSite: 'Strict', maxAge: config.adminSessionHours * 3600, path: '/' }));
    audit({ actor: config.adminUsername, action: 'admin.login', entityType: 'admin_session', ip });
    return sendJson(res, 200, { ok: true, username: config.adminUsername, csrfToken });
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const session = requireAdmin(req, res, { csrf: true });
    if (!session) return;
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies.bc_admin) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash(cookies.bc_admin));
    res.setHeader('Set-Cookie', serializeCookie('bc_admin', '', { httpOnly: true, secure: config.isProduction, sameSite: 'Strict', maxAge: 0, path: '/' }));
    audit({ actor: session.username, action: 'admin.logout', entityType: 'admin_session', ip });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/admin/referrals' && req.method === 'GET') {
    const session = requireAdmin(req, res);
    if (!session) return;
    const search = String(searchParams.get('search') || '').trim().toLowerCase();
    const status = String(searchParams.get('status') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 25)));
    const rows = status
      ? db.prepare(`${referralQueryBase()} WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 500`).all(status)
      : db.prepare(`${referralQueryBase()} ORDER BY r.created_at DESC LIMIT 500`).all();
    let decoded = rows.map(decodeReferral);
    if (search) {
      decoded = decoded.filter((row) => [row.reference, row.first_name, row.last_name, row.mobile, row.email, row.property_area, row.provider_reference]
        .some((value) => String(value || '').toLowerCase().includes(search)));
    }
    const total = decoded.length;
    const items = decoded.slice((page - 1) * limit, page * limit);
    return sendJson(res, 200, { items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
  }

  if (pathname === '/api/admin/referrals.csv' && req.method === 'GET') {
    const session = requireAdmin(req, res);
    if (!session) return;
    const rows = db.prepare(`${referralQueryBase()} ORDER BY r.created_at DESC`).all().map(decodeReferral);
    const header = ['Reference','Created','First name','Last name','Mobile','Email','Property area','Rental rooms','Partner','Package','Status','Provider reference','Commission status'];
    const lines = [header, ...rows.map((r) => [r.reference,r.created_at,r.first_name,r.last_name,r.mobile,r.email,r.property_area,r.rental_rooms,r.provider_name,r.package_name || 'Help me choose',r.status,r.provider_reference || '',r.commission_status])];
    const csv = lines.map((line) => line.map(csvEscape).join(',')).join('\n');
    setSecurity(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backyardconnect-enquiries-${new Date().toISOString().slice(0,10)}.csv"`);
    res.end(csv);
    return;
  }

  const referralMatch = pathname.match(/^\/api\/admin\/referrals\/([0-9a-f-]+)$/i);
  if (referralMatch && req.method === 'GET') {
    const session = requireAdmin(req, res);
    if (!session) return;
    const row = db.prepare(`${referralQueryBase()} WHERE r.id = ?`).get(referralMatch[1]);
    if (!row) return sendJson(res, 404, { error: 'Enquiry not found.' });
    const events = db.prepare(`SELECT * FROM referral_events WHERE referral_id = ? ORDER BY created_at DESC`).all(referralMatch[1]);
    return sendJson(res, 200, { referral: decodeReferral(row), events });
  }

  if (referralMatch && req.method === 'PATCH') {
    const session = requireAdmin(req, res, { csrf: true });
    if (!session) return;
    const body = await readJsonBody(req, 32_000);
    const result = validateReferralUpdate(body);
    if (!result.success) return sendJson(res, 422, { error: 'Invalid update.', fields: result.errors });
    const current = db.prepare('SELECT * FROM referrals WHERE id = ?').get(referralMatch[1]);
    if (!current) return sendJson(res, 404, { error: 'Enquiry not found.' });
    const data = result.data;
    runTransaction(() => {
      db.prepare(`UPDATE referrals SET status = ?, provider_reference = ?, commission_status = ?, notes_enc = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(data.status, data.providerReference || null, data.commissionStatus, data.notes ? encrypt(data.notes) : null, current.id);
      db.prepare(`INSERT INTO referral_events (id, referral_id, event_type, actor, from_status, to_status, metadata_json, created_at) VALUES (?, ?, 'updated', ?, ?, ?, ?, datetime('now'))`)
        .run(crypto.randomUUID(), current.id, session.username, current.status, data.status, JSON.stringify({ provider_reference: data.providerReference || null, commission_status: data.commissionStatus, note_updated: Boolean(data.notes) }));
      audit({ actor: session.username, action: 'enquiry.updated', entityType: 'referral', entityId: current.id, ip });
    });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/admin/summary' && req.method === 'GET') {
    const session = requireAdmin(req, res);
    if (!session) return;
    const totals = db.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='new' THEN 1 ELSE 0 END) AS new_count, SUM(CASE WHEN status='submitted_to_provider' THEN 1 ELSE 0 END) AS submitted_count, SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END) AS converted_count FROM referrals`).get();
    const recent = db.prepare(`SELECT date(created_at) AS day, COUNT(*) AS count FROM referrals WHERE created_at >= datetime('now', '-30 days') GROUP BY date(created_at) ORDER BY day`).all();
    return sendJson(res, 200, { totals, recent });
  }

  if (pathname === '/api/admin/catalogue' && req.method === 'GET') {
    const session = requireAdmin(req, res);
    if (!session) return;
    const providers = db.prepare(`SELECT * FROM providers ORDER BY sort_order, public_name`).all();
    const packages = db.prepare(`SELECT k.*, p.public_name AS provider_name FROM packages k JOIN providers p ON p.id = k.provider_id ORDER BY p.sort_order, k.sort_order`).all();
    return sendJson(res, 200, { providers, packages });
  }

  if (pathname === '/api/admin/providers' && req.method === 'POST') {
    const session = requireAdmin(req, res, { csrf: true });
    if (!session) return;
    const result = validateProvider(await readJsonBody(req, 32_000));
    if (!result.success) return sendJson(res, 422, { error: 'Invalid partner.', fields: result.errors });
    const data = result.data;
    const id = crypto.randomUUID();
    try {
      db.prepare(`INSERT INTO providers (id, slug, legal_name, public_name, logo_path, brand_color, active, is_public, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
        .run(id, data.slug, data.legalName, data.publicName, data.logoPath, data.brandColor, data.active ? 1 : 0, data.isPublic ? 1 : 0, data.sortOrder);
      audit({ actor: session.username, action: 'provider.created', entityType: 'provider', entityId: id, ip });
      return sendJson(res, 201, { id });
    } catch {
      return sendJson(res, 409, { error: 'A partner with that slug already exists.' });
    }
  }

  if (pathname === '/api/admin/packages' && req.method === 'POST') {
    const session = requireAdmin(req, res, { csrf: true });
    if (!session) return;
    const result = validatePackage(await readJsonBody(req, 32_000));
    if (!result.success) return sendJson(res, 422, { error: 'Invalid package.', fields: result.errors });
    const data = result.data;
    const provider = db.prepare('SELECT id FROM providers WHERE id = ?').get(data.providerId);
    if (!provider) return sendJson(res, 422, { error: 'Partner not found.' });
    const id = crypto.randomUUID();
    try {
      db.prepare(`INSERT INTO packages (id, provider_id, slug, name, tier_speed, monthly_fee_cents, min_rooms, max_rooms, description, detail, terms_note, is_featured, active, is_public, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
        .run(id, data.providerId, data.slug, data.name, data.tierSpeed, data.monthlyFeeCents, data.minRooms, data.maxRooms, data.description, data.detail, data.termsNote, data.isFeatured ? 1 : 0, data.active ? 1 : 0, data.isPublic ? 1 : 0, data.sortOrder);
      audit({ actor: session.username, action: 'package.created', entityType: 'package', entityId: id, ip });
      return sendJson(res, 201, { id });
    } catch {
      return sendJson(res, 409, { error: 'A package with that slug already exists.' });
    }
  }

  return sendJson(res, 404, { error: 'API route not found.' });
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  try {
    const url = new URL(req.url || '/', config.siteOrigin);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/api/')) {
      setSecurity(res);
      await handleApi(req, res, url);
    } else if (pathname === '/robots.txt') {
      setSecurity(res);
      sendText(res, 200, `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${config.siteOrigin}/sitemap.xml\n`);
    } else if (pathname === '/sitemap.xml') {
      setSecurity(res);
      const routes = ['/', '/how-it-works', '/packages', '/faqs', '/contact', '/privacy', '/terms', '/popia'];
      const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${config.siteOrigin}${route}</loc></url>`).join('')}</urlset>`;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.end(body);
    } else if (pathname === '/admin' || pathname === '/admin/') {
      setSecurity(res);
      sendHtml(res, 200, renderAdminPage(config));
    } else if (await serveStatic(req, res, pathname)) {
    } else {
      const packages = publicPackageRows();
      const html = renderPage(pathname, { config, packages, query: url.searchParams });
      setSecurity(res);
      if (html) sendHtml(res, 200, html);
      else sendHtml(res, 404, renderNotFound(config));
    }
  } catch (error) {
    logger.error('request_failed', { requestId, method: req.method, url: req.url, error: error.stack || error.message });
    if (!res.headersSent) {
      setSecurity(res);
      sendJson(res, error.statusCode || 500, { error: error.expose ? error.message : 'Something went wrong. Please try again.' });
    } else res.end();
  } finally {
    logger.info('request_completed', { requestId, method: req.method, url: req.url, status: res.statusCode, duration_ms: Date.now() - started });
  }
});
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;
server.listen(config.port, config.host, () => logger.info('server_started', { origin: config.siteOrigin, host: config.host, port: config.port, environment: config.nodeEnv }));
function shutdown(signal) {
  logger.info('shutdown_started', { signal });
  server.close(() => { closeDatabase(); logger.info('shutdown_complete', { signal }); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
