# BackyardConnect.co.za

Production-grade standalone connectivity enquiry platform for backyard rental-property connectivity.

BackyardConnect is intentionally simple for the property owner: the public website explains the current verified partner offers, captures a short consented enquiry and passes the enquiry to the current connectivity partner. It is **not** a connectivity application, coverage checker, installation manager or tenant Wi-Fi portal.

## Included

- Approved Backyard Finance charcoal, white and warm-grey visual system
- Standalone BackyardConnect.co.za branding
- Recreated high-resolution desktop and mobile hero artwork
- Current Vodacom Business partner and package catalogue
- Provider-neutral database model for future approved partners
- Short enquiry form with validation, consent, duplicate control and rate limiting
- Encrypted personal fields at rest using AES-256-GCM
- Operations dashboard with status, provider reference, notes, commission status and CSV export
- Partner catalogue administration
- Audit history and signed optional webhook notifications
- Security headers, strict cookies, CSRF protection and origin checks
- Responsive public pages, accessibility support, sitemap and robots rules
- SQLite persistence, Docker deployment, health check and automated tests

## Local run

```bash
cp .env.example .env
npm run generate-secrets
# Paste the generated values into .env
npm run hash-password -- "Use a long unique password"
# Paste the password hash into ADMIN_PASSWORD_HASH
npm test
npm start
```

Open `http://localhost:3000`. Staff operations are at `http://localhost:3000/admin`.

## Production configuration

Production startup refuses to run without:

- `SESSION_SECRET`
- `DATA_ENCRYPTION_KEY`
- `HASH_SECRET`
- `ADMIN_PASSWORD_HASH`

Set `SITE_ORIGIN=https://backyardconnect.co.za`, place the service behind HTTPS and persist `/app/data` on an encrypted volume.

## Partner expansion

Providers and packages are stored independently. A future partner can be created in the internal partner catalogue as private and inactive. It will not appear publicly until both the provider and its packages are deliberately marked active and public. The initial seed contains only Vodacom Business.

## Enquiry webhook

Set `REFERRAL_WEBHOOK_URL` and `REFERRAL_WEBHOOK_SECRET` to send a server-to-server notification after a enquiry is saved. Requests include:

- `x-backyardconnect-timestamp`
- `x-backyardconnect-signature: sha256=<HMAC>`

The database remains the source of truth even when the webhook destination is unavailable.

## Data note

The package values are seeded from the supplied Vodacom Business × Backyard Finance proposition. Coverage, eligibility, final pricing and terms remain subject to Vodacom confirmation.
