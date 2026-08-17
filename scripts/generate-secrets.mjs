import crypto from 'node:crypto';
console.log(`SESSION_SECRET=${crypto.randomBytes(48).toString('base64url')}`);
console.log(`DATA_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('base64')}`);
console.log(`HASH_SECRET=${crypto.randomBytes(48).toString('base64url')}`);
console.log(`REFERRAL_WEBHOOK_SECRET=${crypto.randomBytes(32).toString('base64url')}`);
