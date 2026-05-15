import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SzNavLink, SzTopbarComponent, SzTopbarUser } from '@sintezaur/ui';
import { AuthService } from './auth/auth.service';
import { I18nService } from './i18n/i18n.service';

/**
 * Admin shell — sticky topbar (no search/bell, no marketing footer)
 * + router outlet. Nav links are admin-only (Tezaur / Users / Audit).
 *
 * The login page lives at `/login` and uses its own focused chrome
 * via the route component; the topbar still renders above it but
 * with nav links empty (until the user is authenticated).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SzTopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sz-topbar
      [brandText]="brandText()"
      [logoSrc]="logoSrc"
      [links]="navLinks()"
      [navAriaLabel]="navAriaLabel()"
      [user]="topbarUser()"
      [showSearch]="false"
      [showBell]="false"
      [accountHref]="'/'"
      [accountLabel]="accountLabel()"
      (accountClick)="goHome()"
      [loginHref]="'/login'"
      [loginLabel]="loginLabel()"
      [signupHref]="''"
      [signupLabel]="''"
      [themeAriaLabel]="themeAriaLabel()"
      [themeAutoLabel]="themeAutoLabel()"
      [themeLightLabel]="themeLightLabel()"
      [themeDarkLabel]="themeDarkLabel()"
    />
    <router-outlet />
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
    `,
  ],
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  readonly logoSrc = '/assets/brand/logo-white.png';
  readonly brandText = computed(() => this.i18n.t('app.name'));
  readonly navAriaLabel = computed(() => this.i18n.t('app.nav.aria'));
  readonly loginLabel = computed(() => this.i18n.t('auth.login.submit'));
  readonly accountLabel = computed(() => this.i18n.t('app.actions.logout_short'));
  readonly themeAriaLabel = computed(() => this.i18n.t('app.nav.theme'));
  readonly themeAutoLabel = computed(() => this.i18n.t('app.nav.theme_auto'));
  readonly themeLightLabel = computed(() => this.i18n.t('app.nav.theme_light'));
  readonly themeDarkLabel = computed(() => this.i18n.t('app.nav.theme_dark'));

  readonly navLinks = computed<SzNavLink[]>(() => {
    if (!this.auth.currentUser()) return [];
    return [
      { label: this.i18n.t('app.nav.tezaur'), routerLink: '/tezaur' },
      { label: this.i18n.t('app.nav.users'), routerLink: '/users' },
      { label: this.i18n.t('app.nav.audit'), routerLink: '/audit' },
    ];
  });

  readonly topbarUser = computed<SzTopbarUser | null>(() => {
    const u = this.auth.currentUser();
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.fullName || u.username,
    };
  });
}
