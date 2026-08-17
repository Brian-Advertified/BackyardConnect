# Release verification report

Verified on 17 August 2026 with Node.js 22.16.0.

## Automated verification

- Syntax checks passed for all server, library, browser and test JavaScript files.
- 9 automated tests passed:
  - South African mobile normalization and rejection rules
  - Enquiry validation and consent enforcement
  - AES-256-GCM encryption round trip
  - Password hashing and verification
  - Blind-hash stability
  - Approved public wording and current-provider visibility
  - No account/application-document language in the enquiry journey

## Functional smoke verification

- `GET /api/health` returned `status: ok`.
- Public home page returned HTTP 200 with security headers.
- Enquiry submission created a reference and encrypted database record.
- Duplicate-control path was exercised.
- Staff authentication returned an HttpOnly session and CSRF token.
- Enquiry summary and list endpoints returned decrypted authorised data.
- Staff status, Vodacom reference, commission status and notes update succeeded.
- Activity history recorded the update.

## Responsive rendering verification

The approved home page was rendered at:

- Desktop: 1440 px viewport
- Mobile: 390 px viewport

There was no horizontal overflow on mobile. Full-page evidence is included under `docs/qa/`.

## Clean release state

The packaged release contains no enquiry database, test customer data, environment file or administrator password.
