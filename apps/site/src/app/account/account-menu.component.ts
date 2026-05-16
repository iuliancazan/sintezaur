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
import { Locale, LocaleService } from '../i18n/locale.service';
import { TPipe } from '../i18n/t.pipe';

/**
 * Floating menu anchored under the topbar avatar. Items are role-gated:
 * dashboard appears only for admin/superadmin; future role-specific
 * entries (curator/contributor flows) plug in here.
 *
 * Closes on outside click, on Escape, or after any item is activated.
 */
@Component({
  selector: 'app-account-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="am"
      role="menu"
      [attr.aria-label]="'account.menu.aria' | t"
    >
      @if (auth.currentUser(); as user) {
        <div class="am__head">
          <p class="am__name">{{ displayName() }}</p>
          <p class="am__email">{{ user.email }}</p>
        </div>
      }

      <a
        role="menuitem"
        class="am__item"
        routerLink="/cont/setari"
        (click)="close()"
      >
        {{ 'account.menu.settings' | t }}
      </a>

      <a
        role="menuitem"
        class="am__item"
        routerLink="/cont/anunturi"
        (click)="close()"
      >
        {{ 'account.menu.my_listings' | t }}
      </a>

      <a
        role="menuitem"
        class="am__item"
        routerLink="/cont/contributii-tezaur"
        (click)="close()"
      >
        {{ 'account.menu.my_tezaur_drafts' | t }}
      </a>

      <button
        role="menuitem"
        type="button"
        class="am__item"
        (click)="openFeedback()"
      >
        {{ 'account.menu.feedback' | t }}
      </button>

      <span class="am__sep" aria-hidden="true"></span>
      <div class="am__group">
        <span class="am__group-label">
          {{ 'app.topbar.language_label' | t }}
        </span>
        <div
          class="am__seg"
          role="radiogroup"
          [attr.aria-label]="'app.topbar.language_label' | t"
        >
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="locale.locale() === 'ro'"
            [class.is-active]="locale.locale() === 'ro'"
            (click)="setLocale('ro')"
          >
            RO
          </button>
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="locale.locale() === 'en'"
            [class.is-active]="locale.locale() === 'en'"
            (click)="setLocale('en')"
          >
            EN
          </button>
        </div>
      </div>

      @if (showDashboard()) {
        <span class="am__sep" aria-hidden="true"></span>
        <a
          role="menuitem"
          class="am__item am__item--accent"
          [href]="dashboardUrl"
          rel="noopener"
          (click)="close()"
        >
          {{ 'account.menu.dashboard' | t }}
        </a>
      }

      <span class="am__sep" aria-hidden="true"></span>
      <button
        role="menuitem"
        type="button"
        class="am__item am__item--danger"
        (click)="logout()"
      >
        {{ 'account.menu.logout' | t }}
      </button>
    </div>
  `,
  styles: [
    `
      /* V05-style avatar dropdown. Anchored under the topbar avatar
         trigger: 8px below the 64px sticky topbar, right-aligned to
         the container gutter so it sits flush under the avatar pill
         on wide viewports (and to the viewport gutter on narrow ones). */
      :host {
        position: fixed;
        top: calc(64px + 8px);
        right: max(var(--gutter-x), calc((100vw - var(--container)) / 2 + var(--gutter-x)));
        z-index: 200;
        display: block;
        animation: am-in 0.16s ease;
        transform-origin: top right;
      }
      @keyframes am-in {
        from { opacity: 0; transform: translateY(-4px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .am {
        min-width: 260px;
        background: var(--bg-card);
        border: 1px solid var(--line);
        box-shadow:
          0 18px 48px -12px rgba(0, 0, 0, 0.45),
          0 1px 0 rgba(255, 255, 255, 0.04) inset;
        display: flex;
        flex-direction: column;
        padding: 6px;
      }
      [data-theme='light'] .am {
        box-shadow: 0 18px 48px -12px rgba(60, 50, 20, 0.18);
      }
      .am__head {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 12px 12px 14px;
        margin: -6px -6px 6px;
        border-bottom: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .am__name {
        margin: 0;
        font-weight: 600;
        font-size: 14px;
        color: var(--fg);
        line-height: 1.2;
        word-break: break-word;
      }
      .am__email {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        word-break: break-all;
      }
      .am__item {
        appearance: none;
        background: transparent;
        border: 0;
        padding: 9px 10px;
        text-align: left;
        font-size: 13px;
        color: var(--fg);
        cursor: pointer;
        min-height: auto;
        min-width: auto;
        display: block;
        text-decoration: none;
        transition:
          background 0.12s ease,
          color 0.12s ease;
      }
      .am__item:hover,
      .am__item:focus-visible {
        background: var(--bg-elev);
        outline: none;
      }
      .am__item--accent {
        color: var(--accent);
      }
      .am__item--danger {
        color: oklch(0.72 0.16 28);
      }
      .am__item--danger:hover {
        background: oklch(0.42 0.14 28 / 0.18);
        color: oklch(0.82 0.18 28);
      }
      [data-theme='light'] .am__item--danger {
        color: oklch(0.45 0.18 28);
      }
      [data-theme='light'] .am__item--danger:hover {
        background: oklch(0.94 0.06 28);
        color: oklch(0.38 0.20 28);
      }
      .am__sep {
        display: block;
        height: 1px;
        background: var(--line);
        margin: 6px 0;
      }
      .am__group {
        padding: 8px 16px 10px;
      }
      .am__group-label {
        display: block;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-subtle);
        margin-bottom: 6px;
      }
      .am__seg {
        display: flex;
        border: 1px solid var(--line);
        width: 100%;
      }
      .am__seg button {
        flex: 1;
        appearance: none;
        background: var(--bg-elev);
        border: 0;
        border-right: 1px solid var(--line);
        padding: 8px 0;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
        cursor: pointer;
        min-height: auto;
        min-width: auto;
      }
      .am__seg button:last-child {
        border-right: 0;
      }
      .am__seg button:hover:not(.is-active) {
        color: var(--fg);
      }
      .am__seg button.is-active {
        background: var(--accent);
        color: var(--accent-fg);
        cursor: default;
      }
    `,
  ],
})
export class AccountMenuComponent {
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

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

  close(): void {
    this.closed.emit();
  }

  openFeedback(): void {
    this.feedback.open();
    this.close();
  }

  setLocale(loc: Locale): void {
    if (this.locale.locale() === loc) return;
    this.close();
    this.locale.setLocale(loc);
  }

  async logout(): Promise<void> {
    this.close();
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) return;
    if (this.host.nativeElement.contains(target)) return;
    // The avatar trigger sits outside this host but is the toggle —
    // its own click handler in app.ts flips the open state, so we
    // ignore clicks landing on it here.
    const trigger = (event.target as HTMLElement).closest(
      '.sz-account-trigger',
    );
    if (trigger) return;
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
