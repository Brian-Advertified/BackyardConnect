# Production deployment

## 1. DNS and TLS

Point `backyardconnect.co.za` and `www.backyardconnect.co.za` to the production load balancer or reverse proxy. Redirect `www` to the canonical hostname and enforce HTTPS.

## 2. Secrets

Generate independent production values:

```bash
npm run generate-secrets
npm run hash-password -- "a long unique operations password"
```

Store them in the deployment secret manager. Never commit `.env`.

## 3. Persistent storage

The default database path is `/app/data/backyardconnect.sqlite`. Mount an encrypted persistent volume, include it in automated backups and test restoration regularly.

## 4. Reverse proxy

Proxy to `127.0.0.1:3000`, preserve the original Host header and set `X-Forwarded-For`. Set `TRUST_PROXY=true` only when requests can reach the service exclusively through the trusted proxy.

## 5. Health and monitoring

- Liveness/readiness: `GET /api/health`
- Application logs are JSON lines on stdout/stderr
- Alert on repeated 5xx responses, webhook failures, database-volume errors and abnormal enquiry volume

## 6. Backups

Use SQLite online backup or volume snapshots at least daily. Keep encrypted off-site copies and perform a quarterly restore test.

## 7. Release check

```bash
npm run check
docker compose build
docker compose up -d
curl -fsS https://backyardconnect.co.za/api/health
```

Verify the public enquiry, admin sign-in, CSV export, mobile layout, privacy pages and webhook destination before directing traffic to the release.
