import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatPrice } from '@sintezaur/shared';
import { SzIconComponent } from '@sintezaur/ui';
import {
  BazarService,
  type WatchedListingRow,
} from '../bazar/bazar.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

@Component({
  selector: 'app-my-watches-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, SzIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mw">
      <header class="mw__head">
        <a routerLink="/cont" class="mw__back">
          <sz-icon name="back" [size]="14" />
          {{ 'account.back_to_account' | t }}
        </a>
        <h1>{{ 'my_watches.title' | t }}</h1>
        <p class="mw__lede">{{ 'my_watches.lede' | t }}</p>
      </header>

      @if (loading()) {
        <p class="mw__empty">{{ 'app.loading' | t }}</p>
      } @else if (rows().length === 0) {
        <p class="mw__empty">{{ 'my_watches.empty' | t }}</p>
      } @else {
        <ul class="mw__list">
          @for (w of rows(); track w.listingId) {
            <li class="mw__card">
              <a class="mw__media" [routerLink]="['/bazar', w.slug]">
                @if (w.thumb) {
                  <img [src]="bazar.imageUrl(w.thumb)" [alt]="w.title" />
                } @else {
                  <div class="mw__ph">·</div>
                }
              </a>
              <div class="mw__body">
                <a class="mw__title" [routerLink]="['/bazar', w.slug]">
                  {{ w.title }}
                </a>
                <div class="mw__meta">
                  <span class="mw__price">
                    {{ formatPrice(w.price, w.currency) }}
                  </span>
                  <span class="sep">·</span>
                  <span>{{ 'bazar.condition.' + w.condition | t }}</span>
                  <span class="sep">·</span>
                  <span>{{ w.location }}</span>
                </div>
                @if (w.status !== 'active') {
                  <span class="mw__status">
                    {{ 'inbox.status.' + w.status | t }}
                  </span>
                }
              </div>
              <button
                type="button"
                class="mw__unwatch"
                [disabled]="unwatchId() === w.listingId"
                (click)="unwatch(w.listingId)"
                [attr.aria-label]="i18n.t('my_watches.unwatch')"
              >
                <sz-icon name="heart" [size]="14" />
                {{
                  (unwatchId() === w.listingId
                    ? 'my_watches.unwatching'
                    : 'my_watches.unwatch') | t
                }}
              </button>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .mw { max-width: 880px; margin: 0 auto; padding: 32px var(--gutter-x) 64px; }
      .mw__back {
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
      .mw__lede { color: var(--fg-muted); font-size: 14px; margin: 0 0 22px; max-width: 56ch; }
      .mw__empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        border: 1px dashed var(--line);
      }
      .mw__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
      .mw__card {
        display: grid;
        grid-template-columns: 96px 1fr auto;
        gap: 14px;
        padding: 12px 14px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        align-items: center;
      }
      .mw__media {
        width: 96px;
        aspect-ratio: 1 / 1;
        background: var(--bg);
        overflow: hidden;
        display: block;
      }
      .mw__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .mw__ph {
        display: grid;
        place-items: center;
        height: 100%;
        color: var(--fg-subtle);
        font-family: var(--font-mono);
      }
      .mw__title {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 16px;
        color: var(--fg);
        text-decoration: none;
        display: block;
        margin-bottom: 4px;
      }
      .mw__title:hover { color: var(--accent); }
      .mw__meta {
        display: inline-flex;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .mw__meta .sep { color: var(--fg-subtle); }
      .mw__price { color: var(--fg); font-weight: 600; }
      .mw__status {
        display: inline-block;
        margin-top: 6px;
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
        border: 1px solid var(--accent);
        padding: 2px 6px;
      }
      .mw__unwatch {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--accent);
        cursor: pointer;
        min-height: 36px;
      }
      .mw__unwatch:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); }
      .mw__unwatch:disabled { opacity: 0.5; cursor: not-allowed; }

      @media (max-width: 720px) {
        .mw__card { grid-template-columns: 64px 1fr; }
        .mw__media { width: 64px; }
        .mw__unwatch { grid-column: 1 / -1; justify-content: center; }
      }
    `,
  ],
})
export class MyWatchesPage {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);

  readonly rows = signal<WatchedListingRow[]>([]);
  readonly loading = signal(true);
  readonly unwatchId = signal<string | null>(null);

  readonly formatPrice = formatPrice;

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.bazar.listWatches();
      this.rows.set(rows);
    } catch (err) {
      console.error('[bazar] watches failed', err);
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async unwatch(listingId: string): Promise<void> {
    if (this.unwatchId()) return;
    this.unwatchId.set(listingId);
    try {
      await this.bazar.unwatch(listingId);
      this.rows.update((r) => r.filter((w) => w.listingId !== listingId));
    } catch (err) {
      console.error('[bazar] unwatch failed', err);
    } finally {
      this.unwatchId.set(null);
    }
  }
}
