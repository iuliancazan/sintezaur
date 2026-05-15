/* ============================================================
   reveals.js — subtle scroll-in animations, sitewide
   ------------------------------------------------------------
   Behavior
   - Sets html.has-reveals SYNCHRONOUSLY so styles.css can hide
     direct children of .shell / .main__pad before first paint.
   - On DOM ready, scans for "section-like" top-level children
     in the main content host and marks them [data-reveal].
   - IntersectionObserver promotes each target to .is-in once,
     triggering a soft 14px rise + fade.
   - [data-reveal-stagger] groups stagger their own children.
   - [data-count-to="N"] elements count up from 0 once visible.
   - Respects prefers-reduced-motion.
   ============================================================ */
(function () {
  // Run as early as <head> parsing — before <body> is rendered.
  // This is what prevents FOUC.
  document.documentElement.classList.add('has-reveals');

  // Selectors of containers whose direct children should auto-reveal.
  // .shell (public pages) and .main__pad (admin pages).
  const HOST_SELECTORS = [
    'body > .shell',
    'body > .admin-shell .main__pad'
  ];

  // Class lists that should be auto-staggered (grids / scrollers)
  // even if not explicitly tagged.
  const AUTO_STAGGER_SELECTORS = [
    '.bazar-scroll',
    '.forum-list',
    '.catalog',
    '.revista-grid',
    '.tez-grid',
    '.bz-grid',
    '.rev-grid',
    '.fm-feed',
    '.fm-trending__scroll',
    '.stat-strip',
    '.tez-header__stats',
    '.pulse--aside'
  ].join(',');

  function init() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1) Auto-tag direct children of each host with [data-reveal]
    HOST_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(host => {
        Array.from(host.children).forEach(child => {
          if (child.hasAttribute('data-no-reveal')) return;
          if (!child.hasAttribute('data-reveal')) {
            child.setAttribute('data-reveal', '');
          }
        });
      });
    });

    // 2) Auto-tag known grid containers as stagger groups
    document.querySelectorAll(AUTO_STAGGER_SELECTORS).forEach(el => {
      if (!el.hasAttribute('data-reveal-stagger')) {
        el.setAttribute('data-reveal-stagger', '');
      }
    });

    // Reduced motion: snap everything visible, skip count-up animation
    if (reduced) {
      document.querySelectorAll('[data-reveal], [data-reveal-stagger]')
        .forEach(el => el.classList.add('is-in'));
      document.querySelectorAll('[data-count-to]').forEach(el => {
        const v = parseInt(el.dataset.countTo, 10);
        if (Number.isFinite(v)) {
          el.textContent = el.dataset.countFormat === 'comma'
            ? v.toLocaleString('ro-RO').replace(/\./g, ',')
            : String(v);
        }
      });
      return;
    }

    // 3) Count-up
    function countUp(el) {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      const target = parseInt(el.dataset.countTo, 10);
      if (!Number.isFinite(target)) return;
      const format = el.dataset.countFormat === 'comma'
        ? (n) => n.toLocaleString('ro-RO').replace(/\./g, ',')
        : (n) => String(n);
      const duration = 900;
      const start = performance.now();
      el.classList.add('is-counting');
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
        const value = Math.round(target * eased);
        el.textContent = format(value);
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          el.classList.remove('is-counting');
        }
      }
      requestAnimationFrame(frame);
    }

    // 4) IntersectionObserver
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-in');
        el.querySelectorAll('[data-count-to]').forEach(countUp);
        io.unobserve(el);
      });
    }, {
      // Trigger slightly before fully on screen
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });

    document.querySelectorAll('[data-reveal], [data-reveal-stagger]')
      .forEach(el => io.observe(el));

    // 5) Page header / hero is above-the-fold — kick off immediately
    // so it animates on load rather than waiting on observer.
    requestAnimationFrame(() => {
      document.querySelectorAll(
        '.hero[data-reveal], .tez-header[data-reveal], .ph-row[data-reveal]'
      ).forEach(el => {
        el.classList.add('is-in');
        el.querySelectorAll('[data-count-to]').forEach(countUp);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
