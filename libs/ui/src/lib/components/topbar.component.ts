import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SzAvatarComponent } from './avatar.component';
import { SzIconComponent } from '../icons/icon.component';
import { ThemeMode, ThemeService } from '../theme/theme.service';

export interface SzNavLink {
  label: string;
  routerLink: string;
  active?: boolean;
}

export interface SzTopbarUser {
  /** Stable id used as the avatar hue seed (deterministic colour). */
  id?: string;
  email: string;
  username?: string;
  /** Pretty name used to derive initials when no photo is set. */
  displayName?: string;
  photo?: string;
  initials?: string;
}

/**
 * Sticky top bar shared by `apps/site` and `apps/dashboard`.
 *
 * Three slots, all driven by inputs:
 *   - Brand (logo + wordmark) — input `brandHref` for the home link
 *   - Nav links — input `links` (label + routerLink) renders as
 *     keyboard-nav-able mono-font anchors with an active state
 *   - Tools — built-in: search button (emits), bell button (emits),
 *     theme switch (3-state via injected ThemeService), login or
 *     greeting (depending on `user`)
 *
 * The component intentionally has no hardcoded RO text — labels come
 * via inputs from the i18n layer in each app.
 */
@Component({
  selector: 'sz-topbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    SzAvatarComponent,
    SzIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <header class="sz-topbar">
      <div class="sz-topbar__inner">
        <a class="sz-brand" [routerLink]="brandHref">
          <img
            class="sz-brand__mark"
            [src]="logoSrc"
            [alt]="brandText"
          />
          <span class="sz-brand__wordmark">{{ brandText }}</span>
        </a>

        @if (links.length) {
          <nav class="sz-nav" [attr.aria-label]="navAriaLabel">
            @for (link of links; track link.routerLink) {
              <a
                class="sz-nav__link"
                [routerLink]="link.routerLink"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: link.routerLink === '/' }"
              >
                {{ link.label }}
              </a>
            }
          </nav>
        }

        <div class="sz-topbar__tools">
          @if (showSearch) {
            <button
              class="sz-icon-btn"
              type="button"
              [attr.aria-label]="searchAriaLabel"
              (click)="searchClick.emit()"
            >
              <sz-icon name="search" />
            </button>
          }

          @if (showBell) {
            <button
              class="sz-icon-btn sz-bell-btn"
              type="button"
              [attr.aria-label]="bellAriaLabel"
              (click)="bellClick.emit()"
            >
              <sz-icon name="bell" />
              @if (bellBadge > 0) {
                <span class="sz-bell-badge">
                  {{ bellBadge > 99 ? '99+' : bellBadge }}
                </span>
              }
            </button>
          }

          @if (showThemeSwitch) {
            <div class="sz-theme-toggle" role="group" [attr.aria-label]="themeAriaLabel">
              <button
                type="button"
                [class.is-active]="theme.mode() === 'auto'"
                [attr.aria-pressed]="theme.mode() === 'auto'"
                [attr.aria-label]="themeAutoLabel"
                (click)="setTheme('auto')"
              >
                <sz-icon name="auto" [size]="14" />
              </button>
              <button
                type="button"
                [class.is-active]="theme.mode() === 'light'"
                [attr.aria-pressed]="theme.mode() === 'light'"
                [attr.aria-label]="themeLightLabel"
                (click)="setTheme('light')"
              >
                <sz-icon name="sun" [size]="14" />
              </button>
              <button
                type="button"
                [class.is-active]="theme.mode() === 'dark'"
                [attr.aria-pressed]="theme.mode() === 'dark'"
                [attr.aria-label]="themeDarkLabel"
                (click)="setTheme('dark')"
              >
                <sz-icon name="moon" [size]="14" />
              </button>
            </div>
          }

          @if (user) {
            <button
              #accountTrigger
              class="sz-account-trigger"
              type="button"
              [attr.aria-label]="accountLabel"
              [attr.aria-haspopup]="'menu'"
              [attr.aria-expanded]="accountMenuOpen"
              (click)="accountClick.emit()"
            >
              <sz-avatar
                size="sm"
                [photo]="user.photo"
                [name]="user.displayName ?? user.username ?? user.email"
                [seed]="user.id ?? user.email"
              />
            </button>
          } @else {
            @if (signupHref) {
              <a class="sz-btn-ghost" [routerLink]="signupHref">
                {{ signupLabel }}
              </a>
            }
            @if (loginHref) {
              <a class="sz-btn-login" [routerLink]="loginHref">
                {{ loginLabel }}
              </a>
            }
          }
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .sz-topbar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: color-mix(in oklab, var(--bg) 88%, transparent);
        backdrop-filter: blur(12px) saturate(140%);
        -webkit-backdrop-filter: blur(12px) saturate(140%);
        border-bottom: var(--grid-line) solid var(--line);
      }
      .sz-topbar__inner {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 24px;
        height: 64px;
        padding: 0 var(--gutter-x);
        max-width: var(--container);
        margin: 0 auto;
      }

      .sz-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        min-height: 36px;
        min-width: auto;
      }
      .sz-brand__mark {
        width: 36px;
        height: 36px;
        filter: var(--logo-filter);
      }
      .sz-brand__wordmark {
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        line-height: 1;
        position: relative;
        top: 1px;
      }

      .sz-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 36px;
      }
      .sz-nav__link {
        padding: 8px 14px;
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--fg-muted);
        position: relative;
        transition: color 0.15s ease;
        min-height: 36px;
        min-width: auto;
      }
      .sz-nav__link:hover {
        color: var(--fg);
      }
      .sz-nav__link.is-active {
        color: var(--fg);
      }
      .sz-nav__link.is-active::before {
        content: '';
        position: absolute;
        inset: 4px;
        border: 1px solid var(--accent);
        pointer-events: none;
      }

      .sz-topbar__tools {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-end;
      }

      .sz-icon-btn {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
        display: inline-grid;
        place-items: center;
        color: var(--fg-muted);
        border: 1px solid transparent;
        transition:
          color 0.15s ease,
          border-color 0.15s ease,
          background 0.15s ease;
      }
      .sz-icon-btn:hover {
        color: var(--fg);
        border-color: var(--line);
        background: var(--bg-elev);
      }
      .sz-bell-btn { position: relative; }
      .sz-bell-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 8px;
        background: var(--accent);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 700;
        display: inline-grid;
        place-items: center;
        line-height: 1;
      }

      .sz-theme-toggle {
        display: inline-flex;
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .sz-theme-toggle button {
        width: 32px;
        height: 30px;
        min-width: 32px;
        min-height: 30px;
        display: grid;
        place-items: center;
        color: var(--fg-muted);
        border-right: 1px solid var(--line);
        transition:
          background 0.12s ease,
          color 0.12s ease;
      }
      .sz-theme-toggle button:last-child {
        border-right: 0;
      }
      .sz-theme-toggle button.is-active {
        background: var(--accent);
        color: var(--accent-fg);
      }
      .sz-theme-toggle button:not(.is-active):hover {
        color: var(--fg);
      }

      .sz-btn-login,
      .sz-btn-ghost {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-weight: 600;
        padding: 8px 16px;
        white-space: nowrap;
        min-height: 36px;
        transition:
          filter 0.15s ease,
          background 0.15s ease,
          border-color 0.15s ease,
          transform 0.15s ease;
      }
      .sz-btn-login {
        background: var(--accent);
        color: var(--accent-fg);
      }
      .sz-btn-login:hover {
        filter: brightness(1.08);
      }
      .sz-btn-login:active {
        transform: translateY(1px);
      }
      .sz-btn-ghost {
        padding: 8px 14px;
        border: 1px solid var(--line-strong);
        color: var(--fg);
        background: transparent;
      }
      .sz-btn-ghost:hover {
        background: var(--bg-elev);
        border-color: var(--fg-muted);
      }

      .sz-account-trigger {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
        padding: 0;
        background: transparent;
        border: 1px solid transparent;
        display: inline-grid;
        place-items: center;
        transition:
          border-color 0.15s ease,
          background 0.15s ease;
      }
      .sz-account-trigger:hover {
        border-color: var(--line);
        background: var(--bg-elev);
      }
      .sz-account-trigger[aria-expanded='true'] {
        border-color: var(--accent);
      }

      @media (max-width: 1100px) {
        .sz-nav {
          display: none;
        }
      }
      @media (max-width: 640px) {
        .sz-topbar__inner {
          grid-template-columns: 1fr auto;
        }
        .sz-nav,
        .sz-theme-toggle,
        .sz-btn-ghost {
          display: none;
        }
        .sz-account-trigger {
          display: inline-grid;
        }
      }
    `,
  ],
})
export class SzTopbarComponent {
  @Input() brandText = 'Sintezaur';
  @Input() brandHref = '/';
  @Input() logoSrc = '/assets/brand/logo-white.png';
  @Input() links: SzNavLink[] = [];
  @Input() navAriaLabel = 'Navigation';

  @Input() showSearch = true;
  @Input() showBell = true;
  @Input() showThemeSwitch = true;

  @Input() searchAriaLabel = 'Search';
  @Input() bellAriaLabel = 'Notifications';
  @Input() bellBadge = 0;
  @Input() themeAriaLabel = 'Theme';
  @Input() themeAutoLabel = 'Auto';
  @Input() themeLightLabel = 'Light';
  @Input() themeDarkLabel = 'Dark';

  @Input() user: SzTopbarUser | null = null;
  @Input() loginHref = '/login';
  @Input() loginLabel = 'Log in';
  @Input() signupHref = '/signup';
  @Input() signupLabel = 'Sign up';
  @Input() accountHref = '/cont';
  @Input() accountLabel = 'Account';
  /** Visual hint for the avatar trigger when the dropdown is open. */
  @Input() accountMenuOpen = false;

  @Output() searchClick = new EventEmitter<void>();
  @Output() bellClick = new EventEmitter<void>();
  @Output() accountClick = new EventEmitter<void>();

  readonly theme = inject(ThemeService);

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
