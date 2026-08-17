import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMobile, validateReferral } from '../lib/validation.mjs';

test('normalizes common South African mobile formats', () => {
  assert.equal(normalizeMobile('082 123 4567'), '+27821234567');
  assert.equal(normalizeMobile('+27 82 123 4567'), '+27821234567');
  assert.equal(normalizeMobile('27821234567'), '+27821234567');
});

test('rejects invalid mobile numbers', () => {
  assert.equal(normalizeMobile('011 123 4567'), null);
  assert.equal(normalizeMobile('123'), null);
});

test('valid referral returns normalized data', () => {
  const result = validateReferral({
    firstName: ' Brian ', lastName: 'Rabuthu', mobile: '082 123 4567', email: '',
    propertyArea: ' Soweto ', rentalRooms: '8', packageSlug: 'vodacom-fwa-50', consent: true,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.mobile, '+27821234567');
  assert.equal(result.data.rentalRooms, 8);
  assert.equal(result.data.propertyArea, 'Soweto');
});

test('referral requires consent and core fields', () => {
  const result = validateReferral({});
  assert.equal(result.success, false);
  assert.ok(result.errors.consent);
  assert.ok(result.errors.mobile);
});
