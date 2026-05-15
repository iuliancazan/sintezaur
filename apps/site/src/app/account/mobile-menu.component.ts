import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { hasAnyRole } from '../auth/auth.types';
import { FeedbackService } from '../feedback/feedback.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { ThemeMode, ThemeService } from '@sintezaur/ui';

/**
 * Slide-in mobile panel triggered by the topbar burger. Bundles
 * what the desktop topbar shows inline (favorites, messages, theme)
 * with the avatar dropdown items so a small-screen user has one
 * single surface to reach every account action.
 */
@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mm__backdrop" (click)="close()" aria-hidden="true"></div>
    <aside
      class="mm"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'app.mobile_menu.aria' | t"
    >
      <header class="mm__head">
        <span class="mm__title">{{ 'app.mobile_menu.title' | t }}</span>
        <button
          class="mm__close"
          type="button"
          [attr.aria-label]="'app.mobile_menu.close' | t"
          (click)="close()"
        >
          ✕
        </button>
      </header>

      @if (auth.currentUser(); as user) {
        <a class="mm__profile" routerLink="/cont/setari" (click)="close()">
          <span class="mm__profile-name">{{ displayName() }}</span>
          <span class="mm__profile-email">{{ user.email }}</span>
        </a>
      }

      <nav class="mm__group" [attr.aria-label]="'app.mobile_menu.shortcuts' | t">
        <a class="mm__item" routerLink="/cont/salvate" (click)="close()">
          {{ 'account.menu.favorites' | t }}
        </a>
        <a class="mm__item" routerLink="/cont/mesaje" (click)="close()">
          {{ 'account.menu.messages' | t }}
        </a>
      </nav>

      <div class="mm__group">
        <span class="mm__group-label">{{ 'app.nav.theme' | t }}</span>
        <div class="mm__theme" role="group" [attr.aria-label]="'app.nav.theme' | t">
          <button
            type="button"
            [class.is-active]="theme.mode() === 'auto'"
            (click)="setTheme('auto')"
          >
            {{ 'app.nav.theme_auto' | t }}
          </button>
          <button
            type="button"
            [class.is-active]="theme.mode() === 'light'"
            (click)="setTheme('light')"
          >
            {{ 'app.nav.theme_light' | t }}
          </button>
          <button
            type="button"
            [class.is-active]="theme.mode() === 'dark'"
            (click)="setTheme('dark')"
          >
            {{ 'app.nav.theme_dark' | t }}
          </button>
        </div>
      </div>

      <nav class="mm__group" [attr.aria-label]="'account.menu.aria' | t">
        <a class="mm__item" routerLink="/cont/setari" (click)="close()">
          {{ 'account.menu.settings' | t }}
        </a>
        <a class="mm__item" routerLink="/cont/anunturi" (click)="close()">
          {{ 'account.menu.my_listings' | t }}
        </a>
        <button type="button" class="mm__item" (click)="openFeedback()">
          {{ 'account.menu.feedback' | t }}
        </button>
        @if (showDashboard()) {
          <a
            class="mm__item mm__item--accent"
            [href]="dashboardUrl"
            rel="noopener"
            (click)="close()"
          >
            {{ 'account.menu.dashboard' | t }}
          </a>
        }
        <button
          type="button"
          class="mm__item mm__item--danger"
          (click)="logout()"
        >
          {{ 'account.menu.logout' | t }}
        </button>
      </nav>
    </aside>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 250;
        display: block;
      }
      .mm__backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
      }
      .mm {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(320px, 88vw);
        background: var(--bg);
        border-left: 1px solid var(--line-strong);
        box-shadow: -12px 0 32px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        animation: mm-in 0.18s ease-out;
      }
      @keyframes mm-in {
        from {
          transform: translateX(8%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .mm__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--line);
      }
      .mm__title {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .mm__close {
        background: transparent;
        border: 0;
        color: var(--fg);
        font-size: 18px;
        line-height: 1;
        padding: 4px 8px;
        min-height: auto;
        min-width: auto;
      }
      .mm__profile {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--line);
        color: var(--fg);
        text-decoration: none;
      }
      .mm__profile-name {
        font-weight: 600;
        font-size: 14px;
      }
      .mm__profile-email {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        word-break: break-all;
      }
      .mm__group {
        display: flex;
        flex-direction: column;
        padding: 6px 0;
        border-bottom: 1px solid var(--line);
      }
      .mm__group:last-of-type {
        border-bottom: 0;
      }
      .mm__group-label {
        padding: 8px 18px 4px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-subtle);
      }
      .mm__item {
        appearance: none;
        background: transparent;
        border: 0;
        text-align: left;
        padding: 12px 18px;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg);
        text-decoration: none;
        cursor: pointer;
        min-height: auto;
        min-width: auto;
        display: block;
      }
      .mm__item:hover,
      .mm__item:focus-visible {
        background: var(--bg-elev);
        outline: none;
      }
      .mm__item--accent {
        color: var(--accent);
      }
      .mm__item--danger {
        color: var(--fg-muted);
      }
      .mm__theme {
        display: flex;
        margin: 6px 18px 10px;
        border: 1px solid var(--line);
      }
      .mm__theme button {
        flex: 1;
        padding: 8px 0;
        background: var(--bg-elev);
        border: 0;
        border-right: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-muted);
        min-height: auto;
        min-width: auto;
      }
      .mm__theme button:last-child {
        border-right: 0;
      }
      .mm__theme button.is-active {
        background: var(--accent);
        color: var(--accent-fg);
      }
    `,
  ],
})
export class MobileMenuComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  private readonly i18n = inject(I18nService);

  @Output() closed = new EventEmitter<void>();

  readonly dashboardUrl = environment.adminDashboardUrl;

  readonly showDashboard = computed(() =>
    hasAnyRole(this.auth.currentUser(), ['admin', 'superadmin']),
  );

  readonly displayName = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return '';
    return u.fullName?.trim() || u.username;
  });

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  close(): void {
    this.closed.emit();
  }

  openFeedback(): void {
    this.feedback.open();
    this.close();
  }

  async logout(): Promise<void> {
    this.close();
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
