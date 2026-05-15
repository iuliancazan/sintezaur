import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DISPLAY_CURRENCIES,
  GEAR_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_DELIVERIES,
  LISTING_KINDS,
  LISTING_SORTS,
  formatPrice,
  type DisplayCurrencyLiteral,
  type GearCategoryLiteral,
  type ListingConditionLiteral,
  type ListingDeliveryLiteral,
  type ListingKindLiteral,
  type ListingSortLiteral,
} from '@sintezaur/shared';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { EmptyStateComponent } from '../ui/empty-state.component';
import { TPipe } from '../i18n/t.pipe';
import { AuthService } from '../auth/auth.service';
import { BazarService, type BazarListResponse } from './bazar.service';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-bazar-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- HEADER (V05: shared .tez-header style) -->
      <section class="tez-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="tez-header__sub">{{ 'bazar.page_eyebrow' | t }}</p>
          <h1 class="tez-header__title">
            {{ 'bazar.page_title' | t }}<span class="dot">.</span>
          </h1>
        </div>
        <div>
          <p class="tez-header__lede">{{ 'bazar.page_lede' | t }}</p>
          <div class="tez-header__stats">
            <div class="tez-header__stat">
              <span class="k">// {{ 'bazar.stats.listings' | t }}</span>
              <span class="v">{{ response()?.totalCount ?? '—' }}</span>
            </div>
            <div class="tez-header__stat">
              <span class="k">// {{ 'bazar.stats.categories' | t }}</span>
              <span class="v">{{ categories.length }}</span>
            </div>
            <div class="tez-header__stat">
              <span class="k">// {{ 'bazar.stats.cities' | t }}</span>
              <span class="v">RO</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ACTION ROW (V05 Bazar.html — 3 quick links) -->
      <div class="bz-actions">
        <a class="bz-actions__primary" routerLink="/bazar/nou">{{ 'bazar.list_new' | t }}</a>
        @if (auth.isLoggedIn()) {
          <a class="bz-actions__link" routerLink="/cont/favorite">
            <svg><use href="#i-bookmark"/></svg>
            {{ 'bazar.actions_saved_listings' | t }}
          </a>
          <a class="bz-actions__link" routerLink="/cont/favorite/cautari">
            <svg><use href="#i-save-search"/></svg>
            {{ 'bazar.actions_saved_searches' | t }}
          </a>
        }
      </div>

      <!-- TOOLBAR (V05: .tez-toolbar) -->
      <div class="tez-toolbar crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <label class="tez-search">
          <svg><use href="#i-search"/></svg>
          <input
            type="search"
            [placeholder]="i18n.t('bazar.search_placeholder')"
            [value]="qText()"
            (input)="onSearchInput($any($event.target).value)"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div class="tez-sort">
          <span class="tez-sort__label">// {{ 'bazar.sort.label' | t }}</span>
          <select
            [value]="sort()"
            (change)="setSort($any($event.target).value)"
            [attr.aria-label]="i18n.t('bazar.sort.label')"
          >
            @for (s of sortOptions; track s) {
              <option [value]="s">{{ 'bazar.sort.' + s | t }}</option>
            }
          </select>
          <svg class="tez-sort__caret" width="14" height="14"><use href="#i-caret-down"/></svg>
        </div>
      </div>

      <!-- ACTIVE FILTER CHIPS (V05: .tez-chips) -->
      @if (activeChips().length) {
        <div class="tez-chips">
          <span class="tez-chips__label">{{ 'bazar.filters.active_label' | t }}</span>
          @for (chip of activeChips(); track chip.key) {
            <span class="tez-chip">
              {{ chip.label }}
              <button
                type="button"
                [attr.aria-label]="i18n.t('bazar.filters.clear_all')"
                (click)="clearChip(chip.key, chip.value)"
              >
                <svg><use href="#i-x"/></svg>
              </button>
            </span>
          }
          <button class="tez-chip__clear" type="button" (click)="clearAll()">
            {{ 'bazar.filters.clear_all' | t }} ×
          </button>
          @if (auth.isLoggedIn()) {
            <button
              type="button"
              class="tez-chip__clear"
              style="margin-left:0;color:var(--accent);"
              [disabled]="saving()"
              (click)="saveCurrentSearch()"
            >
              @if (savedJustNow()) {
                ✓ {{ 'bazar.filters.saved_ok' | t }}
              } @else {
                ☆ {{ 'bazar.filters.save_search' | t }}
              }
            </button>
          }
        </div>
      }

      <!-- MAIN: rail + grid (V05: .tez-main) -->
      <div class="tez-main">
        <aside class="tez-rail" [attr.aria-label]="i18n.t('bazar.filters.heading')">
          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'bazar.filters.condition' | t }}
              <span class="count">{{ conditions.length }}</span>
            </header>
            <div class="tez-rail__body">
              @for (c of conditions; track c) {
                <label class="tez-check">
                  <input
                    type="checkbox"
                    [checked]="conditionSet().has(c)"
                    (change)="toggleCondition(c, $any($event.target).checked)"
                  />
                  <span class="box"></span>
                  <span class="lbl">{{ 'bazar.condition.' + c | t }}</span>
                </label>
              }
            </div>
          </section>

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'bazar.filters.kind' | t }}
              <span class="count">{{ kinds.length }}</span>
            </header>
            <div class="tez-rail__body">
              @for (k of kinds; track k) {
                <label class="tez-check">
                  <input
                    type="checkbox"
                    [checked]="kindSet().has(k)"
                    (change)="toggleKind(k, $any($event.target).checked)"
                  />
                  <span class="box"></span>
                  <span class="lbl">{{ 'bazar.kind.' + k | t }}</span>
                </label>
              }
            </div>
          </section>

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'bazar.filters.delivery' | t }}
              <span class="count">{{ deliveries.length }}</span>
            </header>
            <div class="tez-rail__body">
              @for (d of deliveries; track d) {
                <label class="tez-check">
                  <input
                    type="checkbox"
                    [checked]="deliverySet().has(d)"
                    (change)="toggleDelivery(d, $any($event.target).checked)"
                  />
                  <span class="box"></span>
                  <span class="lbl">{{ 'bazar.delivery.' + d | t }}</span>
                </label>
              }
            </div>
          </section>

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'bazar.filters.price' | t }}
              <span class="count">{{ (currency() ?? 'ron') | uppercase }}</span>
            </header>
            <div class="tez-rail__body bz-rail__price">
              <div class="bz-price-row">
                <input
                  type="number"
                  min="0"
                  step="50"
                  [value]="priceMin() ?? ''"
                  (change)="setPriceMin($any($event.target).value)"
                  [placeholder]="i18n.t('bazar.filters.price_min')"
                />
                <span>—</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  [value]="priceMax() ?? ''"
                  (change)="setPriceMax($any($event.target).value)"
                  [placeholder]="i18n.t('bazar.filters.price_max')"
                />
              </div>
              <div class="bz-currency">
                @for (cur of currencies; track cur) {
                  <button
                    type="button"
                    [class.is-active]="currency() === cur"
                    (click)="toggleCurrency(cur)"
                  >{{ cur | uppercase }}</button>
                }
              </div>
            </div>
          </section>

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'bazar.filters.location' | t }}
            </header>
            <div class="tez-rail__body">
              <input
                class="bz-text-input"
                type="text"
                [value]="location()"
                (input)="onLocationInput($any($event.target).value)"
                [placeholder]="i18n.t('bazar.filters.location_placeholder')"
              />
            </div>
          </section>

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'bazar.filters.category' | t }}
              <span class="count">{{ categories.length }}</span>
            </header>
            <div class="tez-rail__body">
              @for (cat of categories; track cat) {
                <label class="tez-check">
                  <input
                    type="checkbox"
                    [checked]="category() === cat"
                    (change)="toggleCategory(cat, $any($event.target).checked)"
                  />
                  <span class="box"></span>
                  <span class="lbl">{{ categoryLabel(cat) }}</span>
                </label>
              }
            </div>
          </section>
        </aside>

        <!-- Listing grid (V05: .bz-grid wrapping .listing cards) -->
        <div>
          <div class="bz-results-row">
            <span>
              <span class="accent">// </span>
              @if (response(); as r) {
                {{ 'bazar.results_count' | t: { shown: r.items.length, total: r.totalCount } }}
              } @else if (loading()) {
                {{ 'app.loading' | t }}
              }
            </span>
            @if (response(); as r) {
              <span>
                {{ 'bazar.pagination.page_of' | t: { page: r.page, total: r.totalPages } }}
              </span>
            }
          </div>

          @if (response(); as r) {
            @if (r.items.length === 0) {
              <app-empty-state
                icon="🛒"
                [title]="'Niciun anunț pentru filtrele alese'"
                [lede]="'Salvează căutarea ca să primești notificare când apar anunțuri care se potrivesc — sau resetează filtrele.'"
                ctaLabel="Resetează filtrele"
                ctaRouterLink="/bazar"
              />
            } @else {
              <div class="bz-grid">
                @for (l of r.items; track l.id) {
                  <a class="listing" [routerLink]="['/bazar', l.slug]" style="text-decoration:none;color:inherit;">
                    <div class="listing__media">
                      <div class="gear-fill" [attr.data-gear]="l.gearSlug ?? l.slug">
                        @if (l.thumb) {
                          <img class="gear-fill__photo" [src]="bazar.imageUrl(l.thumb)" [alt]="l.title" loading="lazy" />
                        }
                        <span class="gear-fill__label">{{ l.brand || '' }} {{ l.brand ? '·' : '' }} {{ l.model || l.title }}</span>
                      </div>
                      <span class="listing__chip" [attr.data-cond]="l.condition">{{ 'bazar.condition.' + l.condition | t }}</span>
                    </div>
                    <div class="listing__body">
                      <div class="listing__brand">// {{ l.brand || '—' }}</div>
                      <div class="listing__title">{{ l.model || l.title }}</div>
                      <div class="listing__row">
                        <div class="listing__price">{{ formatPriceShort(l.price) }}<small>{{ l.currency | uppercase }}</small></div>
                        <div class="listing__loc">
                          <svg width="11" height="11" viewBox="0 0 24 24"><use href="#i-pin"/></svg>
                          {{ l.location }}
                        </div>
                      </div>
                      <div class="listing__seller">
                        <span class="avatar" style="width:22px;height:22px;font-size:10px">{{ sellerInitials(l.seller.username) }}</span>
                        @if (l.seller.avgRating) {
                          <span><span class="star">★</span> {{ l.seller.avgRating }}</span>
                          <span style="opacity:.5">·</span>
                        }
                        <span>{{ l.seller.transactionCount }} {{ 'bazar.card.tx' | t }}</span>
                      </div>
                    </div>
                  </a>
                }
              </div>
            }

            @if (r.totalPages > 1) {
              <nav class="tez-pag" [attr.aria-label]="i18n.t('bazar.filters.active_label')">
                <span>
                  {{ 'bazar.pagination.show_count' | t: { shown: r.items.length, total: r.totalCount } }}
                </span>
                <div class="tez-pag__nums">
                  <button
                    type="button"
                    class="tez-pag__num"
                    [class.is-disabled]="r.page === 1"
                    [disabled]="r.page === 1"
                    (click)="goToPage(r.page - 1)"
                    aria-label="Previous page"
                  >‹</button>
                  @for (p of paginationPages(); track p) {
                    @if (p === '…') {
                      <span class="tez-pag__num is-ellipsis">…</span>
                    } @else {
                      <button
                        type="button"
                        class="tez-pag__num"
                        [class.is-active]="p === r.page"
                        (click)="goToPage($any(p))"
                      >{{ p }}</button>
                    }
                  }
                  <button
                    type="button"
                    class="tez-pag__num"
                    [class.is-disabled]="r.page === r.totalPages"
                    [disabled]="r.page === r.totalPages"
                    (click)="goToPage(r.page + 1)"
                    aria-label="Next page"
                  >›</button>
                </div>
              </nav>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      /* Page-local extras NOT covered by v05.css global utilities: */
      .bz-rail__price { gap: 10px; }
      .bz-price-row {
        display: grid;
        grid-template-columns: 1fr 12px 1fr;
        gap: 6px;
        align-items: center;
      }
      .bz-price-row input,
      .bz-text-input {
        padding: 6px 8px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg);
      }
      .bz-currency { display: inline-flex; gap: 0; margin-top: 8px; }
      .bz-currency button {
        flex: 1;
        padding: 6px 8px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        letter-spacing: 0.08em;
        cursor: pointer;
        min-height: auto;
      }
      .bz-currency button + button { border-left: 0; }
      .bz-currency button.is-active {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .bz-results-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-bottom: 14px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
        text-transform: uppercase;
      }
      .bz-results-row .accent { color: var(--accent); }
    `,
  ],
})
export class BazarListPage {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly categories = GEAR_CATEGORIES;
  readonly conditions = LISTING_CONDITIONS;
  readonly kinds = LISTING_KINDS;
  readonly deliveries = LISTING_DELIVERIES;
  readonly currencies = DISPLAY_CURRENCIES;
  readonly sortOptions = LISTING_SORTS;

  // ----- state signals -----
  readonly qText = signal('');
  readonly category = signal<GearCategoryLiteral | null>(null);
  readonly conditionsSig = signal<ListingConditionLiteral[]>([]);
  readonly kindsSig = signal<ListingKindLiteral[]>([]);
  readonly deliveriesSig = signal<ListingDeliveryLiteral[]>([]);
  readonly priceMin = signal<number | null>(null);
  readonly priceMax = signal<number | null>(null);
  readonly currency = signal<DisplayCurrencyLiteral | null>(null);
  readonly location = signal('');
  readonly sort = signal<ListingSortLiteral>('newest');
  readonly page = signal(1);

  readonly response = signal<BazarListResponse | null>(null);
  readonly loading = signal(false);

  readonly saving = signal(false);
  readonly savedJustNow = signal(false);

  // Derived sets for O(1) lookup in template
  readonly conditionSet = computed(() => new Set(this.conditionsSig()));
  readonly kindSet = computed(() => new Set(this.kindsSig()));
  readonly deliverySet = computed(() => new Set(this.deliveriesSig()));

  readonly formatPrice = formatPrice;

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private locationDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.seo.set({
      title: 'Bazar — anunțuri de echipamente muzicale',
      description:
        'Cumpără, vinde sau schimbă echipamente muzicale în România. Sintetizatoare, drum machines, module, microfoane, plăci de sunet — anunțuri de la pasionați, pentru pasionați.',
      canonicalPath: '/bazar',
    });
    this.route.queryParamMap.subscribe((params) => {
      this.qText.set(params.get('q') ?? '');
      this.category.set(
        (params.get('category') as GearCategoryLiteral | null) ?? null,
      );
      this.conditionsSig.set(
        params.getAll('conditions') as ListingConditionLiteral[],
      );
      this.kindsSig.set(params.getAll('kinds') as ListingKindLiteral[]);
      this.deliveriesSig.set(
        params.getAll('deliveries') as ListingDeliveryLiteral[],
      );
      this.priceMin.set(numOrNull(params.get('priceMin')));
      this.priceMax.set(numOrNull(params.get('priceMax')));
      this.currency.set(
        (params.get('currency') as DisplayCurrencyLiteral | null) ?? null,
      );
      this.location.set(params.get('location') ?? '');
      this.sort.set(
        (params.get('sort') as ListingSortLiteral | null) ?? 'newest',
      );
      this.page.set(Number(params.get('page') ?? '1') || 1);
      void this.fetch();
    });
  }

  readonly activeChips = computed(() => {
    const chips: { key: string; value?: string; label: string }[] = [];
    if (this.qText()) chips.push({ key: 'q', label: `"${this.qText()}"` });
    if (this.category())
      chips.push({ key: 'category', label: this.categoryLabel(this.category()!) });
    for (const c of this.conditionsSig())
      chips.push({
        key: 'conditions',
        value: c,
        label: this.i18n.t('bazar.condition.' + c),
      });
    for (const k of this.kindsSig())
      chips.push({
        key: 'kinds',
        value: k,
        label: this.i18n.t('bazar.kind.' + k),
      });
    for (const d of this.deliveriesSig())
      chips.push({
        key: 'deliveries',
        value: d,
        label: this.i18n.t('bazar.delivery.' + d),
      });
    if (this.priceMin() !== null || this.priceMax() !== null) {
      const lo = this.priceMin() ?? 0;
      const hi = this.priceMax() ?? '∞';
      const cur = (this.currency() ?? 'ron').toUpperCase();
      chips.push({ key: 'price', label: `${lo} — ${hi} ${cur}` });
    }
    if (this.location())
      chips.push({ key: 'location', label: this.location() });
    return chips;
  });

  readonly paginationPages = computed<(number | '…')[]>(() => {
    const total = this.response()?.totalPages ?? 1;
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  });

  categoryLabel(cat: string): string {
    return cat
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  formatPriceShort(price: string | number): string {
    const n = typeof price === 'number' ? price : Number(price);
    if (!isFinite(n)) return String(price);
    return n.toLocaleString('ro-RO', { maximumFractionDigits: 0 });
  }

  sellerInitials(name: string): string {
    if (!name) return '—';
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  onSearchInput(value: string): void {
    this.qText.set(value);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.page.set(1);
      this.syncUrl();
    }, 300);
  }

  onLocationInput(value: string): void {
    this.location.set(value);
    if (this.locationDebounce) clearTimeout(this.locationDebounce);
    this.locationDebounce = setTimeout(() => {
      this.page.set(1);
      this.syncUrl();
    }, 300);
  }

  setSort(s: string): void {
    this.sort.set(s as ListingSortLiteral);
    this.page.set(1);
    this.syncUrl();
  }

  toggleCategory(cat: GearCategoryLiteral, checked: boolean): void {
    this.category.set(checked ? cat : null);
    this.page.set(1);
    this.syncUrl();
  }

  toggleCondition(c: ListingConditionLiteral, checked: boolean): void {
    const next = checked
      ? Array.from(new Set([...this.conditionsSig(), c]))
      : this.conditionsSig().filter((x) => x !== c);
    this.conditionsSig.set(next);
    this.page.set(1);
    this.syncUrl();
  }

  toggleKind(k: ListingKindLiteral, checked: boolean): void {
    const next = checked
      ? Array.from(new Set([...this.kindsSig(), k]))
      : this.kindsSig().filter((x) => x !== k);
    this.kindsSig.set(next);
    this.page.set(1);
    this.syncUrl();
  }

  toggleDelivery(d: ListingDeliveryLiteral, checked: boolean): void {
    const next = checked
      ? Array.from(new Set([...this.deliveriesSig(), d]))
      : this.deliveriesSig().filter((x) => x !== d);
    this.deliveriesSig.set(next);
    this.page.set(1);
    this.syncUrl();
  }

  toggleCurrency(cur: DisplayCurrencyLiteral): void {
    this.currency.set(this.currency() === cur ? null : cur);
    this.page.set(1);
    this.syncUrl();
  }

  setPriceMin(value: string): void {
    this.priceMin.set(numOrNull(value));
    this.page.set(1);
    this.syncUrl();
  }

  setPriceMax(value: string): void {
    this.priceMax.set(numOrNull(value));
    this.page.set(1);
    this.syncUrl();
  }

  clearChip(key: string, value?: string): void {
    switch (key) {
      case 'q':
        this.qText.set('');
        break;
      case 'category':
        this.category.set(null);
        break;
      case 'conditions':
        if (value)
          this.conditionsSig.set(
            this.conditionsSig().filter((c) => c !== value),
          );
        break;
      case 'kinds':
        if (value)
          this.kindsSig.set(this.kindsSig().filter((k) => k !== value));
        break;
      case 'deliveries':
        if (value)
          this.deliveriesSig.set(
            this.deliveriesSig().filter((d) => d !== value),
          );
        break;
      case 'price':
        this.priceMin.set(null);
        this.priceMax.set(null);
        break;
      case 'location':
        this.location.set('');
        break;
    }
    this.page.set(1);
    this.syncUrl();
  }

  clearAll(): void {
    this.qText.set('');
    this.category.set(null);
    this.conditionsSig.set([]);
    this.kindsSig.set([]);
    this.deliveriesSig.set([]);
    this.priceMin.set(null);
    this.priceMax.set(null);
    this.currency.set(null);
    this.location.set('');
    this.page.set(1);
    this.syncUrl();
  }

  async saveCurrentSearch(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.savedJustNow.set(false);
    try {
      const name = this.suggestedName();
      const query = this.snapshotQuery();
      await this.bazar.createSavedSearch({ name, query });
      this.savedJustNow.set(true);
      setTimeout(() => this.savedJustNow.set(false), 2500);
    } catch (err: unknown) {
      console.error('[bazar] save search failed', err);
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        window.alert(this.i18n.t('bazar.filters.save_cap_reached'));
      } else {
        window.alert(this.i18n.t('bazar.filters.save_error'));
      }
    } finally {
      this.saving.set(false);
    }
  }

  private suggestedName(): string {
    const parts: string[] = [];
    if (this.qText()) parts.push(`"${this.qText()}"`);
    if (this.category()) parts.push(this.categoryLabel(this.category()!));
    if (this.location()) parts.push(this.location());
    if (parts.length === 0) parts.push(`Căutare ${new Date().toLocaleDateString('ro-RO')}`);
    return parts.join(' · ').slice(0, 80);
  }

  private snapshotQuery(): Record<string, unknown> {
    return {
      q: this.qText() || undefined,
      category: this.category() ?? undefined,
      conditions: this.conditionsSig().length ? this.conditionsSig() : undefined,
      kinds: this.kindsSig().length ? this.kindsSig() : undefined,
      deliveries: this.deliveriesSig().length ? this.deliveriesSig() : undefined,
      priceMin: this.priceMin() ?? undefined,
      priceMax: this.priceMax() ?? undefined,
      currency: this.currency() ?? undefined,
      location: this.location() || undefined,
    };
  }

  goToPage(n: number): void {
    const total = this.response()?.totalPages ?? 1;
    if (n < 1 || n > total) return;
    this.page.set(n);
    this.syncUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.qText() || null,
        category: this.category() || null,
        conditions: this.conditionsSig().length ? this.conditionsSig() : null,
        kinds: this.kindsSig().length ? this.kindsSig() : null,
        deliveries: this.deliveriesSig().length ? this.deliveriesSig() : null,
        priceMin: this.priceMin(),
        priceMax: this.priceMax(),
        currency: this.currency() || null,
        location: this.location() || null,
        sort: this.sort() === 'newest' ? null : this.sort(),
        page: this.page() === 1 ? null : this.page(),
      },
      queryParamsHandling: 'merge',
    });
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.bazar.list({
        q: this.qText() || undefined,
        category: this.category() ?? undefined,
        conditions: this.conditionsSig().length
          ? this.conditionsSig()
          : undefined,
        kinds: this.kindsSig().length ? this.kindsSig() : undefined,
        deliveries: this.deliveriesSig().length
          ? this.deliveriesSig()
          : undefined,
        priceMin: this.priceMin() ?? undefined,
        priceMax: this.priceMax() ?? undefined,
        currency: this.currency() ?? undefined,
        location: this.location() || undefined,
        sort: this.sort(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      });
      this.response.set(res);
    } catch (err) {
      console.error('[bazar] list fetch failed', err);
      this.response.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}

function numOrNull(v: string | null): number | null {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
