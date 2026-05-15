import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TPipe } from '../i18n/t.pipe';
import { AuthService } from '../auth/auth.service';

/**
 * `/cont/setari` shell — horizontal tabs over the existing
 * Profil / Parolă / Email / Datele mele / Preferințe notificări /
 * Utilizatori blocați pages. Each tab keeps its standalone page
 * component as the route's child, so we did not rewrite the forms.
 *
 * Old paths (`/cont/profil`, `/cont/parola`, …) redirect into the
 * matching tab so bookmarks survive.
 */
@Component({
  selector: 'app-settings-shell-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="settings">
      <header class="settings__head">
        <h1>{{ 'account.settings.title' | t }}</h1>
        @if (auth.currentUser(); as user) {
          <p class="settings__greeting">
            {{ 'account.logged_in_as' | t: { email: user.email } }}
          </p>
        }
      </header>

      <nav class="settings__tabs" [attr.aria-label]="'account.settings.tabs_aria' | t">
        <a
          routerLink="profil"
          routerLinkActive="is-active"
          class="settings__tab"
        >
          {{ 'account.menu.profile' | t }}
        </a>
        <a routerLink="parola" routerLinkActive="is-active" class="settings__tab">
          {{ 'account.menu.password' | t }}
        </a>
        <a routerLink="email" routerLinkActive="is-active" class="settings__tab">
          {{ 'account.menu.email' | t }}
        </a>
        <a routerLink="date" routerLinkActive="is-active" class="settings__tab">
          {{ 'account.settings.my_data' | t }}
        </a>
        <a
          routerLink="preferinte"
          routerLinkActive="is-active"
          class="settings__tab"
        >
          {{ 'account.menu.notification_preferences' | t }}
        </a>
        <a routerLink="blocuri" routerLinkActive="is-active" class="settings__tab">
          {{ 'account.settings.blocked_users' | t }}
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
      .settings__greeting {
        color: var(--fg-muted);
        margin: 0;
        font-family: var(--font-mono);
        font-size: 13px;
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

      /*
       * The legacy sub-pages each render their own back-link to /cont
       * and their own h1; inside the shell those are noisy. Hide them
       * here — the shell already provides title + breadcrumb.
       */
      .settings__panel :is(.profile__back, .change-pwd__back, .change-email__back,
        .data__back, .pref__back, .blocks__back) {
        display: none;
      }
    `,
  ],
})
export class SettingsShellPage {
  readonly auth = inject(AuthService);
}
