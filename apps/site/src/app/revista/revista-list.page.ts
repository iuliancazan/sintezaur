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
import { SzIconComponent } from '@sintezaur/ui';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  ARTICLE_CATEGORIES,
  RevistaService,
  type ArticleCategoryLiteral,
  type ArticleListResponse,
} from './revista.service';

const SORT_OPTIONS = ['newest', 'oldest', 'most_viewed'] as const;
const PAGE_SIZE = 12;

@Component({
  selector: 'app-revista-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, SzIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- HEADER -->
      <section class="rv-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="rv-header__sub">{{ 'revista.page_eyebrow' | t }}</p>
          <h1 class="rv-header__title">
            {{ 'revista.page_title' | t }}<span class="dot">.</span>
          </h1>
        </div>
        <div>
          <p class="rv-header__lede">{{ 'revista.page_lede' | t }}</p>
          @if (canEdit()) {
            <a class="rv-header__cta" routerLink="/revista/nou">
              + {{ 'revista.new_article' | t }}
            </a>
          }
        </div>
      </section>

      <!-- TOOLBAR -->
      <div class="rv-toolbar crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <label class="rv-search">
          <sz-icon name="search" [size]="16" />
          <input
            type="search"
            [placeholder]="i18n.t('revista.search_placeholder')"
            [value]="qText()"
            (input)="onSearchInput($any($event.target).value)"
          />
        </label>
        <div class="rv-sort">
          <span class="rv-sort__label">// {{ 'revista.sort.label' | t }}</span>
          <select
            [value]="sort()"
            (change)="setSort($any($event.target).value)"
          >
            @for (s of sortOptions; track s) {
              <option [value]="s">{{ 'revista.sort.' + s | t }}</option>
            }
          </select>
          <sz-icon name="caret-down" [size]="14" class="rv-sort__caret" />
        </div>
      </div>

      <!-- CATEGORY CHIPS -->
      <nav class="rv-cats">
        <button
          type="button"
          class="rv-cat"
          [class.is-active]="category() === null"
          (click)="setCategory(null)"
        >
          {{ 'revista.cat.all' | t }}
        </button>
        @for (cat of categories; track cat) {
          <button
            type="button"
            class="rv-cat"
            [class.is-active]="category() === cat"
            (click)="setCategory(cat)"
          >
            {{ 'revista.cat.' + cat | t }}
          </button>
        }
      </nav>

      <!-- GRID -->
      @if (response(); as r) {
        <div class="rv-results">
          <span>
            <span class="accent">// </span>
            {{
              'revista.results_count' | t: { shown: r.items.length, total: r.totalCount }
            }}
          </span>
          @if (r.totalPages > 1) {
            <span>
              {{
                'revista.pagination.page_of' | t: { page: r.page, total: r.totalPages }
              }}
            </span>
          }
        </div>

        @if (r.items.length === 0) {
          <p class="rv-empty">{{ 'revista.no_results' | t }}</p>
        } @else {
          <div class="rv-grid">
            @for (a of r.items; track a.id) {
              <a class="rv-card" [routerLink]="['/revista', a.slug]">
                <div class="rv-card__media">
                  @if (a.heroThumb) {
                    <img
                      [src]="revista.imageUrl(a.heroThumb)"
                      [alt]="a.title"
                      loading="lazy"
                    />
                  } @else {
                    <div class="rv-card__ph">·</div>
                  }
                  <span class="rv-card__cat">{{ 'revista.cat.' + a.category | t }}</span>
                </div>
                <div class="rv-card__body">
                  <h2>{{ a.title }}</h2>
                  @if (a.excerpt) {
                    <p>{{ a.excerpt }}</p>
                  }
                  <div class="rv-card__meta">
                    <span class="rv-card__author">
                      &#64;{{ a.author.username }}
                    </span>
                    @if (a.publishedAt) {
                      <span class="sep">·</span>
                      <time>{{ formatDate(a.publishedAt) }}</time>
                    }
                    <span class="sep">·</span>
                    <span>{{ a.viewCount }} {{ 'revista.views' | t }}</span>
                  </div>
                </div>
              </a>
            }
          </div>
        }

        <!-- PAGINATION -->
        @if (r.totalPages > 1) {
          <nav class="rv-pag">
            <button
              type="button"
              [disabled]="r.page === 1"
              (click)="goToPage(r.page - 1)"
            >‹</button>
            @for (p of paginationPages(); track p) {
              @if (p === '…') {
                <span class="is-ellipsis">…</span>
              } @else {
                <button
                  type="button"
                  [class.is-active]="p === r.page"
                  (click)="goToPage($any(p))"
                >{{ p }}</button>
              }
            }
            <button
              type="button"
              [disabled]="r.page === r.totalPages"
              (click)="goToPage(r.page + 1)"
            >›</button>
          </nav>
        }
      } @else if (loading()) {
        <p class="rv-empty">{{ 'app.loading' | t }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .rv-header {
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
      .rv-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(70px, 11vw, 160px);
        line-height: 0.85;
        text-transform: uppercase;
        margin: 0;
        padding-top: 0.22em;
        letter-spacing: 0.005em;
      }
      .rv-header__title .dot { color: var(--accent); }
      .rv-header__sub {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin: 0 0 14px;
      }
      .rv-header__sub::before { content: '* '; color: var(--accent); }
      .rv-header__lede {
        color: var(--fg-muted);
        font-size: 15px;
        max-width: 42ch;
        margin: 0 0 18px;
        text-wrap: pretty;
      }
      .rv-header__cta {
        display: inline-block;
        padding: 12px 18px;
        background: var(--accent);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-decoration: none;
      }

      .rv-toolbar {
        position: sticky;
        top: 64px;
        z-index: 50;
        background: color-mix(in oklab, var(--bg) 90%, transparent);
        backdrop-filter: blur(10px) saturate(140%);
        -webkit-backdrop-filter: blur(10px) saturate(140%);
        border: var(--grid-line) solid var(--line);
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0;
      }
      .rv-search {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-right: 1px solid var(--line);
        min-height: 44px;
      }
      .rv-search input {
        flex: 1;
        background: none;
        border: 0;
        outline: 0;
        font-family: var(--font-ui);
        font-size: 15px;
        color: var(--fg);
      }
      .rv-search sz-icon { color: var(--fg-muted); }

      .rv-sort {
        display: flex;
        align-items: center;
        position: relative;
      }
      .rv-sort__label {
        padding: 0 14px;
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--fg-muted);
      }
      .rv-sort select {
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
      .rv-sort select:focus { outline: none; color: var(--accent); }
      .rv-sort__caret {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--fg-muted);
      }

      .rv-cats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding: 16px 0;
      }
      .rv-cat {
        padding: 8px 14px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-muted);
        cursor: pointer;
      }
      .rv-cat:hover { color: var(--fg); border-color: var(--line-strong); }
      .rv-cat.is-active {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
      }

      .rv-results {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        margin: 8px 0 12px;
      }
      .rv-results .accent { color: var(--accent); }
      .rv-empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        border: 1px dashed var(--line);
      }

      .rv-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
        margin-bottom: var(--gutter-y);
      }
      .rv-card {
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: var(--fg);
        background: var(--bg-elev);
        border: 1px solid var(--line);
        transition: border-color 0.15s ease;
      }
      .rv-card:hover { border-color: var(--accent); }
      .rv-card__media {
        position: relative;
        aspect-ratio: 16 / 9;
        background: var(--bg);
        overflow: hidden;
      }
      .rv-card__media img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .rv-card__ph {
        display: grid;
        place-items: center;
        height: 100%;
        color: var(--fg-subtle);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .rv-card__cat {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 4px 8px;
        background: color-mix(in oklab, var(--bg) 88%, transparent);
        border: 1px solid var(--accent);
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .rv-card__body { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
      .rv-card__body h2 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 18px;
        line-height: 1.2;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .rv-card__body p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--fg-muted);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .rv-card__meta {
        display: inline-flex;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
        margin-top: auto;
        flex-wrap: wrap;
      }
      .rv-card__author { color: var(--accent); }
      .rv-card__meta .sep { color: var(--fg-subtle); }

      .rv-pag {
        display: inline-flex;
        gap: 4px;
        margin: 20px auto 60px;
        justify-content: center;
        width: 100%;
      }
      .rv-pag button,
      .rv-pag .is-ellipsis {
        min-width: 32px;
        min-height: 32px;
        padding: 0 8px;
        display: inline-grid;
        place-items: center;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
      }
      .rv-pag button:hover:not(:disabled) {
        color: var(--fg);
        border-color: var(--line-strong);
      }
      .rv-pag button.is-active {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
      }
      .rv-pag button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .rv-pag .is-ellipsis { border: 0; background: transparent; cursor: default; }

      @media (max-width: 1100px) {
        .rv-header { grid-template-columns: 1fr; gap: 18px; }
        .rv-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 720px) {
        .rv-grid { grid-template-columns: 1fr; }
        .rv-toolbar { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class RevistaListPage {
  readonly i18n = inject(I18nService);
  readonly revista = inject(RevistaService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = ARTICLE_CATEGORIES;
  readonly sortOptions = SORT_OPTIONS;

  readonly qText = signal('');
  readonly category = signal<ArticleCategoryLiteral | null>(null);
  readonly sort = signal<(typeof SORT_OPTIONS)[number]>('newest');
  readonly page = signal(1);

  readonly response = signal<ArticleListResponse | null>(null);
  readonly loading = signal(false);

  readonly canEdit = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return false;
    return u.roles.some(
      (r) => r === 'editor' || r === 'admin' || r === 'superadmin',
    );
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

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.qText.set(params.get('q') ?? '');
      this.category.set(
        (params.get('category') as ArticleCategoryLiteral | null) ?? null,
      );
      this.sort.set(
        (params.get('sort') as (typeof SORT_OPTIONS)[number] | null) ??
          'newest',
      );
      this.page.set(Number(params.get('page') ?? '1') || 1);
      void this.fetch();
    });
  }

  onSearchInput(value: string): void {
    this.qText.set(value);
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      this.syncUrl();
    }, 300);
  }

  setSort(s: string): void {
    this.sort.set(s as (typeof SORT_OPTIONS)[number]);
    this.page.set(1);
    this.syncUrl();
  }

  setCategory(c: ArticleCategoryLiteral | null): void {
    this.category.set(c);
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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.qText() || null,
        category: this.category() || null,
        sort: this.sort() === 'newest' ? null : this.sort(),
        page: this.page() === 1 ? null : this.page(),
      },
      queryParamsHandling: 'merge',
    });
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.revista.list({
        q: this.qText() || undefined,
        category: this.category() ?? undefined,
        sort: this.sort(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      });
      this.response.set(res);
    } catch (err) {
      console.error('[revista] list failed', err);
      this.response.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
