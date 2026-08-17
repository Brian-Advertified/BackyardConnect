import crypto from 'node:crypto';
import { config } from './config.mjs';

export async function dispatchReferralWebhook(payload, logger) {
  if (!config.referralWebhookUrl) return { skipped: true };
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = config.referralWebhookSecret
    ? crypto.createHmac('sha256', config.referralWebhookSecret).update(`${timestamp}.${body}`).digest('hex')
    : '';
  const response = await fetch(config.referralWebhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'BackyardConnect/1.0',
      'x-backyardconnect-timestamp': timestamp,
      ...(signature ? { 'x-backyardconnect-signature': `sha256=${signature}` } : {}),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Webhook returned ${response.status}.`);
  logger.info('webhook_dispatched', { reference: payload.reference, status: response.status });
  return { ok: true };
}
