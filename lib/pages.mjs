function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

const icon = (name, className = '') => {
  const icons = {
    home: '<path d="M3 11.5 12 3l9 8.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/><path d="M9 22V12h6v10"/>',
    wifi: '<path d="M5 12.6a11 11 0 0 1 14 0"/><path d="M8.5 16a6 6 0 0 1 7 0"/><path d="M11.7 19.3a.45.45 0 0 1 .6 0"/>',
    tower: '<path d="m8 22 4-20 4 20"/><path d="M5 8a10 10 0 0 1 14 0"/><path d="M2 5a14 14 0 0 1 20 0"/><path d="M7 15h10M6 19h12"/>',
    rocket: '<path d="M4.5 16.5c-1.2 1-2 2.7-2.5 5.5 2.8-.5 4.5-1.3 5.5-2.5"/><path d="M9 15 5 11c3-5 8-8 15-9 1 7-2 12-7 15z"/><path d="M14 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/><path d="m9 15-1 5 5-1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .35 2 .7 2.9a2 2 0 0 1-.45 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.95.35 1.9.6 2.9.7A2 2 0 0 1 22 16.9"/>',
    clipboard: '<path d="M9 5h6M9 3h6v4H9z"/><path d="M8 5H5v17h14V5h-3"/><path d="M8 12h8M8 16h8"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  };
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
};

function logo({ dark = false } = {}) {
  const src = dark ? '/assets/backyardconnect-logo-reverse.svg' : '/assets/backyardconnect-logo.svg';
  return `<a class="brand" href="/" aria-label="Backyard Connect home"><img src="${src}" alt="Backyard Connect" width="570" height="150"></a>`;
}

function header(active = '') {
  const links = [
    ['/', 'Home', 'home'], ['/how-it-works', 'How it works', 'how'], ['/packages', 'Packages', 'packages'], ['/faqs', 'FAQs', 'faqs'], ['/contact', 'Contact', 'contact'],
  ];
  return `<header class="site-header">
    <div class="header-inner container-wide">
      ${logo()}
      <button class="nav-toggle" type="button" aria-controls="primary-nav" aria-expanded="false"><span class="sr-only">Open menu</span>${icon('menu')}</button>
      <nav id="primary-nav" class="primary-nav" aria-label="Primary navigation">
        ${links.map(([href, label, key]) => `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`).join('')}
      </nav>
      <a class="button button-dark header-cta" href="/contact#referral-form">Request a call</a>
    </div>
  </header>`;
}

function footer(config) {
  const email = config.contactEmail ? `<a href="mailto:${escapeHtml(config.contactEmail)}">${icon('mail')} ${escapeHtml(config.contactEmail)}</a>` : '';
  const phone = config.contactPhone ? `<a href="tel:${escapeHtml(config.contactPhone.replace(/\s/g, ''))}">${icon('phone')} ${escapeHtml(config.contactPhone)}</a>` : '';
  return `<footer class="site-footer">
    <div class="footer-grid container-wide">
      <div class="footer-brand">${logo({ dark: true })}<p>Helping rental property owners access connectivity options for their rooms.</p><div class="socials" aria-label="Social links"><span>f</span><span>◎</span><span>in</span></div></div>
      <div><h3>Explore</h3><a href="/">Home</a><a href="/how-it-works">How it works</a><a href="/packages">Packages</a><a href="/faqs">FAQs</a><a href="/contact">Contact</a></div>
      <div><h3>Legal</h3><a href="/terms">Terms and conditions</a><a href="/privacy">Privacy policy</a><a href="/popia">POPIA notice</a></div>
      <div><h3>Contact us</h3>${phone}${email}<p class="footer-hours">${escapeHtml(config.businessHours)}</p></div>
      <div><h3>Disclaimer</h3><p>Coverage, product eligibility, pricing and service fulfilment are confirmed by the selected connectivity provider.</p></div>
    </div>
    <div class="footer-bottom container-wide"><span>© ${new Date().getFullYear()} BackyardConnect.co.za. All rights reserved.</span><a href="/admin">Staff access</a></div>
  </footer>`;
}

function metadata(title, description, config, path = '/') {
  const canonical = `${config.siteOrigin}${path === '/' ? '' : path}`;
  return `<title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#181818">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${config.siteOrigin}/assets/hero-property-desktop.webp">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/styles.css">`;
}

function layout({ title, description, active, content, config, path = '/', bodyClass = '' }) {
  return `<!doctype html><html lang="en-ZA"><head><meta charset="utf-8">${metadata(title, description, config, path)}</head><body class="${bodyClass}">
    <a class="skip-link" href="#main">Skip to content</a>${header(active)}<main id="main">${content}</main>${footer(config)}<script src="/app.js" defer></script>
  </body></html>`;
}

function packageIcon(slug) {
  if (slug.includes('mobile')) return icon('wifi');
  if (slug.includes('30')) return icon('tower');
  if (slug.includes('100')) return icon('rocket');
  return icon('wifi');
}

function packageCard(item, { compact = false } = {}) {
  const rand = Math.round(item.monthly_fee_cents / 100);
  return `<article class="package-card ${item.is_featured ? 'featured' : ''}" data-package="${escapeHtml(item.slug)}" data-package-choice="${escapeHtml(item.slug)}" tabindex="0" role="button" aria-label="Choose ${escapeHtml(item.name)}">
    ${item.is_featured ? '<span class="popular-badge">Most popular</span>' : ''}
    <img class="package-provider-logo" src="/vodacom.png" alt="Vodacom Business" width="112" height="62" loading="lazy">
    <div class="package-icon">${packageIcon(item.slug)}</div>
    <h3>${escapeHtml(item.name)}</h3>
    <p class="room-range">${item.min_rooms}–${item.max_rooms} Rooms</p>
    <p class="price"><span>R${rand}</span> /pm</p>
    <p>${escapeHtml(item.description)}</p>
    ${compact ? '' : `<button type="button" class="text-link choose-package" data-package-choice="${escapeHtml(item.slug)}">Select package ${icon('arrow')}</button>`}
  </article>`;
}

function referralForm(packages, { heading = 'Tell us about your property', description = 'Share a few details about your property and a connectivity specialist will contact you.' } = {}) {
  return `<section id="referral-form" class="referral-shell" aria-labelledby="referral-title">
    <div class="referral-heading"><h2 id="referral-title">${escapeHtml(heading)}</h2><p>${escapeHtml(description)}</p></div>
    <form class="referral-form" data-referral-form novalidate>
      <div class="honeypot" aria-hidden="true"><label>Website<input name="website" autocomplete="off" tabindex="-1"></label></div>
      <input type="hidden" name="source" value="website"><input type="hidden" name="utmSource"><input type="hidden" name="utmMedium"><input type="hidden" name="utmCampaign">
      <div class="form-field"><label for="firstName">Name</label><input id="firstName" name="firstName" autocomplete="given-name" maxlength="80" required placeholder="Enter your name"><span class="field-error" data-error-for="firstName"></span></div>
      <div class="form-field"><label for="lastName">Surname</label><input id="lastName" name="lastName" autocomplete="family-name" maxlength="80" required placeholder="Enter your surname"><span class="field-error" data-error-for="lastName"></span></div>
      <div class="form-field"><label for="mobile">Mobile number</label><input id="mobile" name="mobile" autocomplete="tel" inputmode="tel" required placeholder="07X XXX XXXX"><span class="field-error" data-error-for="mobile"></span></div>
      <div class="form-field"><label for="email">Email <span>(optional)</span></label><input id="email" name="email" autocomplete="email" type="email" maxlength="254" placeholder="name@example.com"><span class="field-error" data-error-for="email"></span></div>
      <div class="form-field"><label for="propertyArea">Property area</label><input id="propertyArea" name="propertyArea" maxlength="140" required placeholder="e.g. Soweto, Khayelitsha"><span class="field-error" data-error-for="propertyArea"></span></div>
      <div class="form-field"><label for="rentalRooms">Number of rental rooms</label><select id="rentalRooms" name="rentalRooms" required><option value="">Select number of rooms</option>${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}<option value="25">21–25</option><option value="30">26–30</option><option value="40">31–40</option><option value="50">41–50</option><option value="100">More than 50</option></select><span class="field-error" data-error-for="rentalRooms"></span></div>
      <div class="form-field form-field-wide"><label for="packageSlug">Package of interest</label><select id="packageSlug" name="packageSlug"><option value="help-me-choose">Help me choose</option>${packages.map((item) => `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)} — R${Math.round(item.monthly_fee_cents / 100)}/pm</option>`).join('')}</select><span class="field-error" data-error-for="packageSlug"></span></div>
      <label class="consent-field"><input type="checkbox" name="consent" required><span>I consent to BackyardConnect sharing my details with its connectivity partner so that I can be contacted about this enquiry.<span class="field-error" data-error-for="consent"></span></span></label>
      <div class="form-actions form-field-wide"><button class="button button-dark submit-referral" type="submit"><span>Submit enquiry</span>${icon('arrow')}</button><p class="form-status" role="status" aria-live="polite"></p></div>
    </form>
  </section>`;
}

function steps() {
  const items = [
    ['clipboard', 'Tell us about your property', 'Complete the short form with a few details about your property.'],
    ['link', 'We identify a suitable option', 'We use your property details to match the most relevant available connectivity option.'],
    ['phone', 'A connectivity specialist contacts you', 'They’ll confirm coverage, eligibility and discuss the available options.'],
    ['check', 'Next steps confirmed', 'Vodacom will confirm pricing, installation options and next steps.'],
  ];
  return `<section class="how-section container-wide"><h2>How it works</h2><div class="steps">${items.map(([iconName, title, text], index) => `<article class="step"><span class="step-number">${index + 1}</span><span class="step-icon">${icon(iconName)}</span><div><h3>${title}</h3><p>${text}</p></div>${index < items.length - 1 ? `<span class="step-arrow">${icon('arrow')}</span>` : ''}</article>`).join('')}</div></section>`;
}

function homePage({ config, packages }) {
  const content = `<section class="hero">
    <picture class="hero-picture"><source media="(max-width: 720px)" srcset="/assets/hero-property-mobile.webp"><img src="/assets/hero-property-desktop.webp" alt="A South African rental neighbourhood with individual rooms" width="1672" height="941" fetchpriority="high"></picture>
    <div class="hero-gradient"></div>
    <div class="hero-inner container-wide">
      <div class="hero-copy"><h1>Connect your<br>rental rooms.</h1><p class="hero-lead"><strong>Reliable internet. Happier tenants. Better rental appeal.</strong></p><div class="hero-actions"><a class="button button-dark" href="#packages">Find the right option</a><a class="button button-outline" href="/contact#referral-form">Speak to us</a></div></div>
      <aside class="partner-card"><p>Connectivity partner</p><div class="partner-lockup"><img src="/vodacom.png" alt="Vodacom Business" width="190" height="106"><span class="partner-divider"></span><img class="group-logo" src="/assets/backyardconnect-logo.svg" alt="Backyard Connect" width="190" height="50"></div></aside>
    </div>
  </section>
  <section id="packages" class="packages-section home-packages container-wide"><div class="section-heading"><p class="eyebrow">Current Vodacom Business options</p><h2>Choose the option that suits your property</h2><p>Use the room ranges as a simple guide. Select an option to continue with your enquiry.</p></div><div class="package-grid">${packages.map((item) => packageCard(item)).join('')}</div><p class="package-note">Vodacom confirms coverage, eligibility, availability and final pricing.</p><div class="home-packages-actions"><a class="button button-outline" href="/packages">Compare package details</a><a class="button button-dark" href="/contact">Help me choose</a></div></section>
  <section class="home-simple-flow"><div class="container-wide"><div class="home-flow-copy"><p class="eyebrow">Simple process</p><h2>Tell us where the property is. We’ll connect you to the right next step.</h2><p>BackyardConnect helps property owners access reliable internet options for their rental rooms. Tell us about your property and a connectivity specialist will contact you to confirm availability, pricing and next steps.</p></div><div class="home-flow-steps"><div><strong>1</strong><span>Choose an option</span></div><div><strong>2</strong><span>Tell us about the property</span></div><div><strong>3</strong><span>A specialist contacts you</span></div></div></div></section>`;
  return layout({ title: 'BackyardConnect.co.za | Connect your rental rooms', description: 'Explore connectivity options for rental rooms and request a call from a connectivity specialist.', active: 'home', content, config, path: '/' });
}

function howPage({ config, packages }) {
  const content = `<section class="page-hero"><div class="container"><p class="eyebrow">A simple connectivity enquiry</p><h1>Tell us about your property.<br>We help you find the next step.</h1><p>BackyardConnect captures the essential property details needed to identify a suitable connectivity option. The connectivity provider confirms coverage, eligibility, pricing and fulfilment.</p><a class="button button-dark" href="/contact#referral-form">Request a call</a></div></section>
    ${steps()}
    <section class="content-section container"><div class="content-grid"><article><span class="content-icon">${icon('clipboard')}</span><h2>What we collect</h2><p>Your name, mobile number, property area, number of rooms and package interest. We do not ask for identity documents or financial documents.</p></article><article><span class="content-icon">${icon('shield')}</span><h2>What we protect</h2><p>Your enquiry data is encrypted at rest, access is restricted, and every staff update is recorded in the audit history.</p></article><article><span class="content-icon">${icon('phone')}</span><h2>What happens next</h2><p>Vodacom contacts you directly to check coverage, confirm suitability and explain the application or installation process.</p></article></div></section>
    <section class="simple-cta"><div class="container"><h2>Ready to connect your property?</h2><p>Complete the short enquiry form and a connectivity specialist will confirm the next step.</p><a class="button button-light" href="/contact#referral-form">Submit my enquiry</a></div></section>`;
  return layout({ title: 'How BackyardConnect works', description: 'A simple path from property details to a connectivity specialist call.', active: 'how', content, config, path: '/how-it-works' });
}

function packagesPage({ config, packages }) {
  const content = `<section class="page-hero compact"><div class="container"><p class="eyebrow">Connectivity partner: Vodacom Business</p><h1>Connectivity options for rental properties.</h1><p>Use the room ranges as a starting guide. Vodacom confirms coverage, eligibility, pricing and final package suitability.</p></div></section>
    <section class="packages-detail container-wide"><div class="package-grid">${packages.map((item) => packageCard(item)).join('')}</div><div class="terms-panel"><h2>Important package information</h2><ul><li>Prices shown are the current proposal values supplied for BackyardConnect.</li><li>Coverage and network capacity are confirmed by Vodacom.</li><li>Product availability and final pricing may change.</li><li>Room ranges are indicative and do not guarantee performance in every room.</li></ul></div></section>
    <section class="simple-cta"><div class="container"><h2>Not sure which option to choose?</h2><p>Select “Help me choose” and Vodacom can discuss the available options with you.</p><a class="button button-light" href="/contact#referral-form">Request a call</a></div></section>`;
  return layout({ title: 'BackyardConnect packages', description: 'View current Vodacom Business connectivity options for backyard rental rooms.', active: 'packages', content, config, path: '/packages' });
}

function faqPage({ config }) {
  const questions = [
    ['Does BackyardConnect provide the internet service?', 'BackyardConnect helps property owners explore connectivity options. Vodacom Business is the connectivity partner and confirms coverage, eligibility, pricing and fulfilment.'],
    ['Does submitting the form mean I have applied?', 'No. The form records your interest so a connectivity specialist can contact you about coverage, available options and any provider requirements.'],
    ['How do I know which package suits my property?', 'The room ranges are an indicative guide. Select a package or choose “Help me choose”. Vodacom will confirm the options available at your location.'],
    ['Will BackyardConnect check coverage?', 'No. Vodacom confirms coverage and network eligibility after receiving your enquiry.'],
    ['What information do you share?', 'We share the contact and property details you submit, together with your package interest and consent record.'],
    ['Can I enquire about more than one property?', 'Yes. Submit one enquiry for each property so the correct area, room count and package interest are recorded.'],
    ['Are the prices guaranteed?', 'No. The values shown are indicative proposal prices. Vodacom confirms final pricing and applicable terms.'],
    ['Will other connectivity partners be available?', 'The platform can support approved connectivity partners as they are added. Only partners with active, verified offers are shown publicly.'],
  ];
  const content = `<section class="page-hero compact"><div class="container"><p class="eyebrow">Clear answers</p><h1>Frequently asked questions.</h1><p>Everything you need to know before submitting an enquiry.</p></div></section><section class="faq-list container">${questions.map(([question, answer]) => `<details><summary>${question}<span>+</span></summary><p>${answer}</p></details>`).join('')}</section>`;
  return layout({ title: 'BackyardConnect FAQs', description: 'Answers about coverage, packages, pricing, enquiries and data sharing.', active: 'faqs', content, config, path: '/faqs' });
}

function contactPage({ config, packages }) {
  const content = `<section class="page-hero compact"><div class="container"><p class="eyebrow">Request a call</p><h1>Tell us about your property.</h1><p>Complete the short form. A connectivity specialist will contact you about coverage, available options and next steps.</p></div></section><div class="container-wide contact-layout">${referralForm(packages, { description: 'Only the details needed to respond to your connectivity enquiry.' })}<aside class="contact-card"><h2>Contact BackyardConnect</h2>${config.contactPhone ? `<a href="tel:${escapeHtml(config.contactPhone.replace(/\s/g,''))}">${icon('phone')}<span><small>Call us</small>${escapeHtml(config.contactPhone)}</span></a>` : ''}<a href="mailto:${escapeHtml(config.contactEmail)}">${icon('mail')}<span><small>Email us</small>${escapeHtml(config.contactEmail)}</span></a><p>${escapeHtml(config.businessHours)}</p><hr><p class="small">Connectivity, coverage, pricing and installation questions are confirmed by the connectivity provider.</p></aside></div>`;
  return layout({ title: 'Contact BackyardConnect', description: 'Send a short connectivity enquiry for your rental property.', active: 'contact', content, config, path: '/contact' });
}

function legalPage({ config, type }) {
  const contentMap = {
    privacy: ['Privacy policy', `<h2>Information we collect</h2><p>We collect the details you submit in the enquiry form, including your name, contact details, property area, number of rental rooms, package interest and consent record.</p><h2>Why we use it</h2><p>We use the information to create and manage your enquiry, share it with the selected connectivity partner, prevent duplicate enquiries, provide support and maintain an audit trail.</p><h2>Security</h2><p>Personal enquiry fields are encrypted at rest. Access to the staff dashboard is authenticated and administrative changes are recorded.</p><h2>Retention and rights</h2><p>We retain enquiry information only for legitimate operational, legal and commission-reconciliation purposes. You may request access, correction or deletion where applicable by contacting ${escapeHtml(config.contactEmail)}.</p><h2>Partner sharing</h2><p>When you consent, the submitted details are shared with Vodacom Business so it can contact you and confirm coverage, eligibility, pricing and next steps.</p>`],
    terms: ['Terms and conditions', `<h2>Connectivity enquiry service</h2><p>BackyardConnect.co.za helps property owners explore connectivity options. Connectivity services, installation, activation and network performance are provided by the selected connectivity provider.</p><h2>Indicative information</h2><p>Package prices, room ranges and descriptions are provided as guidance. Vodacom confirms current availability, coverage, eligibility, final pricing and contract terms.</p><h2>No approval guarantee</h2><p>Submitting an enquiry does not create a contract, guarantee approval or reserve a product.</p><h2>Customer information</h2><p>You must provide accurate information and have authority to submit the property details. You agree that the selected partner may contact you regarding the enquiry.</p><h2>Availability</h2><p>We aim to keep the service available and secure, but may perform maintenance or suspend access where required to protect the platform.</p>`],
    popia: ['POPIA notice', `<h2>Responsible party</h2><p>BackyardConnect determines how enquiry information is collected and managed for the connectivity enquiry process.</p><h2>Purpose and lawful basis</h2><p>We process your information with your consent to manage the enquiry, share it with the connectivity partner and manage legitimate operational records.</p><h2>Information operator and recipient</h2><p>Vodacom Business receives the information as the connectivity partner and processes it according to its own legal obligations and notices.</p><h2>Your choices</h2><p>You may withdraw consent before the enquiry is shared, ask for correction, object to certain processing, or lodge a complaint with the Information Regulator.</p><h2>Contact</h2><p>Send privacy requests to ${escapeHtml(config.contactEmail)}.</p>`],
  };
  const [title, body] = contentMap[type];
  const content = `<section class="page-hero compact"><div class="container"><p class="eyebrow">Legal</p><h1>${title}</h1><p>Last updated: 17 August 2026</p></div></section><article class="legal-content container">${body}</article>`;
  return layout({ title: `${title} | BackyardConnect`, description: title, active: '', content, config, path: `/${type}` });
}

function thankYouPage({ config, query }) {
  const reference = escapeHtml(query.get('reference') || 'BC-RECEIVED');
  const content = `<section class="confirmation-page"><div class="confirmation-card"><span class="confirmation-icon">${icon('check')}</span><p class="eyebrow">Enquiry received</p><h1>Thank you. We’ve recorded your enquiry.</h1><p>Your BackyardConnect reference is:</p><strong class="reference-code">${reference}</strong><p>A connectivity specialist will contact you to confirm coverage, eligibility, pricing and next steps.</p><div class="confirmation-actions"><a class="button button-dark" href="/">Back to home</a><a class="button button-outline" href="/faqs">Read FAQs</a></div></div></section>`;
  return layout({ title: 'Enquiry received | BackyardConnect', description: 'Your BackyardConnect enquiry has been received.', active: '', content, config, path: '/thank-you' });
}

export function renderPage(pathname, context) {
  const normalized = pathname !== '/' ? pathname.replace(/\/$/, '') : '/';
  if (normalized === '/') return homePage(context);
  if (normalized === '/how-it-works') return howPage(context);
  if (normalized === '/packages') return packagesPage(context);
  if (normalized === '/faqs') return faqPage(context);
  if (normalized === '/contact') return contactPage(context);
  if (normalized === '/privacy') return legalPage({ ...context, type: 'privacy' });
  if (normalized === '/terms') return legalPage({ ...context, type: 'terms' });
  if (normalized === '/popia') return legalPage({ ...context, type: 'popia' });
  if (normalized === '/thank-you') return thankYouPage(context);
  return null;
}

export function renderNotFound(config) {
  const content = `<section class="confirmation-page"><div class="confirmation-card"><p class="eyebrow">404</p><h1>We could not find that page.</h1><p>Return to BackyardConnect and choose the option you need.</p><a class="button button-dark" href="/">Go home</a></div></section>`;
  return layout({ title: 'Page not found | BackyardConnect', description: 'Page not found.', active: '', content, config, path: '/404' });
}

export function renderAdminPage(config) {
  return `<!doctype html><html lang="en-ZA"><head><meta charset="utf-8">${metadata('BackyardConnect operations', 'Internal connectivity enquiry operations dashboard.', config, '/admin')}</head><body class="admin-body"><div id="admin-root" class="admin-loading"><p>Loading BackyardConnect operations…</p></div><script src="/admin.js" defer></script></body></html>`;
}
