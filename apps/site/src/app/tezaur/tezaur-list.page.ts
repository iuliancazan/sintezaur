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
import { SzIconComponent } from '@sintezaur/ui';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { EmptyStateComponent } from '../ui/empty-state.component';
import { TPipe } from '../i18n/t.pipe';
import {
  TezaurService,
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

@Component({
  selector: 'app-tezaur-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    SzIconComponent,
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
              <span class="v">—</span>
            </div>
            <div class="tez-header__stat">
              <span class="k">// {{ 'tezaur.stats.categories' | t }}</span>
              <span class="v">{{ categories.length }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TOOLBAR -->
      <div class="tez-toolbar crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <label class="tez-search">
          <sz-icon name="search" [size]="16" />
          <input
            type="search"
            [placeholder]="i18n.t('tezaur.search_placeholder')"
            [value]="qText()"
            (input)="onSearchInput($any($event.target).value)"
          />
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
          <sz-icon name="caret-down" [size]="14" class="tez-sort__caret" />
        </div>
        <div class="tez-view" role="group">
          <button class="is-active" type="button">
            {{ 'tezaur.view.grid' | t }}
          </button>
        </div>
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
                <sz-icon name="x" [size]="11" />
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
                      @if (g.thumb) {
                        <img
                          class="tez-card__photo"
                          [src]="tezaur.imageUrl(g.thumb)"
                          [alt]="g.brand + ' ' + g.model"
                          loading="lazy"
                        />
                      } @else {
                        <div class="tez-card__ph">
                          <span class="tez-card__ph-label">{{ g.brand }}</span>
                        </div>
                      }
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
                        {{ g.yearReleased ?? 'tezaur.card.year_unknown' }}
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

      .tez-header {
        position: relative;
        padding: clamp(40px, 6vw, 72px) clamp(20px, 3vw, 36px) clamp(28px, 4vw, 44px);
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        margin: var(--gutter-y) 0 24px;
        display: grid;
        grid-template-columns: 1.6fr 1fr;
        gap: 32px;
        align-items: end;
      }
      .tez-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(70px, 11vw, 160px);
        line-height: 0.85;
        text-transform: uppercase;
        margin: 0;
        padding-top: 0.22em;
        letter-spacing: 0.005em;
      }
      .tez-header__title .dot { color: var(--accent); }
      .tez-header__sub {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin: 0 0 14px;
      }
      .tez-header__sub::before { content: '* '; color: var(--accent); }
      .tez-header__lede {
        color: var(--fg-muted);
        font-size: 15px;
        max-width: 38ch;
        margin: 0 0 18px;
        text-wrap: pretty;
      }
      .tez-header__stats {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0;
        border-top: 1px dashed var(--line);
        padding-top: 16px;
      }
      .tez-header__stat { padding-right: 14px; border-right: 1px dashed var(--line); }
      .tez-header__stat:last-child { border-right: 0; padding-left: 14px; padding-right: 0; }
      .tez-header__stat:nth-child(2) { padding-left: 14px; padding-right: 14px; }
      .tez-header__stat .k {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        display: block;
      }
      .tez-header__stat .v {
        font-family: var(--font-display);
        font-size: 40px;
        font-weight: 600;
        line-height: 1;
        display: block;
        margin-top: 4px;
      }

      .tez-toolbar {
        position: sticky;
        top: 64px;
        z-index: 50;
        background: color-mix(in oklab, var(--bg) 90%, transparent);
        backdrop-filter: blur(10px) saturate(140%);
        -webkit-backdrop-filter: blur(10px) saturate(140%);
        border: var(--grid-line) solid var(--line);
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 0;
      }
      .tez-search {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-right: 1px solid var(--line);
        min-height: 44px;
      }
      .tez-search input {
        flex: 1;
        background: none;
        border: 0;
        outline: 0;
        font-family: var(--font-ui);
        font-size: 15px;
        color: var(--fg);
        padding: 0;
      }
      .tez-search input::placeholder { color: var(--fg-subtle); }
      .tez-search sz-icon { color: var(--fg-muted); }

      .tez-sort, .tez-view {
        display: flex;
        align-items: center;
        border-right: 1px solid var(--line);
        position: relative;
      }
      .tez-view:last-child { border-right: 0; }
      .tez-sort__label {
        padding: 0 14px;
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--fg-muted);
      }
      .tez-sort select {
        background: none;
        border: 0;
        border-left: 1px solid var(--line);
        padding: 14px 32px 14px 14px;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.08em;
        color: var(--fg);
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      .tez-sort select:focus { outline: none; color: var(--accent); }
      .tez-sort__caret {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--fg-muted);
      }
      .tez-view button {
        padding: 14px 16px;
        color: var(--fg-muted);
        border-left: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        min-height: 44px;
      }
      .tez-view button.is-active { color: var(--fg); background: var(--bg-card); }
      .tez-view button:first-child { border-left: 0; }

      .tez-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        padding: 14px 0;
        font-family: var(--font-mono);
        font-size: 11px;
      }
      .tez-chips__label {
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin-right: 6px;
      }
      .tez-chips__label::before { content: '// '; color: var(--accent); }
      .tez-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px 4px 10px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        letter-spacing: 0.06em;
      }
      .tez-chip button {
        width: 16px;
        min-width: 16px;
        height: 16px;
        min-height: 16px;
        display: grid;
        place-items: center;
        color: var(--fg-muted);
        transition: color 0.12s ease;
      }
      .tez-chip button:hover { color: var(--accent); }
      .tez-chip__clear {
        margin-left: auto;
        color: var(--fg-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-size: 10px;
        min-height: auto;
        min-width: auto;
      }
      .tez-chip__clear:hover { color: var(--accent); }

      .tez-main {
        display: grid;
        grid-template-columns: 260px 1fr;
        gap: 32px;
        align-items: start;
        margin-bottom: var(--gutter-y);
      }
      .tez-rail {
        position: sticky;
        top: 128px;
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .tez-rail__sec { border-bottom: 1px solid var(--line); }
      .tez-rail__sec:last-child { border-bottom: 0; }
      .tez-rail__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 14px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg);
      }
      .tez-rail__head::before { content: '// '; color: var(--accent); }
      .tez-rail__head .count { color: var(--fg-muted); font-size: 10px; }
      .tez-rail__body {
        padding: 4px 14px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .tez-check {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 5px 0;
        cursor: pointer;
        font-size: 13px;
        color: var(--fg-muted);
        font-family: var(--font-ui);
        min-height: auto;
      }
      .tez-check:hover { color: var(--fg); }
      .tez-check input { display: none; }
      .tez-check .box {
        width: 14px;
        height: 14px;
        border: 1px solid var(--line-strong);
        display: grid;
        place-items: center;
        flex-shrink: 0;
        transition: border-color 0.12s ease;
      }
      .tez-check .box::after {
        content: '';
        width: 8px;
        height: 8px;
        background: var(--accent);
        opacity: 0;
        transition: opacity 0.12s ease;
      }
      .tez-check input:checked + .box { border-color: var(--accent); }
      .tez-check input:checked + .box::after { opacity: 1; }
      .tez-check input:checked ~ .lbl { color: var(--fg); }
      .tez-check .lbl { flex: 1; }

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

      .tez-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
        border-left: 1px solid var(--line);
        border-top: 1px solid var(--line);
      }
      .tez-card {
        background: var(--bg-card);
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        cursor: pointer;
        transition: background 0.15s ease;
        position: relative;
        min-height: auto;
        min-width: auto;
        align-items: stretch;
        justify-content: flex-start;
      }
      .tez-card:hover { background: var(--bg-card-2); }
      .tez-card:hover .tez-card__model { color: var(--accent); }
      .tez-card__media {
        aspect-ratio: 1;
        background: var(--bg-card-2);
        position: relative;
        overflow: hidden;
        border: 1px solid var(--line);
      }
      .tez-card__photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .tez-card__ph {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background:
          repeating-linear-gradient(135deg,
            color-mix(in oklab, var(--fg) 4%, transparent) 0 8px,
            transparent 8px 16px),
          linear-gradient(180deg, var(--bg-card-2), var(--bg-card));
      }
      .tez-card__ph-label {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
        padding: 4px 8px;
        border: 1px solid var(--line-strong);
        background: var(--bg);
      }
      .tez-card__brand {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg-muted);
      }
      .tez-card__model {
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 600;
        line-height: 0.95;
        text-transform: uppercase;
        letter-spacing: 0.005em;
        padding-top: 0.18em;
        text-wrap: balance;
        transition: color 0.12s ease;
      }
      .tez-card__tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .tez-card__tag {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        padding: 3px 6px;
        border: 1px solid var(--line);
        color: var(--fg-muted);
      }
      .tez-card__foot {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 12px;
        border-top: 1px dashed var(--line);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        color: var(--fg-muted);
      }
      .tez-card__foot b { color: var(--accent); font-weight: 600; }
      .tez-card__year { text-align: right; }

      .tez-pag {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 32px 0 var(--gutter-y);
        padding: 18px 0;
        border-top: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
        text-transform: uppercase;
      }
      .tez-pag__nums { display: flex; gap: 6px; }
      .tez-pag__num {
        width: 34px;
        height: 34px;
        min-width: 34px;
        min-height: 34px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line-strong);
        color: var(--fg);
        transition: background 0.12s, color 0.12s, border-color 0.12s;
        cursor: pointer;
      }
      .tez-pag__num:hover { background: var(--bg-elev); }
      .tez-pag__num.is-active { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
      .tez-pag__num.is-disabled { color: var(--fg-subtle); cursor: not-allowed; opacity: 0.4; }
      .tez-pag__num.is-ellipsis { border: 0; cursor: default; }

      @media (max-width: 1100px) {
        .tez-header { grid-template-columns: 1fr; gap: 18px; }
        .tez-main { grid-template-columns: 1fr; }
        .tez-rail { position: static; }
        .tez-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 720px) {
        .tez-grid { grid-template-columns: repeat(2, 1fr); }
        .tez-toolbar { grid-template-columns: 1fr; }
        .tez-toolbar > * { border-right: 0; border-bottom: 1px solid var(--line); }
        .tez-toolbar > *:last-child { border-bottom: 0; }
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

  // ----- state signals -----
  readonly qText = signal('');
  readonly category = signal<GearCategoryLiteral | null>(null);
  readonly status = signal<'in_production' | 'discontinued' | null>(null);
  readonly sort = signal<NonNullable<TezaurListQuery['sort']>>('popular');
  readonly page = signal(1);

  readonly response = signal<TezaurListResponse | null>(null);
  readonly loading = signal(false);

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
      const stat = params.get('status') as 'in_production' | 'discontinued' | null;
      const so = (params.get('sort') as NonNullable<TezaurListQuery['sort']> | null) ?? 'popular';
      const pg = Number(params.get('page') ?? '1') || 1;

      // Set silently — no extra fetch from each effect.
      this.qText.set(q);
      this.category.set(cat);
      this.status.set(stat);
      this.sort.set(so);
      this.page.set(pg);

      void this.fetch();
    });
  }

  readonly activeChips = computed(() => {
    const chips: { key: string; label: string }[] = [];
    if (this.qText()) chips.push({ key: 'q', label: `"${this.qText()}"` });
    const cat = this.category();
    if (cat) chips.push({ key: 'category', label: this.categoryLabel(cat) });
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

  clearChip(key: string): void {
    if (key === 'q') this.qText.set('');
    if (key === 'category') this.category.set(null);
    if (key === 'status') this.status.set(null);
    this.page.set(1);
    this.syncUrl();
  }

  clearAll(): void {
    this.qText.set('');
    this.category.set(null);
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
