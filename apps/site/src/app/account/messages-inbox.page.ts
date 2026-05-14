import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SzIconComponent } from '@sintezaur/ui';
import { AuthService } from '../auth/auth.service';
import {
  BazarService,
  type InboxThread,
} from '../bazar/bazar.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

@Component({
  selector: 'app-messages-inbox-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, SzIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="inbox">
      <header class="inbox__head">
        <a routerLink="/cont" class="inbox__back">
          <sz-icon name="back" [size]="14" />
          {{ 'account.back_to_account' | t }}
        </a>
        <h1>{{ 'inbox.title' | t }}</h1>
        <p class="inbox__lede">{{ 'inbox.lede' | t }}</p>
      </header>

      @if (loading()) {
        <p class="inbox__empty">{{ 'app.loading' | t }}</p>
      } @else if (threads().length === 0) {
        <p class="inbox__empty">{{ 'inbox.empty' | t }}</p>
      } @else {
        <ul class="inbox__list">
          @for (t of threads(); track t.threadId) {
            <li>
              <a class="inbox__row" [routerLink]="['/cont/mesaje', t.threadId]">
                <div class="inbox__row-main">
                  <div class="inbox__row-top">
                    <span class="inbox__listing">{{ t.listingTitle }}</span>
                    @if (t.listingStatus !== 'active') {
                      <span class="inbox__status">
                        {{ 'inbox.status.' + t.listingStatus | t }}
                      </span>
                    }
                  </div>
                  <p class="inbox__preview">
                    <span class="inbox__other">&#64;{{ t.otherUsername }}</span>
                    <span class="sep">·</span>
                    <span class="inbox__preview-body">
                      {{ t.lastMessagePreview ?? i18n.t('inbox.no_preview') }}
                    </span>
                  </p>
                </div>
                <div class="inbox__row-side">
                  <time>{{ formatRelative(t.lastMessageAt) }}</time>
                  @if (isUnread(t)) {
                    <span class="inbox__dot" aria-label="Necitit"></span>
                  }
                </div>
              </a>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .inbox { max-width: 880px; margin: 0 auto; padding: 32px var(--gutter-x) 64px; }
      .inbox__head { margin-bottom: 22px; }
      .inbox__back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        text-decoration: none;
        margin-bottom: 14px;
      }
      h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 4vw, 38px);
        line-height: 1.1;
        margin: 0 0 8px;
      }
      .inbox__lede { color: var(--fg-muted); font-size: 14px; margin: 0; max-width: 56ch; }
      .inbox__empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        border: 1px dashed var(--line);
      }

      .inbox__list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); }
      .inbox__list li + li { border-top: 1px solid var(--line); }
      .inbox__row {
        display: flex;
        gap: 16px;
        padding: 16px 18px;
        background: var(--bg-elev);
        color: var(--fg);
        text-decoration: none;
        transition: background 0.12s ease;
      }
      .inbox__row:hover { background: var(--bg); }
      .inbox__row-main { flex: 1; min-width: 0; }
      .inbox__row-top {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin-bottom: 4px;
      }
      .inbox__listing {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 15px;
      }
      .inbox__status {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
        padding: 2px 6px;
        border: 1px solid var(--accent);
      }
      .inbox__preview {
        font-size: 13px;
        color: var(--fg-muted);
        margin: 0;
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .inbox__other { color: var(--accent); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; }
      .inbox__preview .sep { color: var(--fg-subtle); }
      .inbox__preview-body {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
      .inbox__row-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
        text-transform: uppercase;
      }
      .inbox__dot {
        width: 8px;
        height: 8px;
        background: var(--accent);
        border-radius: 50%;
      }
    `,
  ],
})
export class MessagesInboxPage {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);
  readonly auth = inject(AuthService);

  readonly threads = signal<InboxThread[]>([]);
  readonly loading = signal(true);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.bazar.listInbox();
      this.threads.set(rows);
    } catch (err) {
      console.error('[bazar] inbox load failed', err);
      this.threads.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  isUnread(t: InboxThread): boolean {
    const me = this.auth.currentUser()?.id;
    if (!me) return false;
    const myLastRead =
      me === t.buyerId ? t.buyerLastReadAt : t.sellerLastReadAt;
    if (!myLastRead) return true;
    return new Date(t.lastMessageAt).getTime() > new Date(myLastRead).getTime();
  }

  formatRelative(iso: string): string {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const min = Math.floor(diffMs / 60_000);
    if (min < 1) return this.i18n.t('inbox.relative.now');
    if (min < 60)
      return this.i18n.t('inbox.relative.minutes', { count: min });
    const hr = Math.floor(min / 60);
    if (hr < 24)
      return this.i18n.t('inbox.relative.hours', { count: hr });
    const day = Math.floor(hr / 24);
    if (day < 7)
      return this.i18n.t('inbox.relative.days', { count: day });
    return date.toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
    });
  }
}
