(() => {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.primary-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
  }

  const params = new URLSearchParams(location.search);
  const marketing = {
    utmSource: params.get('utm_source') || sessionStorage.getItem('bc_utm_source') || '',
    utmMedium: params.get('utm_medium') || sessionStorage.getItem('bc_utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || sessionStorage.getItem('bc_utm_campaign') || '',
  };
  Object.entries(marketing).forEach(([key, value]) => {
    if (value) sessionStorage.setItem(`bc_${key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)}`, value);
    document.querySelectorAll(`[name="${key}"]`).forEach((input) => { input.value = value; });
  });

  function packageTarget(slug) {
    const url = new URL('/contact', location.origin);
    url.searchParams.set('package', slug);
    url.hash = 'referral-form';
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function choosePackage(slug) {
    if (!slug) return;
    const select = document.querySelector('#packageSlug');
    const form = document.querySelector('#referral-form');

    // On the dedicated enquiry page, select the package visibly and stay in place.
    if (select && form) {
      select.value = slug;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      form.classList.add('package-prefilled');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => select.focus(), 450);
      return;
    }

    // From Home or Packages, selecting a package is a real navigation action.
    location.assign(packageTarget(slug));
  }

  // If the enquiry page was opened from a package card, preselect that package.
  const requestedPackage = params.get('package');
  const initialPackageSelect = document.querySelector('#packageSlug');
  if (requestedPackage && initialPackageSelect) {
    const exists = Array.from(initialPackageSelect.options).some((option) => option.value === requestedPackage);
    if (exists) {
      initialPackageSelect.value = requestedPackage;
      document.querySelector('#referral-form')?.classList.add('package-prefilled');
    }
  }

  document.querySelectorAll('.package-card[data-package-choice]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, select, input')) return;
      choosePackage(card.dataset.packageChoice);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choosePackage(card.dataset.packageChoice);
      }
    });
  });

  document.querySelectorAll('.choose-package').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      choosePackage(button.dataset.packageChoice);
    });
  });

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
    form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
  }

  function showErrors(form, fields = {}) {
    Object.entries(fields).forEach(([name, message]) => {
      const target = form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
      const field = form.elements[name];
      if (target) target.textContent = message;
      if (field) field.setAttribute('aria-invalid', 'true');
    });
    const first = Object.keys(fields)[0];
    if (first && form.elements[first]?.focus) form.elements[first].focus();
  }

  document.querySelectorAll('[data-referral-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form);
      const status = form.querySelector('.form-status');
      const button = form.querySelector('.submit-referral');
      const data = Object.fromEntries(new FormData(form).entries());
      data.consent = form.elements.consent.checked;
      button.disabled = true;
      button.classList.add('loading');
      status.classList.remove('error');
      status.textContent = 'Sending your enquiry securely…';
      try {
        const response = await fetch('/api/referrals', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
        });
        const payload = await response.json();
        if (!response.ok) {
          if (payload.fields) showErrors(form, payload.fields);
          throw new Error(payload.error || 'The enquiry could not be sent.');
        }
        status.textContent = 'Enquiry received.';
        location.assign(`/thank-you?reference=${encodeURIComponent(payload.reference)}`);
      } catch (error) {
        status.textContent = error.message || 'The enquiry could not be sent. Please try again.';
        status.classList.add('error');
      } finally {
        button.disabled = false;
        button.classList.remove('loading');
      }
    });
  });
})();
