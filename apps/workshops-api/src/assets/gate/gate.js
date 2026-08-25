// Gate page logic — external file because helmet's default CSP blocks
// inline scripts. Talks only to /api/auth/* and /api/workshops.
(function () {
  const I18N = {
    en: {
      tagline: 'Hands-on courses & workshop materials',
      workshop: 'WORKSHOP',
      password: 'WORKSHOP PASSWORD',
      enter: 'ENTER',
      panel_password: 'SUPERADMIN PASSWORD',
      panel_enter: 'OPEN PANEL',
      panel_link: 'Control panel',
      back: 'Back to workshop login',
      bad_password: 'Wrong password. Check the one you received and try again.',
      throttled: 'Too many attempts — wait a minute, then try again.',
      missing_password: 'Enter the workshop password.',
      error: 'Something went wrong. Try again.',
    },
    ro: {
      tagline: 'Cursuri hands-on & materiale de workshop',
      workshop: 'WORKSHOP',
      password: 'PAROLA WORKSHOPULUI',
      enter: 'INTRĂ',
      panel_password: 'PAROLA DE SUPERADMIN',
      panel_enter: 'DESCHIDE PANOUL',
      panel_link: 'Panou de control',
      back: 'Înapoi la login-ul de workshop',
      bad_password: 'Parolă greșită. Verifică parola primită și încearcă din nou.',
      throttled: 'Prea multe încercări — așteaptă un minut și încearcă din nou.',
      missing_password: 'Scrie parola workshopului.',
      error: 'Ceva n-a mers. Încearcă din nou.',
    },
  };
  let lang = 'en';
  try {
    const stored = localStorage.getItem('ws_lang');
    if (stored === 'ro' || stored === 'en') lang = stored;
  } catch { /* ignore */ }
  let superadmin = false;
  let workshops = [];

  function t(key) { return I18N[lang][key] || key; }
  function $(id) { return document.getElementById(id); }

  function render() {
    document.documentElement.lang = lang;
    $('lang-en').classList.toggle('on', lang === 'en');
    $('lang-ro').classList.toggle('on', lang === 'ro');
    const nodes = document.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const key = nodes[i].getAttribute('data-i18n');
      if (key === 'enter') {
        nodes[i].textContent = superadmin ? t('panel_enter') : t('enter');
      } else if (key === 'panel_link') {
        nodes[i].textContent = superadmin ? t('back') : t('panel_link');
      } else {
        nodes[i].textContent = t(key);
      }
    }
    $('workshop-block').classList.toggle('hidden', superadmin);
    $('superadmin-block').classList.toggle('hidden', !superadmin);
    const single = workshops.length === 1;
    $('select-block').classList.toggle('hidden', single);
    $('workshop-name').classList.toggle('hidden', !single);
    if (single) {
      $('workshop-name').textContent =
        lang === 'ro' ? workshops[0].titleRo : workshops[0].titleEn;
    }
    const sel = $('workshop');
    sel.innerHTML = '';
    for (let j = 0; j < workshops.length; j++) {
      const opt = document.createElement('option');
      opt.value = workshops[j].slug;
      opt.textContent =
        lang === 'ro' ? workshops[j].titleRo : workshops[j].titleEn;
      sel.appendChild(opt);
    }
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem('ws_lang', next); } catch { /* ignore */ }
    render();
  }

  function showError(msg) {
    const el = $('error');
    el.textContent = msg;
    el.classList.add('show');
  }

  $('lang-en').addEventListener('click', function () { setLang('en'); });
  $('lang-ro').addEventListener('click', function () { setLang('ro'); });
  $('mode').addEventListener('click', function () {
    superadmin = !superadmin;
    $('error').classList.remove('show');
    render();
  });

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    $('error').classList.remove('show');
    let body, url;
    if (superadmin) {
      const sp = $('sa-password').value;
      if (!sp) return showError(t('missing_password'));
      url = '/api/auth/superadmin';
      body = { password: sp };
    } else {
      const p = $('password').value;
      if (!p) return showError(t('missing_password'));
      url = '/api/auth/login';
      body = { slug: $('workshop').value || (workshops[0] && workshops[0].slug), password: p };
    }
    $('submit').disabled = true;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (res.ok) { window.location.reload(); return null; }
        if (res.status === 429) throw new Error('throttled');
        if (res.status === 401) throw new Error('bad_password');
        throw new Error('error');
      })
      .catch(function (err) {
        showError(t(err.message === 'throttled' ? 'throttled'
          : err.message === 'bad_password' ? 'bad_password' : 'error'));
      })
      .then(function () { $('submit').disabled = false; });
  });

  fetch('/api/workshops')
    .then(function (r) { return r.json(); })
    .then(function (list) { workshops = Array.isArray(list) ? list : []; render(); })
    .catch(function () { render(); });

  render();
})();
