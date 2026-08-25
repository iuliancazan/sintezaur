import { effect, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type Lang = 'en' | 'ro';

const STORAGE_KEY = 'ws_lang';

/**
 * One language signal for the whole app: UI chrome (via Transloco) and
 * course content (components read `lang()` directly). Default EN
 * (workshops-spec.md §6), persisted per browser.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);

  readonly lang = signal<Lang>(this.initial());

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.transloco.setActiveLang(lang);
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Storage can be unavailable (private mode) — language still works.
      }
      document.documentElement.lang = lang;
    });
  }

  set(lang: Lang) {
    this.lang.set(lang);
  }

  toggle() {
    this.lang.set(this.lang() === 'en' ? 'ro' : 'en');
  }

  private initial(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'ro') {
        return stored;
      }
    } catch {
      // fall through to default
    }
    return 'en';
  }
}
