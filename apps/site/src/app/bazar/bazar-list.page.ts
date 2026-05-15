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
import { SzIconComponent } from '@sintezaur/ui';
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
    SzIconComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- HEADER -->
      <section class="bz-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="bz-header__sub">{{ 'bazar.page_eyebrow' | t }}</p>
          <h1 class="bz-header__title">
            {{ 'bazar.page_title' | t }}<span class="dot">.</span>
          </h1>
        </div>
        <div>
          <p class="bz-header__lede">{{ 'bazar.page_lede' | t }}</p>
          <div class="bz-header__stats">
            <div class="bz-header__stat">
              <span class="k">// {{ 'bazar.stats.listings' | t }}</span>
              <span class="v">{{ response()?.totalCount ?? '—' }}</span>
            </div>
            <div class="bz-header__stat">
              <span class="k">// {{ 'bazar.stats.categories' | t }}</span>
              <span class="v">{{ categories.length }}</span>
            </div>
            <div class="bz-header__stat">
              <span class="k">// {{ 'bazar.stats.cities' | t }}</span>
              <span class="v">RO</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TOOLBAR -->
      <div class="bz-toolbar crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <label class="bz-search">
          <sz-icon name="search" [size]="16" />
          <input
            type="search"
            [placeholder]="i18n.t('bazar.search_placeholder')"
            [value]="qText()"
            (input)="onSearchInput($any($event.target).value)"
          />
        </label>
        <div class="bz-sort">
          <span class="bz-sort__label">// {{ 'bazar.sort.label' | t }}</span>
          <select
            [value]="sort()"
            (change)="setSort($any($event.target).value)"
            [attr.aria-label]="i18n.t('bazar.sort.label')"
          >
            @for (s of sortOptions; track s) {
              <option [value]="s">{{ 'bazar.sort.' + s | t }}</option>
            }
          </select>
          <sz-icon name="caret-down" [size]="14" class="bz-sort__caret" />
        </div>
        <a class="bz-cta" routerLink="/bazar/nou">
          + {{ 'bazar.list_new' | t }}
        </a>
      </div>

      <!-- ACTIVE FILTER CHIPS -->
      @if (activeChips().length) {
        <div class="bz-chips">
          <span class="bz-chips__label">{{ 'bazar.filters.active_label' | t }}</span>
          @for (chip of activeChips(); track chip.key) {
            <span class="bz-chip">
              {{ chip.label }}
              <button
                type="button"
                [attr.aria-label]="i18n.t('bazar.filters.clear_all')"
                (click)="clearChip(chip.key, chip.value)"
              >
                <sz-icon name="x" [size]="11" />
              </button>
            </span>
          }
          <button class="bz-chip__clear" type="button" (click)="clearAll()">
            {{ 'bazar.filters.clear_all' | t }}
          </button>
          @if (auth.isLoggedIn()) {
            <button
              type="button"
              class="bz-chip__save"
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

      <!-- MAIN: rail + grid -->
      <div class="bz-main">
        <!-- ============ FILTER RAIL ============ -->
        <aside class="bz-rail" [attr.aria-label]="i18n.t('bazar.filters.heading')">
          <section class="bz-rail__sec">
            <header class="bz-rail__head">
              {{ 'bazar.filters.condition' | t }}
              <span class="count">{{ conditions.length }}</span>
            </header>
            <div class="bz-rail__body">
              @for (c of conditions; track c) {
                <label class="bz-check">
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

          <section class="bz-rail__sec">
            <header class="bz-rail__head">
              {{ 'bazar.filters.kind' | t }}
              <span class="count">{{ kinds.length }}</span>
            </header>
            <div class="bz-rail__body">
              @for (k of kinds; track k) {
                <label class="bz-check">
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

          <section class="bz-rail__sec">
            <header class="bz-rail__head">
              {{ 'bazar.filters.delivery' | t }}
              <span class="count">{{ deliveries.length }}</span>
            </header>
            <div class="bz-rail__body">
              @for (d of deliveries; track d) {
                <label class="bz-check">
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

          <section class="bz-rail__sec">
            <header class="bz-rail__head">
              {{ 'bazar.filters.price' | t }}
            </header>
            <div class="bz-rail__body bz-rail__price">
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

          <section class="bz-rail__sec">
            <header class="bz-rail__head">
              {{ 'bazar.filters.location' | t }}
            </header>
            <div class="bz-rail__body">
              <input
                class="bz-text-input"
                type="text"
                [value]="location()"
                (input)="onLocationInput($any($event.target).value)"
                [placeholder]="i18n.t('bazar.filters.location_placeholder')"
              />
            </div>
          </section>

          <section class="bz-rail__sec">
            <header class="bz-rail__head">
              {{ 'bazar.filters.category' | t }}
              <span class="count">{{ categories.length }}</span>
            </header>
            <div class="bz-rail__body">
              @for (cat of categories; track cat) {
                <label class="bz-check">
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

        <!-- ============ LISTING GRID ============ -->
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
              <div class="bz-grid crosses">
                <span class="crosses-tl"></span><span class="crosses-tr"></span>
                @for (l of r.items; track l.id) {
                  <a class="bz-card" [routerLink]="['/bazar', l.slug]">
                    <div class="bz-card__media">
                      @if (l.thumb) {
                        <img
                          class="bz-card__photo"
                          [src]="bazar.imageUrl(l.thumb)"
                          [alt]="l.title"
                          loading="lazy"
                        />
                      } @else {
                        <div class="bz-card__ph">
                          <span class="bz-card__ph-label">{{ l.brand ?? l.title }}</span>
                        </div>
                      }
                      <div class="bz-card__badges">
                        @if (l.kind !== 'sell') {
                          <span class="bz-badge is-trade">{{ 'bazar.kind.' + l.kind | t }}</span>
                        }
                        @if (l.acceptsOffers) {
                          <span class="bz-badge">{{ 'bazar.card.accepts_offers' | t }}</span>
                        }
                      </div>
                    </div>
                    <div class="bz-card__top">
                      @if (l.brand) {
                        <span class="bz-card__brand">// {{ l.brand }}</span>
                      }
                      <span class="bz-card__cond">{{ 'bazar.condition.' + l.condition | t }}</span>
                    </div>
                    <div class="bz-card__title">{{ l.title }}</div>
                    <div class="bz-card__price">
                      {{ formatPrice(l.price, l.currency) }}
                    </div>
                    <div class="bz-card__foot">
                      <span class="bz-card__loc">
                        <sz-icon name="pin" [size]="12" />
                        {{ l.location }}
                      </span>
                      <span class="bz-card__seller">
                        &#64;{{ l.seller.username }}
                        @if (l.seller.avgRating) {
                          <span class="bz-card__rating">★ {{ l.seller.avgRating }}</span>
                        }
                      </span>
                    </div>
                  </a>
                }
              </div>
            }

            @if (r.totalPages > 1) {
              <nav class="bz-pag" [attr.aria-label]="i18n.t('bazar.filters.active_label')">
                <span>
                  {{ 'bazar.pagination.show_count' | t: { shown: r.items.length, total: r.totalCount } }}
                </span>
                <div class="bz-pag__nums">
                  <button
                    type="button"
                    class="bz-pag__num"
                    [class.is-disabled]="r.page === 1"
                    [disabled]="r.page === 1"
                    (click)="goToPage(r.page - 1)"
                    aria-label="Previous page"
                  >‹</button>
                  @for (p of paginationPages(); track p) {
                    @if (p === '…') {
                      <span class="bz-pag__num is-ellipsis">…</span>
                    } @else {
                      <button
                        type="button"
                        class="bz-pag__num"
                        [class.is-active]="p === r.page"
                        (click)="goToPage($any(p))"
                      >{{ p }}</button>
                    }
                  }
                  <button
                    type="button"
                    class="bz-pag__num"
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

      .bz-header {
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
      .bz-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(70px, 11vw, 160px);
        line-height: 0.85;
        text-transform: uppercase;
        margin: 0;
        padding-top: 0.22em;
        letter-spacing: 0.005em;
      }
      .bz-header__title .dot { color: var(--accent); }
      .bz-header__sub {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin: 0 0 14px;
      }
      .bz-header__sub::before { content: '* '; color: var(--accent); }
      .bz-header__lede {
        color: var(--fg-muted);
        font-size: 15px;
        max-width: 38ch;
        margin: 0 0 18px;
        text-wrap: pretty;
      }
      .bz-header__stats {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0;
        border-top: 1px dashed var(--line);
        padding-top: 16px;
      }
      .bz-header__stat { padding-right: 14px; border-right: 1px dashed var(--line); }
      .bz-header__stat:last-child { border-right: 0; padding-left: 14px; padding-right: 0; }
      .bz-header__stat:nth-child(2) { padding-left: 14px; padding-right: 14px; }
      .bz-header__stat .k {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        display: block;
      }
      .bz-header__stat .v {
        font-family: var(--font-display);
        font-size: 40px;
        font-weight: 600;
        line-height: 1;
        display: block;
        margin-top: 4px;
      }

      .bz-toolbar {
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
      .bz-search {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-right: 1px solid var(--line);
        min-height: 44px;
      }
      .bz-search input {
        flex: 1;
        background: none;
        border: 0;
        outline: 0;
        font-family: var(--font-ui);
        font-size: 15px;
        color: var(--fg);
        padding: 0;
      }
      .bz-search input::placeholder { color: var(--fg-subtle); }
      .bz-search sz-icon { color: var(--fg-muted); }

      .bz-sort {
        display: flex;
        align-items: center;
        border-right: 1px solid var(--line);
        position: relative;
      }
      .bz-sort__label {
        padding: 0 14px;
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--fg-muted);
      }
      .bz-sort select {
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
      .bz-sort select:focus { outline: none; color: var(--accent); }
      .bz-sort__caret {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--fg-muted);
      }
      .bz-cta {
        padding: 14px 22px;
        background: var(--accent);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        text-decoration: none;
      }
      .bz-cta:hover { filter: brightness(1.08); }

      .bz-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        padding: 14px 0;
        font-family: var(--font-mono);
        font-size: 11px;
      }
      .bz-chips__label {
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin-right: 6px;
      }
      .bz-chips__label::before { content: '// '; color: var(--accent); }
      .bz-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px 4px 10px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        letter-spacing: 0.06em;
      }
      .bz-chip button {
        width: 16px;
        min-width: 16px;
        height: 16px;
        min-height: 16px;
        display: grid;
        place-items: center;
        color: var(--fg-muted);
        transition: color 0.12s ease;
      }
      .bz-chip button:hover { color: var(--accent); }
      .bz-chip__clear {
        margin-left: auto;
        color: var(--fg-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-size: 10px;
        min-height: auto;
        min-width: auto;
      }
      .bz-chip__clear:hover { color: var(--accent); }
      .bz-chip__save {
        color: var(--accent);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-size: 10px;
        min-height: auto;
        background: none;
        border: 0;
        cursor: pointer;
        padding: 0 8px;
      }
      .bz-chip__save:hover { text-decoration: underline; }
      .bz-chip__save:disabled { opacity: 0.5; cursor: wait; }

      .bz-main {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 32px;
        align-items: start;
        margin-bottom: var(--gutter-y);
      }
      .bz-rail {
        position: sticky;
        top: 128px;
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .bz-rail__sec { border-bottom: 1px solid var(--line); }
      .bz-rail__sec:last-child { border-bottom: 0; }
      .bz-rail__head {
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
      .bz-rail__head::before { content: '// '; color: var(--accent); }
      .bz-rail__head .count { color: var(--fg-muted); font-size: 10px; }
      .bz-rail__body {
        padding: 4px 14px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
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
      .bz-currency {
        display: inline-flex;
        gap: 0;
      }
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
      }
      .bz-currency button + button { border-left: 0; }
      .bz-currency button.is-active {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
      }

      .bz-check {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 5px 0;
        cursor: pointer;
        font-size: 13px;
        color: var(--fg-muted);
        font-family: var(--font-ui);
      }
      .bz-check:hover { color: var(--fg); }
      .bz-check input { display: none; }
      .bz-check .box {
        width: 14px;
        height: 14px;
        border: 1px solid var(--line-strong);
        display: grid;
        place-items: center;
        flex-shrink: 0;
        transition: border-color 0.12s ease;
      }
      .bz-check .box::after {
        content: '';
        width: 8px;
        height: 8px;
        background: var(--accent);
        opacity: 0;
        transition: opacity 0.12s ease;
      }
      .bz-check input:checked + .box { border-color: var(--accent); }
      .bz-check input:checked + .box::after { opacity: 1; }
      .bz-check input:checked ~ .lbl { color: var(--fg); }
      .bz-check .lbl { flex: 1; }

      .bz-results-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        margin-bottom: 14px;
      }
      .bz-results-row .accent { color: var(--accent); }
      .bz-empty {
        padding: 60px 20px;
        text-align: center;
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--fg-muted);
        border: 1px dashed var(--line);
      }

      .bz-grid {
        position: relative;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
        border: var(--grid-line) solid var(--line);
      }
      .bz-card {
        display: flex;
        flex-direction: column;
        padding: 14px;
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        text-decoration: none;
        color: var(--fg);
        background: var(--bg);
        transition: background 0.15s ease;
        gap: 6px;
      }
      .bz-card:hover { background: var(--bg-elev); }
      .bz-card:nth-child(4n) { border-right: 0; }
      .bz-card__media {
        position: relative;
        aspect-ratio: 4 / 3;
        background: var(--bg-elev);
        margin-bottom: 8px;
        overflow: hidden;
      }
      .bz-card__photo { width: 100%; height: 100%; object-fit: cover; display: block; }
      .bz-card__ph {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        color: var(--fg-subtle);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .bz-card__badges {
        position: absolute;
        top: 6px;
        left: 6px;
        display: inline-flex;
        gap: 4px;
      }
      .bz-badge {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 3px 6px;
        background: color-mix(in oklab, var(--bg) 80%, transparent);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        backdrop-filter: blur(4px);
      }
      .bz-badge.is-trade { background: var(--accent); color: var(--bg); border-color: var(--accent); }
      .bz-card__top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .bz-card__brand { color: var(--accent); }
      .bz-card__cond { color: var(--fg-muted); }
      .bz-card__title {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 15px;
        line-height: 1.25;
        margin: 2px 0 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .bz-card__price {
        font-family: var(--font-display);
        font-size: 22px;
        font-weight: 600;
        line-height: 1;
        margin-top: 4px;
        color: var(--fg);
      }
      .bz-card__foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        padding-top: 8px;
        border-top: 1px dashed var(--line);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
      }
      .bz-card__loc {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        text-transform: uppercase;
      }
      .bz-card__seller {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .bz-card__rating { color: var(--accent); }

      .bz-pag {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 22px 0;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .bz-pag__nums { display: inline-flex; gap: 2px; }
      .bz-pag__num {
        min-width: 32px;
        min-height: 32px;
        padding: 0 8px;
        display: inline-grid;
        place-items: center;
        border: 1px solid var(--line);
        background: var(--bg-elev);
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
        transition: color 0.12s ease, border-color 0.12s ease;
      }
      .bz-pag__num:hover { color: var(--fg); border-color: var(--line-strong); }
      .bz-pag__num.is-active {
        color: var(--bg);
        background: var(--accent);
        border-color: var(--accent);
      }
      .bz-pag__num.is-disabled,
      .bz-pag__num:disabled { color: var(--fg-subtle); cursor: not-allowed; opacity: 0.5; }
      .bz-pag__num.is-ellipsis {
        border: 0;
        background: transparent;
        cursor: default;
      }

      @media (max-width: 1240px) {
        .bz-grid { grid-template-columns: repeat(3, 1fr); }
        .bz-card:nth-child(4n) { border-right: 1px solid var(--line); }
        .bz-card:nth-child(3n) { border-right: 0; }
      }
      @media (max-width: 1100px) {
        .bz-header { grid-template-columns: 1fr; gap: 18px; }
        .bz-main { grid-template-columns: 1fr; }
        .bz-rail { position: static; }
      }
      @media (max-width: 720px) {
        .bz-grid { grid-template-columns: repeat(2, 1fr); }
        .bz-card:nth-child(3n) { border-right: 1px solid var(--line); }
        .bz-card:nth-child(2n) { border-right: 0; }
        .bz-toolbar { grid-template-columns: 1fr; }
        .bz-toolbar > * { border-right: 0; border-bottom: 1px solid var(--line); }
        .bz-toolbar > *:last-child { border-bottom: 0; }
      }
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
