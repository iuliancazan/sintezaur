import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  NotificationsService,
  type NotificationKindLiteral,
  type NotificationRow,
} from './notifications.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="np" role="dialog" [attr.aria-label]="i18n.t('notifications.title')">
      <header class="np__head">
        <h3>{{ 'notifications.title' | t }}</h3>
        @if (svc.unread() > 0) {
          <button type="button" class="np__mark" (click)="markAllRead()">
            {{ 'notifications.mark_all_read' | t }}
          </button>
        }
      </header>

      @if (svc.loading()) {
        <p class="np__empty">{{ 'app.loading' | t }}</p>
      } @else if (svc.items().length === 0) {
        <p class="np__empty">{{ 'notifications.empty' | t }}</p>
      } @else {
        <ul class="np__list">
          @for (n of svc.items(); track n.id) {
            <li
              class="np__row"
              [class.is-unread]="!n.readAt"
              (click)="openTarget(n)"
            >
              <div class="np__row-main">
                <p class="np__line">{{ describe(n) }}</p>
                <time>{{ formatRelative(n.createdAt) }}</time>
              </div>
              @if (!n.readAt) {
                <span class="np__dot" aria-hidden="true"></span>
              }
            </li>
          }
        </ul>
      }
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
      .np {
        width: min(380px, calc(100vw - 32px));
        max-height: min(560px, calc(100vh - 80px));
        background: var(--bg);
        border: 1px solid var(--line-strong);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
      }
      .np__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--line);
      }
      .np__head h3 {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin: 0;
        color: var(--fg);
      }
      .np__mark {
        background: none;
        border: 0;
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--accent);
        cursor: pointer;
        padding: 4px 6px;
      }
      .np__mark:hover { text-decoration: underline; }
      .np__empty {
        padding: 40px 16px;
        text-align: center;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .np__list {
        list-style: none;
        margin: 0;
        padding: 0;
        overflow-y: auto;
        flex: 1;
      }
      .np__row {
        display: flex;
        gap: 10px;
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid var(--line);
        align-items: center;
      }
      .np__row:hover { background: var(--bg-elev); }
      .np__row.is-unread { background: color-mix(in oklab, var(--accent) 5%, var(--bg)); }
      .np__row-main { flex: 1; min-width: 0; }
      .np__line {
        margin: 0;
        font-size: 13px;
        line-height: 1.4;
      }
      .np__row time {
        display: block;
        margin-top: 4px;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .np__dot {
        width: 8px;
        height: 8px;
        background: var(--accent);
        border-radius: 50%;
        flex-shrink: 0;
      }

      @media (max-width: 720px) {
        :host { top: 56px; right: 8px; left: 8px; }
        .np { width: auto; }
      }
    `,
  ],
})
export class NotificationsPanelComponent {
  readonly i18n = inject(I18nService);
  readonly svc = inject(NotificationsService);
  private readonly router = inject(Router);

  @Output() closed = new EventEmitter<void>();
  @Input() anchorRef: HTMLElement | null = null;

  /**
   * Click outside the panel and its anchor button closes it. Use
   * `pointerdown` so it fires before any focus-stealing handlers.
   */
  @HostListener('document:pointerdown', ['$event'])
  onDocClick(ev: PointerEvent): void {
    const host = (ev.currentTarget as Document).activeElement;
    const target = ev.target as Node;
    const me = this.elementRef();
    if (me?.contains(target)) return;
    if (this.anchorRef?.contains(target)) return;
    this.closed.emit();
  }

  /** Hook so we can introspect the host element without DI ceremony. */
  private elementRef(): HTMLElement | null {
    return document.querySelector('app-notifications-panel');
  }

  async markAllRead(): Promise<void> {
    await this.svc.markAllRead();
  }

  openTarget(n: NotificationRow): void {
    void this.svc.markRead([n.id]);
    const path = this.targetPath(n);
    this.closed.emit();
    if (path) void this.router.navigateByUrl(path);
  }

  private targetPath(n: NotificationRow): string | null {
    const p = n.payload as { listing?: { slug?: string } };
    switch (n.kind) {
      case 'bazar_new_message':
      case 'bazar_new_offer':
      case 'bazar_counter_offer':
      case 'bazar_offer_accepted':
      case 'bazar_offer_rejected':
        if (n.targetType === 'listing_message_thread' && n.targetId)
          return `/cont/mesaje/${n.targetId}`;
        return '/cont/mesaje';
      case 'bazar_price_drop_watched':
      case 'bazar_saved_search_match':
      case 'bazar_listing_expiring':
        if (p.listing?.slug) return `/bazar/${p.listing.slug}`;
        return '/bazar';
      case 'bazar_transaction_confirmed_by_other':
      case 'bazar_review_submitted_on_me':
        if (p.listing?.slug) return `/bazar/${p.listing.slug}`;
        return '/cont/mesaje';
      default:
        return null;
    }
  }

  describe(n: NotificationRow): string {
    const p = n.payload as Record<string, unknown>;
    const listingTitle =
      ((p['listing'] as { title?: string } | undefined)?.title) ?? '';
    switch (n.kind) {
      case 'bazar_new_message':
        return this.i18n.t('notifications.kind.bazar_new_message', {
          title: listingTitle,
        });
      case 'bazar_new_offer':
        return this.i18n.t('notifications.kind.bazar_new_offer', {
          title: listingTitle,
        });
      case 'bazar_counter_offer':
        return this.i18n.t('notifications.kind.bazar_counter_offer', {
          title: listingTitle,
        });
      case 'bazar_offer_accepted':
        return this.i18n.t('notifications.kind.bazar_offer_accepted', {
          title: listingTitle,
        });
      case 'bazar_offer_rejected':
        return this.i18n.t('notifications.kind.bazar_offer_rejected', {
          title: listingTitle,
        });
      case 'bazar_price_drop_watched':
        return this.i18n.t('notifications.kind.bazar_price_drop_watched', {
          title: listingTitle,
          oldPrice: String(p['oldPrice'] ?? ''),
          newPrice: String(p['newPrice'] ?? ''),
        });
      case 'bazar_saved_search_match':
        return this.i18n.t('notifications.kind.bazar_saved_search_match', {
          name:
            (p['savedSearchName'] as string | undefined) ?? listingTitle,
        });
      case 'bazar_listing_expiring':
        return this.i18n.t('notifications.kind.bazar_listing_expiring', {
          title: listingTitle,
          bucket: String(p['bucket'] ?? ''),
        });
      case 'bazar_transaction_confirmed_by_other':
        return this.i18n.t(
          'notifications.kind.bazar_transaction_confirmed_by_other',
          { title: listingTitle },
        );
      case 'bazar_review_submitted_on_me':
        return this.i18n.t('notifications.kind.bazar_review_submitted_on_me', {
          rating: String(p['rating'] ?? ''),
        });
      default:
        return this.i18n.t('notifications.kind.generic');
    }
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1) return this.i18n.t('inbox.relative.now');
    if (min < 60)
      return this.i18n.t('inbox.relative.minutes', { count: min });
    const hr = Math.floor(min / 60);
    if (hr < 24)
      return this.i18n.t('inbox.relative.hours', { count: hr });
    return this.i18n.t('inbox.relative.days', {
      count: Math.floor(hr / 24),
    });
  }
}
