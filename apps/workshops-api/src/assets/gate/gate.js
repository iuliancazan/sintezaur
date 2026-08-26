// Gate logic — external file because helmet's default CSP blocks inline
// scripts. Two screens: Sintezaur-branded workshop selection, then the
// selected workshop's own login (username + password).
(function () {
  const I18N = {
    en: {
      kicker: 'Hands-on courses & workshop materials',
      select_sub:
        'Pick your workshop. Each one has its own access details — use the username and password you received.',
      footer: "Bucharest's community for people who love synthesis",
      loading: 'Loading…',
      empty: 'No workshops are open right now.',
      workshops: 'WORKSHOPS',
      username: 'USERNAME',
      password: 'PASSWORD',
      enter: 'ENTER',
      bad_credentials:
        'Wrong username or password. Check the details you received and try again.',
      throttled: 'Too many attempts — wait a minute, then try again.',
      missing: 'Enter the username and the password.',
      error: 'Something went wrong. Try again.',
      show_password: 'Show password',
      hide_password: 'Hide password',
      helper: 'Use the access details you received.',
      theme_to_light: 'Switch to the light theme',
      theme_to_dark: 'Switch to the dark theme',
    },
    ro: {
      kicker: 'Cursuri hands-on & materiale de workshop',
      select_sub:
        'Alege workshopul tău. Fiecare are propriile date de acces — folosește utilizatorul și parola primite.',
      footer: 'Comunitatea din București pentru oamenii care iubesc sinteza',
      loading: 'Se încarcă…',
      empty: 'Niciun workshop deschis momentan.',
      workshops: 'WORKSHOPS',
      username: 'UTILIZATOR',
      password: 'PAROLA',
      enter: 'INTRĂ',
      bad_credentials:
        'Utilizator sau parolă greșite. Verifică datele primite și încearcă din nou.',
      throttled: 'Prea multe încercări — așteaptă un minut și încearcă din nou.',
      missing: 'Completează utilizatorul și parola.',
      error: 'Ceva n-a mers. Încearcă din nou.',
      show_password: 'Arată parola',
      hide_password: 'Ascunde parola',
      helper: 'Folosește datele de acces primite.',
      theme_to_light: 'Treci pe tema deschisă',
      theme_to_dark: 'Treci pe tema închisă',
    },
  };
  let lang = 'en';
  try {
    const stored = localStorage.getItem('ws_lang');
    if (stored === 'ro' || stored === 'en') lang = stored;
  } catch { /* ignore */ }
  let workshops = [];
  let selected = null;

  function t(key) { return I18N[lang][key] || key; }
  function $(id) { return document.getElementById(id); }
  function brandFromSlug(slug) {
    return slug.replace(/-/g, ' ').toUpperCase();
  }

  function renderTexts() {
    document.documentElement.lang = lang;
    const pills = document.querySelectorAll('.pill');
    for (const pill of pills) {
      pill.classList.toggle('on', pill.getAttribute('data-lang') === lang);
    }
    const nodes = document.querySelectorAll('[data-i18n]');
    for (const node of nodes) {
      node.textContent = t(node.getAttribute('data-i18n'));
    }
    syncPasswordToggle();
    syncThemeButtons();
    renderList();
    renderLogin();
  }

  function syncPasswordToggle() {
    const hidden = $('password').type === 'password';
    const toggle = $('pw-toggle');
    toggle.setAttribute('aria-label', t(hidden ? 'show_password' : 'hide_password'));
    toggle.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    $('eye-show').classList.toggle('hidden', !hidden);
    $('eye-hide').classList.toggle('hidden', hidden);
  }

  // Light/dark chrome — shared with the SPA (ws_theme; /theme-boot.js
  // applied the persisted value before first paint).
  function currentTheme() {
    return document.documentElement.getAttribute('data-ws-theme') === 'light'
      ? 'light'
      : 'dark';
  }

  function syncThemeButtons() {
    const label = t(currentTheme() === 'dark' ? 'theme_to_light' : 'theme_to_dark');
    for (const btn of document.querySelectorAll('.theme-btn')) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    if (next === 'light') {
      document.documentElement.setAttribute('data-ws-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-ws-theme');
    }
    try { localStorage.setItem('ws_theme', next); } catch { /* ignore */ }
    syncThemeButtons();
  }

  function renderList() {
    const list = $('list');
    list.innerHTML = '';
    if (workshops.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = t('empty');
      list.appendChild(p);
      return;
    }
    for (const w of workshops) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      const main = document.createElement('div');
      const brand = document.createElement('p');
      brand.className = 'cbrand';
      brand.textContent = brandFromSlug(w.slug);
      const title = document.createElement('h2');
      title.className = 'ctitle';
      title.textContent = lang === 'ro' ? w.titleRo : w.titleEn;
      main.appendChild(brand);
      main.appendChild(title);
      const sub = lang === 'ro' ? w.subtitleRo : w.subtitleEn;
      if (sub) {
        const p = document.createElement('p');
        p.className = 'csub';
        p.textContent = sub;
        main.appendChild(p);
      }
      const metaParts = [];
      if (w.eventDate) {
        metaParts.push(
          new Date(w.eventDate + 'T00:00:00').toLocaleDateString(
            lang === 'ro' ? 'ro-RO' : 'en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' },
          ),
        );
      }
      if (w.venue) metaParts.push(w.venue);
      if (metaParts.length > 0) {
        const p = document.createElement('p');
        p.className = 'cmeta';
        p.textContent = metaParts.join(' · ');
        main.appendChild(p);
      }
      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '→';
      card.appendChild(main);
      card.appendChild(arrow);
      card.addEventListener('click', function () { openLogin(w); });
      list.appendChild(card);
    }
  }

  function renderLogin() {
    if (!selected) return;
    $('login-brand').textContent = brandFromSlug(selected.slug);
    const title = lang === 'ro' ? selected.titleRo : selected.titleEn;
    $('login-title').textContent = title || brandFromSlug(selected.slug);
    const sub = lang === 'ro' ? selected.subtitleRo : selected.subtitleEn;
    $('login-sub').textContent = sub || '';
  }

  function openLogin(w) {
    selected = w;
    $('error').classList.remove('show');
    renderLogin();
    $('screen-select').classList.add('hidden');
    $('screen-login').classList.remove('hidden');
    $('username').focus();
  }

  function backToSelect() {
    selected = null;
    $('screen-login').classList.add('hidden');
    $('screen-select').classList.remove('hidden');
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem('ws_lang', next); } catch { /* ignore */ }
    renderTexts();
  }

  function showError(msg) {
    const el = $('error');
    el.textContent = msg;
    el.classList.add('show');
  }

  for (const pill of document.querySelectorAll('.pill')) {
    pill.addEventListener('click', function () {
      setLang(pill.getAttribute('data-lang'));
    });
  }
  $('back').addEventListener('click', backToSelect);

  $('pw-toggle').addEventListener('click', function () {
    const input = $('password');
    input.type = input.type === 'password' ? 'text' : 'password';
    syncPasswordToggle();
    input.focus();
  });

  for (const btn of document.querySelectorAll('.theme-btn')) {
    btn.addEventListener('click', toggleTheme);
  }

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    $('error').classList.remove('show');
    const username = $('username').value.trim();
    const password = $('password').value;
    if (!username || !password) return showError(t('missing'));
    $('submit').disabled = true;
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: selected ? selected.slug : '', username: username, password: password }),
    })
      .then(function (res) {
        if (res.ok) {
          // Land in the workshop hub. A deep link INTO this workshop
          // (e.g. /w/x/handbook) survives the gate and is honoured.
          const base = '/w/' + (selected ? selected.slug : '');
          const path = window.location.pathname;
          if (selected && path.indexOf(base + '/') === 0 && path !== base + '/login') {
            window.location.reload();
          } else {
            window.location.assign(selected ? base : '/');
          }
          return null;
        }
        if (res.status === 429) throw new Error('throttled');
        if (res.status === 401) throw new Error('bad_credentials');
        throw new Error('error');
      })
      .catch(function (err) {
        showError(t(err.message === 'throttled' ? 'throttled'
          : err.message === 'bad_credentials' ? 'bad_credentials' : 'error'));
      })
      .then(function () { $('submit').disabled = false; });
  });

  fetch('/api/workshops')
    .then(function (r) { return r.json(); })
    .then(function (list) {
      workshops = Array.isArray(list) ? list : [];
      renderTexts();
      // Deep link (e.g. /w/sequential-fourm/handbook): skip the selection
      // screen and open that workshop's own login directly.
      const match = window.location.pathname.match(/^\/w\/([^/]+)/);
      const deepLinked = match
        ? workshops.find(function (w) { return w.slug === match[1]; })
        : undefined;
      if (deepLinked) openLogin(deepLinked);
    })
    .catch(function () { renderTexts(); });

  renderTexts();
})();
