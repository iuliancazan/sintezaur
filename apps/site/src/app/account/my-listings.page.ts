import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatPrice } from '@sintezaur/shared';
import { SzIconComponent } from '@sintezaur/ui';
import {
  BazarService,
  type BazarListItem,
} from '../bazar/bazar.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

type FilterKey = 'all' | 'active' | 'sold' | 'expired' | 'draft';
const FILTERS: FilterKey[] = ['all', 'active', 'sold', 'expired', 'draft'];

@Component({
  selector: 'app-my-listings-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, SzIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="ml">
      <header class="ml__head">
        <a routerLink="/cont" class="ml__back">
          <sz-icon name="back" [size]="14" />
          {{ 'account.back_to_account' | t }}
        </a>
        <div class="ml__title-row">
          <h1>{{ 'my_listings.title' | t }}</h1>
          <a routerLink="/bazar/nou" class="ml__cta">
            + {{ 'my_listings.new_listing' | t }}
          </a>
        </div>
      </header>

      <nav class="ml__tabs" [attr.aria-label]="i18n.t('my_listings.filter_label')">
        @for (f of filters; track f) {
          <button
            type="button"
            [class.is-active]="filter() === f"
            (click)="setFilter(f)"
          >
            {{ 'my_listings.filter.' + f | t }}
            @if (filter() === f) {
              <span class="count">{{ filtered().length }}</span>
            }
          </button>
        }
      </nav>

      @if (loading()) {
        <p class="ml__empty">{{ 'app.loading' | t }}</p>
      } @else if (filtered().length === 0) {
        <p class="ml__empty">{{ 'my_listings.empty' | t }}</p>
      } @else {
        <ul class="ml__list">
          @for (l of filtered(); track l.id) {
            <li class="ml__row">
              <a class="ml__media" [routerLink]="['/bazar', l.slug]">
                @if (l.thumb) {
                  <img [src]="bazar.imageUrl(l.thumb)" [alt]="l.title" />
                } @else {
                  <div class="ml__ph">{{ (l.brand ?? '·') }}</div>
                }
              </a>
              <div class="ml__body">
                <div class="ml__top">
                  <a class="ml__title" [routerLink]="['/bazar', l.slug]">
                    {{ l.title }}
                  </a>
                  <span class="ml__status is-{{ l.status }}">
                    {{ 'inbox.status.' + l.status | t }}
                  </span>
                </div>
                <div class="ml__meta">
                  <span class="ml__price">
                    {{ formatPrice(l.price, l.currency) }}
                  </span>
                  <span class="sep">·</span>
                  <span>{{ 'bazar.condition.' + l.condition | t }}</span>
                  <span class="sep">·</span>
                  <span>{{ l.location }}</span>
                  @if (l.expiresAt) {
                    <span class="sep">·</span>
                    <span>
                      {{
                        'my_listings.expires_on'
                          | t: { date: formatDate(l.expiresAt) }
                      }}
                    </span>
                  }
                </div>
              </div>
              <div class="ml__actions">
                <a class="ml__act" [routerLink]="['/bazar', l.slug, 'editare']">
                  {{ 'my_listings.edit' | t }}
                </a>
                @if (l.status === 'active' || l.status === 'expired') {
                  <button
                    type="button"
                    class="ml__act"
                    [disabled]="refreshingId() === l.id"
                    (click)="refresh(l.id)"
                  >
                    {{
                      (refreshingId() === l.id
                        ? 'my_listings.refreshing'
                        : 'my_listings.refresh') | t
                    }}
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .ml { max-width: 960px; margin: 0 auto; padding: 32px var(--gutter-x) 64px; }
      .ml__back {
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
      .ml__title-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 4vw, 38px);
        line-height: 1.1;
        margin: 0;
      }
      .ml__cta {
        padding: 10px 16px;
        background: var(--accent);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-decoration: none;
      }
      .ml__tabs {
        display: flex;
        gap: 0;
        margin: 22px 0 16px;
        border-bottom: 1px solid var(--line);
      }
      .ml__tabs button {
        padding: 10px 16px;
        background: none;
        border: 0;
        border-bottom: 2px solid transparent;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-muted);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .ml__tabs button:hover { color: var(--fg); }
      .ml__tabs button.is-active {
        color: var(--accent);
        border-bottom-color: var(--accent);
      }
      .ml__tabs .count {
        background: var(--bg-elev);
        padding: 1px 6px;
        font-size: 10px;
      }
      .ml__empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        border: 1px dashed var(--line);
      }

      .ml__list { list-style: none; margin: 0; padding: 0; }
      .ml__row {
        display: grid;
        grid-template-columns: 96px 1fr auto;
        gap: 16px;
        padding: 14px 16px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        margin-bottom: 8px;
        align-items: center;
      }
      .ml__media {
        width: 96px;
        aspect-ratio: 1 / 1;
        background: var(--bg);
        overflow: hidden;
        display: block;
      }
      .ml__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ml__ph {
        display: grid;
        place-items: center;
        height: 100%;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .ml__top {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin-bottom: 4px;
      }
      .ml__title {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 16px;
        color: var(--fg);
        text-decoration: none;
      }
      .ml__title:hover { color: var(--accent); }
      .ml__status {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1px solid var(--line-strong);
        color: var(--fg-muted);
      }
      .ml__status.is-active { color: var(--accent); border-color: var(--accent); }
      .ml__status.is-sold { color: var(--fg); background: var(--accent); border-color: var(--accent); }
      .ml__status.is-expired { color: #c0392b; border-color: #c0392b; }
      .ml__status.is-draft { color: var(--fg-muted); }
      .ml__meta {
        display: inline-flex;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .ml__meta .sep { color: var(--fg-subtle); }
      .ml__price { color: var(--fg); font-weight: 600; }

      .ml__actions { display: inline-flex; gap: 8px; }
      .ml__act {
        padding: 8px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--fg);
        cursor: pointer;
        text-decoration: none;
        min-height: 36px;
        display: inline-flex;
        align-items: center;
      }
      .ml__act:hover { border-color: var(--accent); color: var(--accent); }
      .ml__act:disabled { opacity: 0.5; cursor: not-allowed; }

      @media (max-width: 720px) {
        .ml__row { grid-template-columns: 64px 1fr; }
        .ml__media { width: 64px; }
        .ml__actions { grid-column: 1 / -1; justify-content: flex-end; }
      }
    `,
  ],
})
export class MyListingsPage {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);

  readonly filters = FILTERS;
  readonly all = signal<BazarListItem[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<FilterKey>('all');
  readonly refreshingId = signal<string | null>(null);

  readonly formatPrice = formatPrice;

  readonly filtered = computed(() => {
    const list = this.all();
    const f = this.filter();
    if (f === 'all') return list;
    return list.filter((l) => l.status === f);
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.bazar.listOwn();
      this.all.set(rows);
    } catch (err) {
      console.error('[bazar] my listings failed', err);
      this.all.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(f: FilterKey): void {
    this.filter.set(f);
  }

  async refresh(id: string): Promise<void> {
    if (this.refreshingId()) return;
    this.refreshingId.set(id);
    try {
      await this.bazar.refreshOwn(id);
      await this.load();
    } catch (err: unknown) {
      console.error('[bazar] refresh failed', err);
      window.alert(this.i18n.t('my_listings.refresh_error'));
    } finally {
      this.refreshingId.set(null);
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
