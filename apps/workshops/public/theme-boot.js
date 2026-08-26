// Applies the persisted theme BEFORE first paint (no light/dark flash).
// External file on purpose: the CSP has no 'unsafe-inline' for scripts.
// Shared with the production gate (same localStorage key, ws_theme).
(function () {
  try {
    if (localStorage.getItem('ws_theme') === 'light') {
      document.documentElement.setAttribute('data-ws-theme', 'light');
    }
  } catch {
    // storage unavailable — stay on the dark default
  }
})();
