import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

const STORAGE_KEY = 'sintezaur.cookies.dismissed.v1';

/**
 * Lightweight cookies notice per RO law (Legea 506/2004 modificată +
 * GDPR). We use only strictly-necessary cookies (auth + theme + locale),
 * which technically don't require explicit consent — but a single
 * dismissible information banner is the polite minimum and avoids
 * future legal noise. No accept/reject buttons because there's nothing
 * to opt out of: blocking auth cookies just breaks login.
 *
 * State persists in `localStorage` (not a cookie — recursion would
 * be unfortunate). Mounts only in the browser (SSR-safe).
 */
@Component({
  selector: 'app-cookies-banner',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="cookies" role="region" aria-label="Notă despre cookies">
        <p class="cookies__text">
          Folosim doar cookies strict necesare pentru funcționarea
          site-ului (autentificare, temă, limbă). Nu folosim
          cookies de marketing.
          <a routerLink="/cookies">Citește politica de cookies →</a>
        </p>
        <button
          class="cookies__dismiss"
          type="button"
          aria-label="Închide notă"
          (click)="dismiss()"
        >
          Am înțeles
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host { display: contents; }
      .cookies {
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: 16px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        max-width: 880px;
        margin: 0 auto;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      }
      .cookies__text {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--ink);
        flex: 1;
      }
      .cookies__text a {
        color: var(--accent);
        text-decoration: underline;
      }
      .cookies__dismiss {
        flex-shrink: 0;
        background: var(--accent);
        color: var(--accent-ink, #fff);
        border: none;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
      }
      @media (max-width: 600px) {
        .cookies {
          flex-direction: column;
          align-items: stretch;
        }
        .cookies__dismiss { width: 100%; }
      }
    `,
  ],
})
export class CookiesBanner {
  private readonly platformId = inject(PLATFORM_ID);
  readonly visible = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) this.visible.set(true);
    } catch {
      // localStorage unavailable (private browsing edge case) — just show.
      this.visible.set(true);
    }
  }

  dismiss(): void {
    this.visible.set(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // best effort only
    }
  }
}
