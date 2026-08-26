import { Injectable, signal } from '@angular/core';

export type WsTheme = 'dark' | 'light';

const THEME_KEY = 'ws_theme';
const THEME_COLORS: Record<WsTheme, string> = {
  dark: '#0a0908',
  light: '#f5f2ec',
};

/**
 * Light/dark theme for the portal CHROME (the ◐ toggle from the
 * 2026-08-26-v02 canvas). theme-boot.js applies the persisted value before
 * first paint; this service owns it afterwards. Slides content stays dark
 * by design — it is a presentation deck.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<WsTheme>(
    document.documentElement.getAttribute('data-ws-theme') === 'light'
      ? 'light'
      : 'dark',
  );

  toggle() {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: WsTheme) {
    this.theme.set(theme);
    if (theme === 'light') {
      document.documentElement.setAttribute('data-ws-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-ws-theme');
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme]);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // storage unavailable — the toggle still works for this visit
    }
  }
}
