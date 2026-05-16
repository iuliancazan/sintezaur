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

          @if (showFavorites) {
            <button
              class="sz-icon-btn sz-icon-btn--collapsible"
              type="button"
              [attr.aria-label]="favoritesAriaLabel"
              (click)="favoritesClick.emit()"
            >
              <sz-icon name="heart" />
            </button>
          }

          @if (showMessages) {
            <button
              class="sz-icon-btn sz-icon-btn--collapsible sz-bell-btn"
              type="button"
              [attr.aria-label]="messagesAriaLabel"
              (click)="messagesClick.emit()"
            >
              <sz-icon name="mail" />
              @if (messagesBadge > 0) {
                <span class="sz-bell-badge">
                  {{ messagesBadge > 99 ? '99+' : messagesBadge }}
                </span>
              }
            </button>
          }

          @if (showBurger) {
            <button
              class="sz-icon-btn sz-burger-btn"
              type="button"
              [attr.aria-label]="burgerAriaLabel"
              [attr.aria-expanded]="burgerOpen"
              (click)="burgerClick.emit()"
            >
              <sz-icon name="menu" />
            </button>
          }

          @if (showThemeSwitch) {
            <button
              class="sz-icon-btn sz-theme-btn"
              type="button"
              [attr.aria-label]="themeAriaLabel"
              (click)="toggleTheme()"
            >
              <sz-icon class="sz-theme-btn__sun" name="sun" />
              <sz-icon class="sz-theme-btn__moon" name="moon" />
            </button>
          }

          @if (showLocaleSwitch) {
            <div
              class="sz-locale-group"
              role="group"
              [attr.aria-label]="localeAriaLabel"
            >
              <button
                type="button"
                class="sz-locale-seg"
                [class.is-active]="currentLocale === 'ro'"
                [attr.aria-pressed]="currentLocale === 'ro'"
                (click)="currentLocale !== 'ro' && localeClick.emit()"
              >
                RO
              </button>
              <button
                type="button"
                class="sz-locale-seg"
                [class.is-active]="currentLocale === 'en'"
                [attr.aria-pressed]="currentLocale === 'en'"
                (click)="currentLocale !== 'en' && localeClick.emit()"
              >
                EN
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
              />
              <sz-icon class="sz-account-trigger__caret" name="caret-down" [size]="12" />
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
      .sz-burger-btn { display: none; }
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

      /* V05 single-button theme toggle: sun visible on dark theme
         (click to switch to light), moon visible on light (click to
         switch to dark). One icon visible at a time, swapped via
         attribute selector on the document root. */
      .sz-theme-btn { position: relative; }
      .sz-theme-btn .sz-theme-btn__sun,
      .sz-theme-btn .sz-theme-btn__moon {
        transition: opacity 0.15s ease;
      }
      :root[data-theme='dark'] .sz-theme-btn .sz-theme-btn__moon,
      :root[data-theme='light'] .sz-theme-btn .sz-theme-btn__sun {
        opacity: 0;
        position: absolute;
        inset: 50% auto auto 50%;
        transform: translate(-50%, -50%);
      }

      /* Locale switcher — segmented [RO][EN] control. Active half is
         filled with the accent so the current locale is unambiguous;
         the other half is a click target for switching. Mirrors the
         theme segmented control pattern from the old topbar. */
      .sz-locale-group {
        display: inline-flex;
        border: 1px solid var(--line);
        background: var(--bg-elev);
        height: 30px;
        align-items: stretch;
      }
      .sz-locale-seg {
        appearance: none;
        background: transparent;
        border: 0;
        padding: 0 10px;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
        cursor: pointer;
        min-height: 30px;
        min-width: 30px;
        display: inline-grid;
        place-items: center;
        transition:
          background 0.12s ease,
          color 0.12s ease;
      }
      .sz-locale-seg + .sz-locale-seg {
        border-left: 1px solid var(--line);
      }
      .sz-locale-seg:hover:not(.is-active) {
        color: var(--fg);
      }
      .sz-locale-seg.is-active {
        background: var(--accent);
        color: var(--accent-fg);
        cursor: default;
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

      /* V05 avatar pill trigger: rounded shape, avatar + caret, hover +
         expanded states match the design (see Home - Logat.html inline
         styles for the canonical look). */
      .sz-account-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px 2px 2px;
        min-height: 36px;
        min-width: auto;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 999px;
        cursor: pointer;
        transition:
          border-color 0.15s ease,
          background 0.15s ease;
      }
      .sz-account-trigger:hover {
        border-color: var(--line);
        background: var(--bg-elev);
      }
      .sz-account-trigger[aria-expanded='true'] {
        border-color: var(--line-strong);
        background: var(--bg-elev);
      }
      .sz-account-trigger__caret {
        color: var(--fg-muted);
        transition: transform 0.18s ease;
      }
      .sz-account-trigger[aria-expanded='true'] .sz-account-trigger__caret {
        transform: rotate(180deg);
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
        .sz-btn-ghost,
        .sz-icon-btn--collapsible,
        .sz-locale-group {
          display: none;
        }
        .sz-account-trigger {
          display: inline-grid;
        }
        .sz-burger-btn {
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
  @Input() showFavorites = false;
  @Input() showMessages = false;
  @Input() showBurger = false;
  @Input() showThemeSwitch = true;
  @Input() showLocaleSwitch = false;

  @Input() searchAriaLabel = 'Search';
  @Input() bellAriaLabel = 'Notifications';
  @Input() bellBadge = 0;
  @Input() favoritesAriaLabel = 'Favorites';
  @Input() messagesAriaLabel = 'Messages';
  @Input() messagesBadge = 0;
  @Input() burgerAriaLabel = 'Menu';
  @Input() burgerOpen = false;
  @Input() themeAriaLabel = 'Theme';
  @Input() themeAutoLabel = 'Auto';
  @Input() themeLightLabel = 'Light';
  @Input() themeDarkLabel = 'Dark';
  @Input() currentLocale: 'ro' | 'en' = 'ro';
  @Input() localeAriaLabel = 'Switch language';

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
  @Output() favoritesClick = new EventEmitter<void>();
  @Output() messagesClick = new EventEmitter<void>();
  @Output() burgerClick = new EventEmitter<void>();
  @Output() accountClick = new EventEmitter<void>();
  @Output() localeClick = new EventEmitter<void>();

  readonly theme = inject(ThemeService);

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  /** V05 single-button toggle: dark ⇄ light. */
  toggleTheme(): void {
    this.theme.setMode(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }
}
