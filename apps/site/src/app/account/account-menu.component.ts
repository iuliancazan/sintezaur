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

      <button
        role="menuitem"
        type="button"
        class="am__item"
        (click)="openFeedback()"
      >
        {{ 'account.menu.feedback' | t }}
      </button>

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
      :host {
        position: fixed;
        top: 60px;
        right: 16px;
        z-index: 200;
        display: block;
      }
      .am {
        width: 240px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        padding: 6px 0;
      }
      .am__head {
        padding: 10px 16px 12px;
        border-bottom: 1px solid var(--line);
        margin-bottom: 6px;
      }
      .am__name {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--fg);
        line-height: 1.2;
        word-break: break-word;
      }
      .am__email {
        margin: 4px 0 0;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        word-break: break-all;
      }
      .am__item {
        appearance: none;
        background: transparent;
        border: 0;
        padding: 10px 16px;
        text-align: left;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
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
        color: var(--fg-muted);
      }
      .am__item--danger:hover {
        color: var(--fg);
      }
      .am__sep {
        display: block;
        height: 1px;
        background: var(--line);
        margin: 6px 0;
      }
    `,
  ],
})
export class AccountMenuComponent {
  readonly auth = inject(AuthService);
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
