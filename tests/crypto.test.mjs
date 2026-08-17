import test from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt, hashPassword, verifyPassword, blindHash } from '../lib/crypto.mjs';

test('encrypts and decrypts referral values', () => {
  const value = '0821234567';
  const encrypted = encrypt(value);
  assert.notEqual(encrypted, value);
  assert.equal(decrypt(encrypted), value);
});

test('password hashing verifies correct passwords only', () => {
  const hash = hashPassword('A-strong-test-password-123');
  assert.equal(verifyPassword('A-strong-test-password-123', hash), true);
  assert.equal(verifyPassword('wrong', hash), false);
});

test('blind hashes are stable without exposing raw values', () => {
  assert.equal(blindHash('value'), blindHash('value'));
  assert.notEqual(blindHash('value'), 'value');
});
