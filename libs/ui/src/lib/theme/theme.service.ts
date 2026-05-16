import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'auto' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'sintezaur:theme';

/**
 * Three-state theme switch (auto / dark / light). `auto` follows the OS
 * via `prefers-color-scheme` and updates live if the user toggles their
 * system theme. `dark` / `light` are explicit user overrides persisted
 * in localStorage and re-applied on the next visit.
 *
 * The resolved theme is mirrored onto `<html data-theme="...">` so the
 * token CSS in libs/ui picks it up without per-app wiring.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly _mode = signal<ThemeMode>(this.readInitialMode());
  private readonly _systemPrefersDark = signal<boolean>(this.detectSystemDark());

  readonly mode = this._mode.asReadonly();
  readonly resolved = computed<ResolvedTheme>(() => {
    const m = this._mode();
    if (m === 'auto') return this._systemPrefersDark() ? 'dark' : 'light';
    return m;
  });

  constructor() {
    this.applyResolved();
    this.watchSystemPreference();
  }

  setMode(next: ThemeMode): void {
    this._mode.set(next);
    try {
      // Persist every choice (including `auto`) so an explicit pick
      // sticks even after we changed the default for new visitors.
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode / SSR) — keep the in-memory choice
    }
    this.applyResolved();
  }

  cycle(): void {
    const order: ThemeMode[] = ['auto', 'dark', 'light'];
    const idx = order.indexOf(this._mode());
    this.setMode(order[(idx + 1) % order.length]);
  }

  private readInitialMode(): ThemeMode {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'dark' || raw === 'light' || raw === 'auto') return raw;
    } catch {
      // ignore
    }
    // Brand default: site loads in light mode for users who never picked
    // a theme. Users who explicitly choose `auto`/`dark`/`light` get their
    // saved preference back via the branch above.
    return 'light';
  }

  private detectSystemDark(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private watchSystemPreference(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      this._systemPrefersDark.set(e.matches);
      if (this._mode() === 'auto') this.applyResolved();
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
    } else {
      // Safari < 14 fallback
      mql.addListener(handler);
    }
  }

  private applyResolved(): void {
    const html = this.document.documentElement;
    html.setAttribute('data-theme', this.resolved());
  }
}
