function text(value, min, max) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  return normalized.length >= min && normalized.length <= max ? normalized : null;
}

export function normalizeMobile(value) {
  let normalized = String(value ?? '').replace(/[^0-9+]/g, '');
  if (normalized.startsWith('+27')) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith('27') && normalized.length === 11) normalized = `0${normalized.slice(2)}`;
  if (!/^0[6-8][0-9]{8}$/.test(normalized)) return null;
  return `+27${normalized.slice(1)}`;
}

function optionalEmail(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function safeSlug(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : null;
}

function collect(errors, field, condition, message) {
  if (!condition) errors[field] = message;
}

export function validateReferral(input) {
  const errors = {};
  const firstName = text(input.firstName, 2, 80);
  const lastName = text(input.lastName, 2, 80);
  const mobile = normalizeMobile(input.mobile);
  const email = optionalEmail(input.email);
  const propertyArea = text(input.propertyArea, 2, 140);
  const rentalRooms = Number.parseInt(input.rentalRooms, 10);
  const packageSlug = String(input.packageSlug || 'help-me-choose').trim();
  const consent = input.consent === true || input.consent === 'true' || input.consent === 'on';
  collect(errors, 'firstName', firstName, 'Enter your first name.');
  collect(errors, 'lastName', lastName, 'Enter your surname.');
  collect(errors, 'mobile', mobile, 'Enter a valid South African mobile number.');
  collect(errors, 'email', email !== null, 'Enter a valid email address.');
  collect(errors, 'propertyArea', propertyArea, 'Enter the property suburb, town or area.');
  collect(errors, 'rentalRooms', Number.isInteger(rentalRooms) && rentalRooms >= 1 && rentalRooms <= 100, 'Select the number of rental rooms.');
  collect(errors, 'packageSlug', packageSlug === 'help-me-choose' || safeSlug(packageSlug), 'Select a valid package.');
  collect(errors, 'consent', consent, 'Consent is required before we can share your enquiry.');
  if (Object.keys(errors).length) return { success: false, errors };
  return {
    success: true,
    data: {
      firstName, lastName, mobile, email, propertyArea, rentalRooms, packageSlug, consent,
      source: text(input.source, 1, 40) || 'website',
      utmSource: text(input.utmSource, 1, 100) || null,
      utmMedium: text(input.utmMedium, 1, 100) || null,
      utmCampaign: text(input.utmCampaign, 1, 100) || null,
    },
  };
}

const statuses = new Set(['new','submitted_to_provider','contacted','qualified','converted','not_eligible','closed']);
const commissionStatuses = new Set(['pending','approved','paid','reversed','not_applicable']);

export function validateReferralUpdate(input) {
  const errors = {};
  const status = String(input.status || '');
  const commissionStatus = String(input.commissionStatus || '');
  const providerReference = String(input.providerReference || '').trim().slice(0, 120);
  const notes = String(input.notes || '').trim().slice(0, 5000);
  collect(errors, 'status', statuses.has(status), 'Select a valid referral status.');
  collect(errors, 'commissionStatus', commissionStatuses.has(commissionStatus), 'Select a valid commission status.');
  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { status, commissionStatus, providerReference, notes } };
}

export function validateProvider(input) {
  const errors = {};
  const slug = safeSlug(input.slug);
  const legalName = text(input.legalName, 2, 160);
  const publicName = text(input.publicName, 2, 100);
  const logoPath = String(input.logoPath || '').trim().slice(0, 200);
  const brandColor = /^#[0-9A-Fa-f]{6}$/.test(String(input.brandColor || '')) ? String(input.brandColor) : '#181818';
  const sortOrder = Number.parseInt(input.sortOrder || 100, 10);
  collect(errors, 'slug', slug, 'Use a lowercase URL slug.');
  collect(errors, 'legalName', legalName, 'Enter the legal partner name.');
  collect(errors, 'publicName', publicName, 'Enter the public partner name.');
  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { slug, legalName, publicName, logoPath, brandColor, active: Boolean(input.active), isPublic: Boolean(input.isPublic), sortOrder } };
}

export function validatePackage(input) {
  const errors = {};
  const providerId = text(input.providerId, 2, 80);
  const slug = safeSlug(input.slug);
  const name = text(input.name, 2, 100);
  const tierSpeed = text(input.tierSpeed, 2, 120);
  const monthlyFeeCents = Number.parseInt(input.monthlyFeeCents, 10);
  const minRooms = Number.parseInt(input.minRooms, 10);
  const maxRooms = Number.parseInt(input.maxRooms, 10);
  const description = text(input.description, 2, 300);
  const detail = String(input.detail || '').trim().slice(0, 500);
  const termsNote = String(input.termsNote || '').trim().slice(0, 500);
  const sortOrder = Number.parseInt(input.sortOrder || 100, 10);
  collect(errors, 'providerId', providerId, 'Select a partner.');
  collect(errors, 'slug', slug, 'Use a lowercase URL slug.');
  collect(errors, 'name', name, 'Enter a package name.');
  collect(errors, 'tierSpeed', tierSpeed, 'Enter the tier or speed.');
  collect(errors, 'monthlyFeeCents', Number.isInteger(monthlyFeeCents) && monthlyFeeCents >= 0, 'Enter a valid monthly fee in cents.');
  collect(errors, 'minRooms', Number.isInteger(minRooms) && minRooms >= 1, 'Enter the minimum rooms.');
  collect(errors, 'maxRooms', Number.isInteger(maxRooms) && maxRooms >= minRooms, 'Enter a valid maximum rooms.');
  collect(errors, 'description', description, 'Enter a description.');
  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { providerId, slug, name, tierSpeed, monthlyFeeCents, minRooms, maxRooms, description, detail, termsNote, isFeatured: Boolean(input.isFeatured), active: Boolean(input.active), isPublic: Boolean(input.isPublic), sortOrder } };
}
