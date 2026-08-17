# Security and privacy controls

- Enquiry PII is encrypted at rest with AES-256-GCM.
- Deterministic blind hashes support duplicate control without storing raw mobile numbers for lookup.
- Admin sessions use random opaque tokens, database-side expiry, HttpOnly cookies and SameSite=Strict.
- Administrative writes require a per-session CSRF token.
- Public submissions enforce a same-origin check, honeypot and database-backed rate limit.
- All administrative changes are recorded in the audit log.
- Content Security Policy blocks third-party scripts and framing.
- Production requires independent secrets and HTTPS.

## Reporting a vulnerability

Send a private report to the security contact configured for the BackyardFinance group. Do not include customer information in ordinary email unless an approved secure channel is provided.
