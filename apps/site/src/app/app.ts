import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SzNavLink, SzTopbarComponent, SzTopbarUser } from '@sintezaur/ui';
import { AccountMenuComponent } from './account/account-menu.component';
import { AuthService } from './auth/auth.service';
import { I18nService } from './i18n/i18n.service';
import { TPipe } from './i18n/t.pipe';
import { FeedbackModal } from './feedback/feedback-modal.component';
import { CookiesBanner } from './legal/cookies-banner.component';
import { NotificationsPanelComponent } from './notifications/notifications-panel.component';
import { NotificationsService } from './notifications/notifications.service';
import { ToastContainer } from './ui/toast-container.component';

/**
 * Root shell — sticky topbar + router outlet + footer. The topbar is
 * driven by `SzTopbarComponent` (from `@sintezaur/ui`); labels and
 * nav links come from the i18n bundle. Auth pages render their own
 * focused chrome via `<app-auth-shell>` but live inside this root
 * shell so the topbar is always present.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    SzTopbarComponent,
    TPipe,
    NotificationsPanelComponent,
    AccountMenuComponent,
    CookiesBanner,
    ToastContainer,
    FeedbackModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sz-topbar
      [brandText]="brandText()"
      [logoSrc]="logoSrc"
      [links]="navLinks()"
      [navAriaLabel]="navAriaLabel()"
      [user]="topbarUser()"
      [showBell]="auth.isLoggedIn()"
      [bellBadge]="notifications.unread()"
      [accountMenuOpen]="accountMenuOpen()"
      (bellClick)="toggleNotifications()"
      (accountClick)="toggleAccountMenu()"
      (searchClick)="goToSearch()"
      [loginHref]="'/login'"
      [signupHref]="'/signup'"
      [accountHref]="'/cont'"
      [loginLabel]="loginLabel()"
      [signupLabel]="signupLabel()"
      [accountLabel]="accountLabel()"
      [searchAriaLabel]="searchAriaLabel()"
      [bellAriaLabel]="bellAriaLabel()"
      [themeAriaLabel]="themeAriaLabel()"
      [themeAutoLabel]="themeAutoLabel()"
      [themeLightLabel]="themeLightLabel()"
      [themeDarkLabel]="themeDarkLabel()"
    />

    @if (notificationsOpen()) {
      <app-notifications-panel (closed)="notificationsOpen.set(false)" />
    }

    @if (accountMenuOpen()) {
      <app-account-menu (closed)="accountMenuOpen.set(false)" />
    }

    <router-outlet />
    <app-cookies-banner />
    <app-toast-container />
    <app-feedback-modal />

    <footer class="app-foot">
      <div class="shell">
        <div class="app-foot__grid">
          <div class="app-foot__brand-col">
            <a class="app-foot__brand" routerLink="/">
              <img class="app-foot__mark" [src]="logoSrc" [alt]="brandText()" />
              <span class="app-foot__wordmark">{{ brandText() }}</span>
            </a>
            <p>{{ 'footer.tagline' | t }}</p>
          </div>
          <div class="app-foot__col">
            <h4>// {{ 'footer.col_platform' | t }}</h4>
            <ul>
              <li><a routerLink="/tezaur">{{ 'app.section.tezaur' | t }}</a></li>
              <li><a routerLink="/bazar">{{ 'app.section.bazar' | t }}</a></li>
              <li><a routerLink="/revista">{{ 'app.section.revista' | t }}</a></li>
              <li><a routerLink="/forum">{{ 'app.section.forum' | t }}</a></li>
            </ul>
          </div>
          <div class="app-foot__col">
            <h4>// {{ 'footer.col_about' | t }}</h4>
            <ul>
              <li><a routerLink="/despre">{{ 'footer.about' | t }}</a></li>
              <li><a routerLink="/contact">{{ 'footer.contact' | t }}</a></li>
              <li><a routerLink="/termeni">{{ 'footer.terms' | t }}</a></li>
              <li><a routerLink="/confidentialitate">{{ 'footer.privacy' | t }}</a></li>
              <li><a routerLink="/cookies">{{ 'footer.cookies' | t }}</a></li>
              <li><a routerLink="/regulament-forum">{{ 'footer.forum_rules' | t }}</a></li>
            </ul>
          </div>
          <div class="app-foot__col">
            <h4>// {{ 'footer.col_social' | t }}</h4>
            <ul>
              <li><a href="https://instagram.com/sintezaur" rel="noopener" target="_blank">Instagram</a></li>
              <li><a href="https://youtube.com/@sintezaur" rel="noopener" target="_blank">YouTube</a></li>
              <li><a href="https://bandcamp.com" rel="noopener" target="_blank">Bandcamp</a></li>
              <li><a href="https://soundcloud.com" rel="noopener" target="_blank">SoundCloud</a></li>
            </ul>
          </div>
        </div>
        <div class="app-foot__bottom">
          <span>{{ 'footer.copy' | t: { year: copyYear } }}</span>
          <div class="app-foot__locale">
            <span class="is-active">{{ 'footer.locale_ro' | t }}</span>
            <span>{{ 'footer.locale_en' | t }}</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      :host > router-outlet + * {
        flex: 1;
      }

      .app-foot {
        border-top: 1px solid var(--line);
        padding: 40px 0 24px;
        margin-top: 40px;
      }
      .app-foot__grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 32px;
        padding-bottom: 32px;
        border-bottom: 1px solid var(--line);
      }
      .app-foot__brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: auto;
        min-width: auto;
      }
      .app-foot__mark {
        width: 36px;
        height: 36px;
        filter: var(--logo-filter);
      }
      .app-foot__wordmark {
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        line-height: 1;
      }
      .app-foot__brand-col p {
        color: var(--fg-muted);
        max-width: 32ch;
        margin: 12px 0 0;
        font-size: 14px;
      }
      .app-foot__col h4 {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin: 0 0 12px;
        font-weight: 600;
      }
      .app-foot__col li {
        padding: 4px 0;
        font-size: 14px;
      }
      .app-foot__col a {
        min-height: auto;
        min-width: auto;
        display: inline;
      }
      .app-foot__col a:hover {
        color: var(--accent);
      }
      .app-foot__bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 24px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        color: var(--fg-subtle);
        flex-wrap: wrap;
        gap: 12px;
      }
      .app-foot__locale {
        display: flex;
        border: 1px solid var(--line);
      }
      .app-foot__locale span {
        padding: 4px 10px;
        border-right: 1px solid var(--line);
        text-transform: uppercase;
      }
      .app-foot__locale span:last-child {
        border-right: 0;
        color: var(--fg-subtle);
      }
      .app-foot__locale span.is-active {
        background: var(--bg-elev);
        color: var(--fg);
      }

      @media (max-width: 1100px) {
        .app-foot__grid {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .app-foot__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class App {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly notificationsOpen = signal(false);
  readonly accountMenuOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.notifications.startPolling();
      } else {
        this.notifications.stopPolling();
        this.notificationsOpen.set(false);
        this.accountMenuOpen.set(false);
      }
    });
  }

  toggleNotifications(): void {
    const next = !this.notificationsOpen();
    this.notificationsOpen.set(next);
    if (next) {
      this.accountMenuOpen.set(false);
      void this.notifications.loadList();
    }
  }

  toggleAccountMenu(): void {
    const next = !this.accountMenuOpen();
    this.accountMenuOpen.set(next);
    if (next) this.notificationsOpen.set(false);
  }

  goToSearch(): void {
    void this.router.navigate(['/cautare']);
  }

  readonly copyYear = new Date().getFullYear();
  readonly logoSrc = '/assets/brand/logo-white.png';

  readonly brandText = computed(() => this.i18n.t('app.name'));
  readonly navAriaLabel = computed(() => this.i18n.t('app.nav.aria'));
  readonly loginLabel = computed(() => this.i18n.t('app.actions.login_short'));
  readonly signupLabel = computed(() => this.i18n.t('app.actions.signup_short'));
  readonly accountLabel = computed(() => this.i18n.t('app.actions.account_menu'));
  readonly searchAriaLabel = computed(() => this.i18n.t('app.nav.search'));
  readonly bellAriaLabel = computed(() => this.i18n.t('app.nav.notifications'));
  readonly themeAriaLabel = computed(() => this.i18n.t('app.nav.theme'));
  readonly themeAutoLabel = computed(() => this.i18n.t('app.nav.theme_auto'));
  readonly themeLightLabel = computed(() => this.i18n.t('app.nav.theme_light'));
  readonly themeDarkLabel = computed(() => this.i18n.t('app.nav.theme_dark'));

  readonly navLinks = computed<SzNavLink[]>(() => [
    { label: this.i18n.t('app.section.home'), routerLink: '/' },
    { label: this.i18n.t('app.section.tezaur'), routerLink: '/tezaur' },
    { label: this.i18n.t('app.section.bazar'), routerLink: '/bazar' },
    { label: this.i18n.t('app.section.revista'), routerLink: '/revista' },
    { label: this.i18n.t('app.section.forum'), routerLink: '/forum' },
  ]);

  readonly topbarUser = computed<SzTopbarUser | null>(() => {
    const u = this.auth.currentUser();
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.fullName?.trim() || u.username,
      photo: u.avatarUrl ?? undefined,
    };
  });
}
