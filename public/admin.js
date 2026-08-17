(() => {
  const root = document.querySelector('#admin-root');
  const state = { csrfToken: '', username: '', referrals: [], selected: null, page: 1, pages: 1, status: '', search: '' };
  const statuses = [
    ['new','New'],['submitted_to_provider','Submitted to provider'],['contacted','Contacted'],['qualified','Qualified'],['converted','Converted'],['not_eligible','Not eligible'],['closed','Closed'],
  ];
  const commissionStatuses = [['pending','Pending'],['approved','Approved'],['paid','Paid'],['reversed','Reversed'],['not_applicable','Not applicable']];
  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatDate = (value) => value ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${value}Z`)) : '—';
  const label = (value, list) => list.find(([key]) => key === value)?.[1] || value;

  async function api(url, options = {}) {
    const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(state.csrfToken ? { 'x-csrf-token': state.csrfToken } : {}), ...options.headers };
    const response = await fetch(url, { ...options, headers });
    const type = response.headers.get('content-type') || '';
    const payload = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw Object.assign(new Error(payload.error || 'Request failed.'), { status: response.status, payload });
    return payload;
  }

  function loginView(message = '') {
    root.className = 'admin-login-page';
    root.innerHTML = `<main class="admin-login"><a class="admin-brand" href="/"><span class="admin-house">⌂</span><span><strong>BackyardConnect</strong><small>Operations</small></span></a><form id="admin-login-form"><h1>Staff sign in</h1><p>Use your authorised operations account.</p><label>Username<input name="username" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label>${message ? `<p class="admin-error">${escape(message)}</p>` : ''}<button class="button button-dark" type="submit">Sign in</button></form><a class="admin-home-link" href="/">← Back to website</a></main>`;
    document.querySelector('#admin-login-form').addEventListener('submit', login);
  }

  async function login(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      const payload = await api('/api/admin/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      state.csrfToken = payload.csrfToken;
      state.username = payload.username;
      await dashboardView();
    } catch (error) {
      loginView(error.message);
    }
  }

  async function bootstrap() {
    try {
      const session = await api('/api/admin/session');
      state.csrfToken = session.csrfToken;
      state.username = session.username;
      await dashboardView();
    } catch {
      loginView();
    }
  }

  async function dashboardView() {
    root.className = 'admin-app';
    root.innerHTML = `<aside class="admin-sidebar"><a class="admin-brand" href="/"><span class="admin-house">⌂</span><span><strong>BackyardConnect</strong><small>Operations</small></span></a><nav><button class="active" data-admin-view="referrals">▦ Enquiries</button><button data-admin-view="catalogue">⌁ Partner catalogue</button></nav><div class="admin-user"><span>${escape(state.username)}</span><button id="logout">Sign out</button></div></aside><main class="admin-main"><header class="admin-topbar"><div><p class="eyebrow">BackyardConnect</p><h1>Enquiry operations</h1></div><a class="button button-outline" href="/api/admin/referrals.csv">Export CSV</a></header><div id="admin-content"></div></main><div id="admin-modal"></div>`;
    document.querySelector('#logout').addEventListener('click', logout);
    document.querySelectorAll('[data-admin-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.adminView, button)));
    await loadReferrals();
  }

  function switchView(view, button) {
    document.querySelectorAll('[data-admin-view]').forEach((item) => item.classList.toggle('active', item === button));
    if (view === 'catalogue') loadCatalogue();
    else loadReferrals();
  }

  async function logout() {
    await api('/api/admin/logout', { method: 'POST', body: '{}' });
    state.csrfToken = '';
    loginView();
  }

  async function loadReferrals(page = 1) {
    state.page = page;
    const content = document.querySelector('#admin-content');
    content.innerHTML = '<div class="admin-skeleton">Loading enquiries…</div>';
    try {
      const [summary, result] = await Promise.all([
        api('/api/admin/summary'),
        api(`/api/admin/referrals?page=${page}&limit=25&status=${encodeURIComponent(state.status)}&search=${encodeURIComponent(state.search)}`),
      ]);
      state.referrals = result.items;
      state.pages = result.pages;
      content.innerHTML = `<section class="metric-grid"><article><small>All enquiries</small><strong>${summary.totals.total || 0}</strong></article><article><small>New</small><strong>${summary.totals.new_count || 0}</strong></article><article><small>Submitted</small><strong>${summary.totals.submitted_count || 0}</strong></article><article><small>Converted</small><strong>${summary.totals.converted_count || 0}</strong></article></section>
        <section class="admin-panel"><div class="admin-toolbar"><label class="search-field"><span class="sr-only">Search</span><input id="admin-search" type="search" value="${escape(state.search)}" placeholder="Search reference, customer, mobile or area"></label><select id="admin-status"><option value="">All statuses</option>${statuses.map(([key,name]) => `<option value="${key}" ${state.status === key ? 'selected' : ''}>${name}</option>`).join('')}</select><button id="apply-filter" class="button button-dark">Apply</button></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Reference</th><th>Customer</th><th>Property</th><th>Interest</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>${result.items.length ? result.items.map((item) => `<tr><td><strong>${escape(item.reference)}</strong></td><td>${escape(item.first_name)} ${escape(item.last_name)}<small>${escape(item.mobile)}</small></td><td>${escape(item.property_area)}<small>${item.rental_rooms} rooms</small></td><td>${escape(item.package_name || 'Help me choose')}<small>${escape(item.provider_name)}</small></td><td><span class="status-pill status-${escape(item.status)}">${escape(label(item.status, statuses))}</span></td><td>${formatDate(item.created_at)}</td><td><button class="row-action" data-open-referral="${item.id}">Open</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty-row">No referrals match this filter.</td></tr>'}</tbody></table></div><div class="pagination"><button id="previous-page" ${result.page <= 1 ? 'disabled' : ''}>← Previous</button><span>Page ${result.page} of ${result.pages}</span><button id="next-page" ${result.page >= result.pages ? 'disabled' : ''}>Next →</button></div></section>`;
      document.querySelector('#apply-filter').addEventListener('click', () => { state.search = document.querySelector('#admin-search').value.trim(); state.status = document.querySelector('#admin-status').value; loadReferrals(1); });
      document.querySelector('#admin-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') document.querySelector('#apply-filter').click(); });
      document.querySelector('#previous-page').addEventListener('click', () => loadReferrals(result.page - 1));
      document.querySelector('#next-page').addEventListener('click', () => loadReferrals(result.page + 1));
      document.querySelectorAll('[data-open-referral]').forEach((button) => button.addEventListener('click', () => openReferral(button.dataset.openReferral)));
    } catch (error) {
      if (error.status === 401) return loginView('Your session has expired.');
      content.innerHTML = `<p class="admin-error">${escape(error.message)}</p>`;
    }
  }

  async function openReferral(id) {
    const modal = document.querySelector('#admin-modal');
    modal.innerHTML = '<div class="modal-backdrop"><div class="admin-drawer"><p>Loading referral…</p></div></div>';
    const payload = await api(`/api/admin/referrals/${id}`);
    const item = payload.referral;
    modal.innerHTML = `<div class="modal-backdrop"><section class="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><button class="drawer-close" aria-label="Close">×</button><p class="eyebrow">${escape(item.reference)}</p><h2 id="drawer-title">${escape(item.first_name)} ${escape(item.last_name)}</h2><div class="detail-grid"><div><small>Mobile</small><strong>${escape(item.mobile)}</strong></div><div><small>Email</small><strong>${escape(item.email || '—')}</strong></div><div><small>Property area</small><strong>${escape(item.property_area)}</strong></div><div><small>Rental rooms</small><strong>${item.rental_rooms}</strong></div><div><small>Partner</small><strong>${escape(item.provider_name)}</strong></div><div><small>Package</small><strong>${escape(item.package_name || 'Help me choose')}</strong></div><div><small>Consent recorded</small><strong>${formatDate(item.consent_at)}</strong></div><div><small>Submitted</small><strong>${formatDate(item.created_at)}</strong></div></div><form id="referral-update-form"><label>Status<select name="status">${statuses.map(([key,name]) => `<option value="${key}" ${item.status === key ? 'selected' : ''}>${name}</option>`).join('')}</select></label><label>Vodacom reference<input name="providerReference" value="${escape(item.provider_reference || '')}" maxlength="120"></label><label>Commission status<select name="commissionStatus">${commissionStatuses.map(([key,name]) => `<option value="${key}" ${item.commission_status === key ? 'selected' : ''}>${name}</option>`).join('')}</select></label><label>Operations notes<textarea name="notes" rows="5" maxlength="5000">${escape(item.notes || '')}</textarea></label><p class="drawer-status" role="status"></p><button class="button button-dark" type="submit">Save update</button></form><div class="event-list"><h3>Activity history</h3>${payload.events.map((event) => `<article><span>${escape(event.event_type.replaceAll('_',' '))}</span><small>${escape(event.actor)} · ${formatDate(event.created_at)}</small></article>`).join('')}</div></section></div>`;
    modal.querySelector('.drawer-close').addEventListener('click', () => { modal.innerHTML = ''; });
    modal.querySelector('.modal-backdrop').addEventListener('click', (event) => { if (event.target === event.currentTarget) modal.innerHTML = ''; });
    modal.querySelector('#referral-update-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = event.currentTarget.querySelector('.drawer-status');
      const data = Object.fromEntries(new FormData(event.currentTarget));
      status.textContent = 'Saving…';
      try {
        await api(`/api/admin/referrals/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
        status.textContent = 'Saved.';
        await loadReferrals(state.page);
      } catch (error) {
        status.textContent = error.message;
      }
    });
  }

  async function loadCatalogue() {
    const content = document.querySelector('#admin-content');
    content.innerHTML = '<div class="admin-skeleton">Loading partner catalogue…</div>';
    try {
      const data = await api('/api/admin/catalogue');
      content.innerHTML = `<section class="admin-panel"><div class="panel-heading"><div><h2>Partner catalogue</h2><p>The public site only exposes partners and packages marked active and public.</p></div></div><div class="catalogue-grid">${data.providers.map((provider) => `<article class="catalogue-provider"><div class="provider-heading"><span style="background:${escape(provider.brand_color)}"></span><div><h3>${escape(provider.public_name)}</h3><small>${escape(provider.legal_name)}</small></div><em>${provider.active ? 'Active' : 'Inactive'} · ${provider.is_public ? 'Public' : 'Private'}</em></div><div class="catalogue-packages">${data.packages.filter((item) => item.provider_id === provider.id).map((item) => `<div><strong>${escape(item.name)}</strong><span>${escape(item.tier_speed)} · R${Math.round(item.monthly_fee_cents / 100)}/pm · ${item.min_rooms}–${item.max_rooms} rooms</span><em>${item.active ? 'Active' : 'Inactive'} · ${item.is_public ? 'Public' : 'Private'}</em></div>`).join('') || '<p>No packages.</p>'}</div></article>`).join('')}</div><details class="catalogue-add"><summary>Add a future partner</summary><form id="provider-form" class="catalogue-form"><label>Slug<input name="slug" required placeholder="partner-slug"></label><label>Legal name<input name="legalName" required></label><label>Public name<input name="publicName" required></label><label>Brand colour<input name="brandColor" value="#181818" pattern="#[0-9A-Fa-f]{6}"></label><label>Logo path<input name="logoPath" placeholder="/assets/partner.svg"></label><label>Sort order<input name="sortOrder" type="number" value="100"></label><label class="check-label"><input name="active" type="checkbox"> Active</label><label class="check-label"><input name="isPublic" type="checkbox"> Public</label><p class="catalogue-message"></p><button class="button button-dark">Add partner</button></form></details></section>`;
      document.querySelector('#provider-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = Object.fromEntries(formData);
        payload.active = formData.has('active'); payload.isPublic = formData.has('isPublic');
        const message = event.currentTarget.querySelector('.catalogue-message');
        try { await api('/api/admin/providers', { method: 'POST', body: JSON.stringify(payload) }); message.textContent = 'Partner added.'; await loadCatalogue(); }
        catch (error) { message.textContent = error.message; }
      });
    } catch (error) {
      content.innerHTML = `<p class="admin-error">${escape(error.message)}</p>`;
    }
  }

  bootstrap();
})();
