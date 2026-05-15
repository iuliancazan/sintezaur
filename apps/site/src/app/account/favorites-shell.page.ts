import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TPipe } from '../i18n/t.pipe';

/**
 * `/cont/favorite` shell — horizontal tabs over the existing
 * Anunțuri salvate / Căutări salvate / Abonamente forum pages.
 * Same pattern as SettingsShellPage: each tab keeps its standalone
 * page component as the route's child, so the underlying lists
 * stay untouched.
 */
@Component({
  selector: 'app-favorites-shell-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="settings">
      <header class="settings__head">
        <h1>{{ 'account.favorites.title' | t }}</h1>
      </header>

      <nav class="settings__tabs" [attr.aria-label]="'account.favorites.tabs_aria' | t">
        <a routerLink="anunturi" routerLinkActive="is-active" class="settings__tab">
          {{ 'account.favorites.tab_listings' | t }}
        </a>
        <a routerLink="cautari" routerLinkActive="is-active" class="settings__tab">
          {{ 'account.favorites.tab_searches' | t }}
        </a>
        <a routerLink="abonamente" routerLinkActive="is-active" class="settings__tab">
          {{ 'account.menu.forum_subscriptions' | t }}
        </a>
      </nav>

      <section class="settings__panel">
        <router-outlet />
      </section>
    </main>
  `,
  styles: [
    `
      .settings {
        max-width: 880px;
        margin: 0 auto;
        padding: 32px var(--gutter-x) 64px;
      }
      .settings__head {
        margin-bottom: 24px;
      }
      .settings__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 40px);
        letter-spacing: 0.02em;
        margin: 0 0 6px;
        color: var(--fg);
      }
      .settings__tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        border-bottom: 1px solid var(--line);
        margin-bottom: 24px;
        overflow-x: auto;
      }
      .settings__tab {
        padding: 10px 16px;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-muted);
        border-bottom: 2px solid transparent;
        transition:
          color 0.15s ease,
          border-color 0.15s ease;
        min-height: auto;
        min-width: auto;
        white-space: nowrap;
      }
      .settings__tab:hover {
        color: var(--fg);
      }
      .settings__tab.is-active {
        color: var(--fg);
        border-bottom-color: var(--accent);
      }

      .settings__panel :is(.mw__back, .ss__back, .subs__back, .fs__back) {
        display: none;
      }
    `,
  ],
})
export class FavoritesShellPage {}
