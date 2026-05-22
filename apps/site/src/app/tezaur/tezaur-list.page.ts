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
  GEAR_CATEGORIES,
  type GearCategoryLiteral,
} from '@sintezaur/shared';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { EmptyStateComponent } from '../ui/empty-state.component';
import { TPipe } from '../i18n/t.pipe';
import {
  TezaurService,
  type TezaurBrandSuggestion,
  type TezaurListQuery,
  type TezaurListResponse,
} from './tezaur.service';

const SORT_OPTIONS: NonNullable<TezaurListQuery['sort']>[] = [
  'popular',
  'alpha',
  'newest',
  'year_asc',
  'year_desc',
];

const PAGE_SIZE = 24;

/** Common synth/instrument types surfaced by the rail "Tip" filter.
 *  We can't enumerate values from the DB at render time without an extra
 *  endpoint — these match the buckets we use in the contributor form
 *  (`tezaur-add.page.ts`) and align with V09's static list. */
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'monophonic', label: 'Monofonic' },
  { value: 'polyphonic', label: 'Polifonic' },
  { value: 'paraphonic', label: 'Parafonic' },
  { value: 'hybrid', label: 'Hibrid' },
  { value: 'fm', label: 'FM' },
  { value: 'wavetable', label: 'Wavetable' },
  { value: 'semi_modular', label: 'Semi-modular' },
];

/** Year-range slider end-points. Anything older than 1960 or newer than
 *  current year + 1 would just confuse the visual (clamp at sliders).
 *  Update when the catalog grows to include genuinely pre-60s gear. */
const YEAR_MIN = 1960;
const YEAR_MAX = 2030;

@Component({
  selector: 'app-tezaur-list-page',
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
      <!-- HEADER -->
      <section class="tez-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="tez-header__sub">{{ 'tezaur.page_eyebrow' | t }}</p>
          <h1 class="tez-header__title">
            {{ 'tezaur.page_title' | t }}<span class="dot">.</span>
          </h1>
        </div>
        <div>
          <p class="tez-header__lede">{{ 'tezaur.page_lede' | t }}</p>
          <div class="tez-header__stats">
            <div class="tez-header__stat">
              <span class="k">// {{ 'tezaur.stats.pieces' | t }}</span>
              <span class="v">{{ response()?.totalCount ?? '—' }}</span>
            </div>
            <div class="tez-header__stat">
              <span class="k">// {{ 'tezaur.stats.brands' | t }}</span>
              <span class="v">{{ brands().length || '—' }}</span>
            </div>
            <div class="tez-header__stat">
              <span class="k">// {{ 'tezaur.stats.categories' | t }}</span>
              <span class="v">{{ categories.length }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TOOLBAR -->
      <div class="tez-toolbar has-add crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <label class="tez-search">
          <svg><use href="#i-search"/></svg>
          <input
            type="search"
            [placeholder]="i18n.t('tezaur.search_placeholder')"
            [value]="qText()"
            (input)="onSearchInput($any($event.target).value)"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div class="tez-sort">
          <span class="tez-sort__label">// {{ 'tezaur.sort.label' | t }}</span>
          <select
            [value]="sort()"
            (change)="setSort($any($event.target).value)"
            [attr.aria-label]="i18n.t('tezaur.sort.label')"
          >
            @for (s of sortOptions; track s) {
              <option [value]="s">{{ 'tezaur.sort.' + s | t }}</option>
            }
          </select>
          <svg class="tez-sort__caret" width="14" height="14"><use href="#i-caret-down"/></svg>
        </div>
        <div class="tez-view" role="group" [attr.aria-label]="'tezaur.view.label' | t">
          <button
            type="button"
            [class.is-active]="viewMode() === 'grid'"
            (click)="setViewMode('grid')"
          >
            {{ 'tezaur.view.grid' | t }}
          </button>
          <button
            type="button"
            [class.is-active]="viewMode() === 'list'"
            (click)="setViewMode('list')"
          >
            {{ 'tezaur.view.list' | t }}
          </button>
        </div>
        <a
          class="tez-add-btn"
          routerLink="/tezaur/adauga"
          [attr.aria-label]="i18n.t('tezaur.add_button_aria')"
        >
          <span class="tez-add-btn__plus">+</span>
          {{ 'tezaur.add_button' | t }}
        </a>
      </div>

      <!-- ACTIVE FILTER CHIPS -->
      @if (activeChips().length) {
        <div class="tez-chips">
          <span class="tez-chips__label">{{ 'tezaur.filters.active_label' | t }}</span>
          @for (chip of activeChips(); track chip.key) {
            <span class="tez-chip">
              {{ chip.label }}
              <button
                type="button"
                [attr.aria-label]="i18n.t('tezaur.filters.clear_all')"
                (click)="clearChip(chip.key)"
              >
                <svg><use href="#i-x"/></svg>
              </button>
            </span>
          }
          <button class="tez-chip__clear" type="button" (click)="clearAll()">
            {{ 'tezaur.filters.clear_all' | t }}
          </button>
        </div>
      }

      <!-- MAIN: rail + grid -->
      <div class="tez-main">
        <!-- ============ FILTER RAIL ============ -->
        <aside class="tez-rail" [attr.aria-label]="i18n.t('tezaur.filters.category')">
          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'tezaur.filters.category' | t }}
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

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'tezaur.filters.type' | t }}
              <span class="count">{{ typeOptions.length }}</span>
            </header>
            <div class="tez-rail__body">
              @for (t of typeOptions; track t.value) {
                <label class="tez-check">
                  <input
                    type="checkbox"
                    [checked]="type() === t.value"
                    (change)="toggleType(t.value, $any($event.target).checked)"
                  />
                  <span class="box"></span>
                  <span class="lbl">{{ t.label }}</span>
                </label>
              }
            </div>
          </section>

          @if (topBrands().length > 0) {
            <section class="tez-rail__sec">
              <header class="tez-rail__head">
                {{ 'tezaur.filters.brand' | t }}
                <span class="count">{{ topBrands().length }}</span>
              </header>
              <div class="tez-rail__body">
                @for (b of topBrands(); track b.name) {
                  <label class="tez-check">
                    <input
                      type="checkbox"
                      [checked]="brand() === b.name"
                      (change)="toggleBrand(b.name, $any($event.target).checked)"
                    />
                    <span class="box"></span>
                    <span class="lbl">{{ b.name }}</span>
                    <span class="num">{{ b.count }}</span>
                  </label>
                }
              </div>
            </section>
          }

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'tezaur.filters.year_released' | t }}
              <span class="count">
                {{ yearMin() ?? YEAR_MIN }}–{{ yearMax() ?? YEAR_MAX }}
              </span>
            </header>
            <div class="tez-rail__body">
              <div class="tez-range-inputs">
                <input
                  type="number"
                  [min]="YEAR_MIN"
                  [max]="YEAR_MAX"
                  [value]="yearMin() ?? ''"
                  [placeholder]="YEAR_MIN"
                  (change)="setYearRange(parseYear($any($event.target).value), yearMax())"
                  [attr.aria-label]="'tezaur.filters.year_min_aria' | t"
                />
                <span class="tez-range-inputs__sep">—</span>
                <input
                  type="number"
                  [min]="YEAR_MIN"
                  [max]="YEAR_MAX"
                  [value]="yearMax() ?? ''"
                  [placeholder]="YEAR_MAX"
                  (change)="setYearRange(yearMin(), parseYear($any($event.target).value))"
                  [attr.aria-label]="'tezaur.filters.year_max_aria' | t"
                />
              </div>
            </div>
          </section>

          <section class="tez-rail__sec">
            <header class="tez-rail__head">
              {{ 'tezaur.filters.status' | t }}
              <span class="count">2</span>
            </header>
            <div class="tez-rail__body">
              <label class="tez-check">
                <input
                  type="checkbox"
                  [checked]="status() === 'in_production'"
                  (change)="toggleStatus('in_production', $any($event.target).checked)"
                />
                <span class="box"></span>
                <span class="lbl">{{ 'tezaur.filters.in_production' | t }}</span>
              </label>
              <label class="tez-check">
                <input
                  type="checkbox"
                  [checked]="status() === 'discontinued'"
                  (change)="toggleStatus('discontinued', $any($event.target).checked)"
                />
                <span class="box"></span>
                <span class="lbl">{{ 'tezaur.filters.discontinued' | t }}</span>
              </label>
            </div>
          </section>
        </aside>

        <!-- ============ GEAR GRID ============ -->
        <div>
          <div class="tez-results-row">
            <span>
              <span class="accent">// </span>
              @if (response(); as r) {
                {{ 'tezaur.results_count' | t: { shown: r.items.length, total: r.totalCount } }}
              } @else if (loading()) {
                {{ 'app.loading' | t }}
              }
            </span>
            @if (response(); as r) {
              <span>
                {{ 'tezaur.pagination.page_of' | t: { page: r.page, total: r.totalPages } }}
              </span>
            }
          </div>

          @if (response(); as r) {
            @if (r.items.length === 0) {
              <app-empty-state
                icon="🎛️"
                [title]="'Niciun echipament pentru filtrele alese'"
                [lede]="'Încearcă să elimini un filtru sau să cauți alt brand. Catalogul are 100+ echipamente — nu te oprești la zero.'"
                ctaLabel="Resetează filtrele"
                ctaRouterLink="/tezaur"
              />
            } @else {
              <div class="tez-grid crosses">
                <span class="crosses-tl"></span><span class="crosses-tr"></span>
                @for (g of r.items; track g.id) {
                  <a class="tez-card" [routerLink]="['/tezaur', g.slug]">
                    <div class="tez-card__media">
                      <div class="gear-fill" [attr.data-gear]="g.slug">
                        @if (g.thumb) {
                          <img
                            class="gear-fill__photo"
                            [src]="tezaur.imageUrl(g.thumb)"
                            [alt]="g.brand + ' ' + g.model"
                            loading="lazy"
                          />
                        }
                        <span class="gear-fill__label">{{ g.brand }} · {{ g.model }}</span>
                      </div>
                    </div>
                    <div class="tez-card__brand">// {{ g.brand }}</div>
                    <div class="tez-card__model">{{ g.model }}</div>
                    <div class="tez-card__tags">
                      @if (g.type) {
                        <span class="tez-card__tag">{{ g.type }}</span>
                      }
                      <span class="tez-card__tag">{{ categoryLabel(g.category) }}</span>
                    </div>
                    <div class="tez-card__foot">
                      <span>
                        <b>{{ g.ownersPublicCount }}</b>
                        {{ 'tezaur.card.owners' | t: { count: g.ownersPublicCount } }}
                      </span>
                      <span class="tez-card__year">
                        {{ g.yearReleased ?? '—' }}
                      </span>
                    </div>
                  </a>
                }
              </div>
            }

            <!-- PAGINATION -->
            @if (r.totalPages > 1) {
              <nav class="tez-pag" [attr.aria-label]="i18n.t('tezaur.filters.active_label')">
                <span>
                  {{ 'tezaur.pagination.show_count' | t: { shown: r.items.length, total: r.totalCount } }}
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
      /* All .tez-* structural classes (header/toolbar/search/sort/view/
         chips/main/rail/check/grid/card/pag) are provided globally by
         v05.css — page-locals below cover only the extras: results
         counter row + empty state. */
      .tez-results-row {
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
      .tez-results-row .accent { color: var(--accent); }
      .tez-empty {
        padding: 48px;
        text-align: center;
        color: var(--fg-muted);
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }

      /* Year range — V09 shows a dual-dot range slider in the static
         design, but the working filter ships as two number inputs
         joined by an em-dash so the user can type exact years. Visual
         polish to a real range slider is a later pass. */
      .tez-range-inputs {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tez-range-inputs input {
        width: 100%;
        min-width: 0;
        padding: 6px 8px;
        background: var(--bg);
        border: 1px solid var(--line);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.06em;
      }
      .tez-range-inputs input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .tez-range-inputs__sep {
        color: var(--fg-subtle);
        font-family: var(--font-mono);
        font-size: 11px;
      }
    `,
  ],
})
export class TezaurListPage {
  readonly i18n = inject(I18nService);
  readonly tezaur = inject(TezaurService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly categories = GEAR_CATEGORIES;
  readonly sortOptions = SORT_OPTIONS;
  readonly typeOptions = TYPE_OPTIONS;
  readonly YEAR_MIN = YEAR_MIN;
  readonly YEAR_MAX = YEAR_MAX;

  // ----- state signals -----
  readonly qText = signal('');
  readonly category = signal<GearCategoryLiteral | null>(null);
  readonly brand = signal<string | null>(null);
  readonly type = signal<string | null>(null);
  readonly yearMin = signal<number | null>(null);
  readonly yearMax = signal<number | null>(null);
  readonly status = signal<'in_production' | 'discontinued' | null>(null);
  readonly sort = signal<NonNullable<TezaurListQuery['sort']>>('popular');
  readonly page = signal(1);
  readonly viewMode = signal<'grid' | 'list'>('grid');

  readonly response = signal<TezaurListResponse | null>(null);
  readonly loading = signal(false);
  /** Brand list for the rail filter — capped at 13 in V09 (top brands by
   *  gear count). Slice client-side so the rail stays scannable. */
  readonly brands = signal<TezaurBrandSuggestion[]>([]);
  readonly topBrands = computed(() => this.brands().slice(0, 13));

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.seo.set({
      title: 'Tezaur — catalog de echipamente muzicale',
      description:
        'Enciclopedia echipamentelor muzicale: sintetizatoare, drum machines, module Eurorack, software și mai mult. Specificații, fotografii, recenzii și anunțuri în România.',
      canonicalPath: '/tezaur',
    });
    // Sync from URL on init + any back/forward.
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') ?? '';
      const cat = params.get('category') as GearCategoryLiteral | null;
      const brand = params.get('brand');
      const type = params.get('type');
      const yMin = Number(params.get('yearMin') ?? '');
      const yMax = Number(params.get('yearMax') ?? '');
      const stat = params.get('status') as 'in_production' | 'discontinued' | null;
      const so = (params.get('sort') as NonNullable<TezaurListQuery['sort']> | null) ?? 'popular';
      const pg = Number(params.get('page') ?? '1') || 1;

      // Set silently — no extra fetch from each effect.
      this.qText.set(q);
      this.category.set(cat);
      this.brand.set(brand);
      this.type.set(type);
      this.yearMin.set(Number.isFinite(yMin) && yMin > 0 ? yMin : null);
      this.yearMax.set(Number.isFinite(yMax) && yMax > 0 ? yMax : null);
      this.status.set(stat);
      this.sort.set(so);
      this.page.set(pg);

      void this.fetch();
    });

    // Fire-and-forget brand fetch (rail list + header `Branduri` stat).
    void this.loadBrands();
  }

  private async loadBrands(): Promise<void> {
    try {
      const list = await this.tezaur.listBrandSuggestions();
      // Backend returns brands sorted by count desc; keep that order.
      this.brands.set(list);
    } catch (err) {
      console.warn('[tezaur] brand list failed', err);
      this.brands.set([]);
    }
  }

  readonly activeChips = computed(() => {
    const chips: { key: string; label: string }[] = [];
    if (this.qText()) chips.push({ key: 'q', label: `"${this.qText()}"` });
    const cat = this.category();
    if (cat) chips.push({ key: 'category', label: this.categoryLabel(cat) });
    const br = this.brand();
    if (br) chips.push({ key: 'brand', label: br });
    const tp = this.type();
    if (tp) {
      chips.push({
        key: 'type',
        label: this.typeLabel(tp),
      });
    }
    const yMin = this.yearMin();
    const yMax = this.yearMax();
    if (yMin !== null || yMax !== null) {
      chips.push({
        key: 'year',
        label: `${yMin ?? YEAR_MIN}–${yMax ?? YEAR_MAX}`,
      });
    }
    const stat = this.status();
    if (stat) {
      chips.push({
        key: 'status',
        label:
          stat === 'in_production'
            ? this.i18n.t('tezaur.filters.in_production')
            : this.i18n.t('tezaur.filters.discontinued'),
      });
    }
    return chips;
  });

  typeLabel(value: string): string {
    return (
      this.typeOptions.find((t) => t.value === value)?.label ??
      value.charAt(0).toUpperCase() + value.slice(1)
    );
  }

  /** Parses a `<input type="number">` value to `number | null`.
   *  Empty/blank strings clear the bound (return null). */
  parseYear(raw: string): number | null {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return null;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
  }

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
    // i18n keys live under `tezaur.filters.categories.<key>` later; for
    // M2 we render the raw enum value humanized so the UI still ships
    // without a 18-entry translation table.
    return cat
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  onSearchInput(value: string): void {
    this.qText.set(value);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.page.set(1);
      this.syncUrl();
    }, 300);
  }

  setSort(s: string): void {
    this.sort.set(s as NonNullable<TezaurListQuery['sort']>);
    this.page.set(1);
    this.syncUrl();
  }

  toggleCategory(cat: GearCategoryLiteral, checked: boolean): void {
    this.category.set(checked ? cat : null);
    this.page.set(1);
    this.syncUrl();
  }

  toggleStatus(s: 'in_production' | 'discontinued', checked: boolean): void {
    this.status.set(checked ? s : null);
    this.page.set(1);
    this.syncUrl();
  }

  toggleBrand(name: string, checked: boolean): void {
    this.brand.set(checked ? name : null);
    this.page.set(1);
    this.syncUrl();
  }

  toggleType(value: string, checked: boolean): void {
    this.type.set(checked ? value : null);
    this.page.set(1);
    this.syncUrl();
  }

  setYearRange(min: number | null, max: number | null): void {
    // Clamp to the slider end-points so a user can't query 1700→1500
    // (silently no-op) via direct URL tampering.
    const clampedMin = min !== null ? Math.max(YEAR_MIN, Math.min(YEAR_MAX, min)) : null;
    const clampedMax = max !== null ? Math.max(YEAR_MIN, Math.min(YEAR_MAX, max)) : null;
    this.yearMin.set(clampedMin);
    this.yearMax.set(clampedMax);
    this.page.set(1);
    this.syncUrl();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  clearChip(key: string): void {
    if (key === 'q') this.qText.set('');
    if (key === 'category') this.category.set(null);
    if (key === 'brand') this.brand.set(null);
    if (key === 'type') this.type.set(null);
    if (key === 'year') {
      this.yearMin.set(null);
      this.yearMax.set(null);
    }
    if (key === 'status') this.status.set(null);
    this.page.set(1);
    this.syncUrl();
  }

  clearAll(): void {
    this.qText.set('');
    this.category.set(null);
    this.brand.set(null);
    this.type.set(null);
    this.yearMin.set(null);
    this.yearMax.set(null);
    this.status.set(null);
    this.page.set(1);
    this.syncUrl();
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
        brand: this.brand() || null,
        type: this.type() || null,
        yearMin: this.yearMin() ?? null,
        yearMax: this.yearMax() ?? null,
        status: this.status() || null,
        sort: this.sort() === 'popular' ? null : this.sort(),
        page: this.page() === 1 ? null : this.page(),
      },
      queryParamsHandling: 'merge',
    });
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.tezaur.list({
        q: this.qText() || undefined,
        category: this.category() ?? undefined,
        brand: this.brand() ?? undefined,
        type: this.type() ?? undefined,
        yearMin: this.yearMin() ?? undefined,
        yearMax: this.yearMax() ?? undefined,
        status: this.status() ?? undefined,
        sort: this.sort(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      });
      this.response.set(res);
    } catch (err) {
      console.error('[tezaur] list fetch failed', err);
      this.response.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
