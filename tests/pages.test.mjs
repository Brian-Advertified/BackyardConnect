import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../lib/pages.mjs';

const config = { siteOrigin: 'http://localhost:3000', contactEmail: 'connect@backyardconnect.co.za', contactPhone: '', businessHours: 'Weekdays' };
const packages = [{ slug:'vodacom-fwa-50', name:'FWA 50 Mbps', monthly_fee_cents:64900, min_rooms:6, max_rooms:10, description:'Test', is_featured:1 }];

test('renders approved public wording and current provider', () => {
  const html = renderPage('/', { config, packages, query: new URLSearchParams() });
  assert.match(html, /Connect your/);
  assert.match(html, /rental rooms/);
  assert.match(html, /Vodacom Business/);
  assert.match(html, /class="partner-provider-logo" src="\/voda-1\.png"/);
  assert.match(html, /class="package-provider-logo" src="\/voda-2\.png"/);
  assert.match(html, /data-package-choice=/);
  assert.match(html, /class="group-logo" src="\/byclogo-2\.png"/);
  assert.match(html, /src="\/byclogo-1\.png"/);
  assert.doesNotMatch(html, /BackyardFinance|Backyard Finance/);
  assert.doesNotMatch(html, /MTN|Telkom/);
});

test('renders enquiry form without application account language', () => {
  const html = renderPage('/contact', { config, packages, query: new URLSearchParams() });
  assert.match(html, /Submit enquiry/);
  assert.doesNotMatch(html, /Create account|Upload documents/);
});

test('keeps detailed landing-page context below the hero', () => {
  const html = renderPage('/', { config, packages, query: new URLSearchParams() });
  const heroEnd = html.indexOf('</section>');
  const processStart = html.indexOf('home-flow-copy');
  const detailCopy = html.indexOf('BackyardConnect helps property owners');
  assert.ok(heroEnd < detailCopy);
  assert.ok(processStart < detailCopy);
  assert.match(html, /class="package-note">Vodacom confirms coverage, eligibility, availability and final pricing\./);
});
