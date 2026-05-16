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
import { MobileMenuComponent } from './account/mobile-menu.component';
import { AuthService } from './auth/auth.service';
import { I18nService } from './i18n/i18n.service';
import { LocaleService } from './i18n/locale.service';
import { TPipe } from './i18n/t.pipe';
import { FeedbackModal } from './feedback/feedback-modal.component';
import { CookiesBanner } from './legal/cookies-banner.component';
import { NotificationsPanelComponent } from './notifications/notifications-panel.component';
import { NotificationsService } from './notifications/notifications.service';
import { ToastContainer } from './ui/toast-container.component';
import { V05SpriteComponent } from './ui/v05-sprite.component';

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
    MobileMenuComponent,
    CookiesBanner,
    ToastContainer,
    FeedbackModal,
    V05SpriteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-v05-sprite />

    <sz-topbar
      [brandText]="brandText()"
      [logoSrc]="logoSrc"
      [links]="navLinks()"
      [navAriaLabel]="navAriaLabel()"
      [user]="topbarUser()"
      [showBell]="auth.isLoggedIn()"
      [bellBadge]="notifications.unread()"
      [accountMenuOpen]="accountMenuOpen()"
      [showFavorites]="auth.isLoggedIn()"
      [showMessages]="auth.isLoggedIn()"
      [showBurger]="auth.isLoggedIn()"
      [burgerOpen]="mobileMenuOpen()"
      (bellClick)="toggleNotifications()"
      (accountClick)="toggleAccountMenu()"
      (favoritesClick)="goToFavorites()"
      (messagesClick)="goToMessages()"
      (burgerClick)="toggleMobileMenu()"
      (searchClick)="goToSearch()"
      [loginHref]="'/login'"
      [signupHref]="'/signup'"
      [accountHref]="'/cont'"
      [loginLabel]="loginLabel()"
      [signupLabel]="signupLabel()"
      [accountLabel]="accountLabel()"
      [searchAriaLabel]="searchAriaLabel()"
      [bellAriaLabel]="bellAriaLabel()"
      [favoritesAriaLabel]="favoritesAriaLabel()"
      [messagesAriaLabel]="messagesAriaLabel()"
      [burgerAriaLabel]="burgerAriaLabel()"
      [themeAriaLabel]="themeAriaLabel()"
      [themeAutoLabel]="themeAutoLabel()"
      [themeLightLabel]="themeLightLabel()"
      [themeDarkLabel]="themeDarkLabel()"
      [showLocaleSwitch]="true"
      [currentLocale]="locale.locale()"
      [localeAriaLabel]="localeAriaLabel()"
      (localeClick)="toggleLocale()"
    />

    @if (notificationsOpen()) {
      <app-notifications-panel (closed)="notificationsOpen.set(false)" />
    }

    @if (accountMenuOpen()) {
      <app-account-menu (closed)="accountMenuOpen.set(false)" />
    }

    @if (mobileMenuOpen()) {
      <app-mobile-menu (closed)="mobileMenuOpen.set(false)" />
    }

    <router-outlet />
    <app-cookies-banner />
    <app-toast-container />
    <app-feedback-modal />

    <footer class="foot">
      <div class="shell">
        <div class="foot__grid">
          <div class="foot__brand-col">
            <a class="brand" routerLink="/">
              <img class="brand__mark" [src]="logoSrc" [alt]="brandText()" />
              <span class="brand__wordmark">{{ brandText() }}</span>
            </a>
            <p>{{ 'footer.tagline' | t }}</p>
          </div>
          <div class="foot__col">
            <h4>// {{ 'footer.col_platform' | t }}</h4>
            <ul>
              <li><a routerLink="/tezaur">{{ 'app.section.tezaur' | t }}</a></li>
              <li><a routerLink="/bazar">{{ 'app.section.bazar' | t }}</a></li>
              <li><a routerLink="/revista">{{ 'app.section.revista' | t }}</a></li>
              <li><a routerLink="/forum">{{ 'app.section.forum' | t }}</a></li>
            </ul>
          </div>
          <div class="foot__col">
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
          <div class="foot__col">
            <h4>// {{ 'footer.col_social' | t }}</h4>
            <ul>
              <li><a href="https://instagram.com/sintezaur" rel="noopener" target="_blank">Instagram</a></li>
              <li><a href="https://youtube.com/@sintezaur" rel="noopener" target="_blank">YouTube</a></li>
              <li><a href="https://bandcamp.com" rel="noopener" target="_blank">Bandcamp</a></li>
              <li><a href="https://soundcloud.com" rel="noopener" target="_blank">SoundCloud</a></li>
            </ul>
          </div>
        </div>
        <div class="foot__bottom">
          <span>{{ 'footer.copy' | t: { year: copyYear } }}</span>
          <div class="locale">
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
      /* Footer link targets — global a/button rules in styles.scss enforce
         44×44 min, but footer link rows need tighter targets. */
      .foot__col a {
        min-height: auto;
        min-width: auto;
        display: inline;
      }
    `,
  ],
})
export class App {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly notificationsOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly mobileMenuOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.notifications.startPolling();
      } else {
        this.notifications.stopPolling();
        this.notificationsOpen.set(false);
        this.accountMenuOpen.set(false);
        this.mobileMenuOpen.set(false);
      }
    });
  }

  private closeAllPanels(): void {
    this.notificationsOpen.set(false);
    this.accountMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  toggleNotifications(): void {
    const next = !this.notificationsOpen();
    this.closeAllPanels();
    this.notificationsOpen.set(next);
    if (next) void this.notifications.loadList();
  }

  toggleAccountMenu(): void {
    const next = !this.accountMenuOpen();
    this.closeAllPanels();
    this.accountMenuOpen.set(next);
  }

  toggleMobileMenu(): void {
    const next = !this.mobileMenuOpen();
    this.closeAllPanels();
    this.mobileMenuOpen.set(next);
  }

  goToFavorites(): void {
    void this.router.navigate(['/cont/favorite']);
  }

  goToMessages(): void {
    void this.router.navigate(['/cont/mesaje']);
  }

  goToSearch(): void {
    void this.router.navigate(['/cautare']);
  }

  toggleLocale(): void {
    this.locale.setLocale(this.locale.locale() === 'en' ? 'ro' : 'en');
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
  readonly favoritesAriaLabel = computed(() => this.i18n.t('app.topbar.favorites'));
  readonly messagesAriaLabel = computed(() => this.i18n.t('app.topbar.messages'));
  readonly burgerAriaLabel = computed(() => this.i18n.t('app.topbar.burger'));
  readonly themeAriaLabel = computed(() => this.i18n.t('app.nav.theme'));
  readonly localeAriaLabel = computed(() =>
    this.locale.locale() === 'en'
      ? this.i18n.t('app.topbar.switch_to_ro')
      : this.i18n.t('app.topbar.switch_to_en'),
  );
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
