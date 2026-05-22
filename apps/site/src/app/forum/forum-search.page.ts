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
import { I18nService } from '../i18n/i18n.service';
import { EmptyStateComponent } from '../ui/empty-state.component';
import { TPipe } from '../i18n/t.pipe';
import {
  ForumCategory,
  ForumSearchResponse,
  ForumService,
} from './forum.service';

const SORT_OPTIONS = ['relevance', 'newest', 'most_replies'] as const;
type Sort = (typeof SORT_OPTIONS)[number];

@Component({
  selector: 'app-forum-search-page',
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
      <!-- BREADCRUMB -->
      <nav class="td-crumb" aria-label="Breadcrumb">
        <a routerLink="/forum" class="td-crumb__back">
          <svg width="14" height="14" aria-hidden="true"><use href="#i-back"/></svg>
          {{ 'forum.crumb_root' | t }}
        </a>
        <span class="sep">/</span>
        <span class="cur">{{ 'forum.search.title' | t }}</span>
      </nav>

      <!-- STICKY SEARCH BAR -->
      <form
        class="fs-bar"
        (submit)="$event.preventDefault(); submit()"
      >
        <div class="fs-bar__ico">
          <svg aria-hidden="true"><use href="#i-search"/></svg>
        </div>
        <input
          class="fs-bar__input"
          type="search"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
          name="q"
          [placeholder]="i18n.t('forum.search.query_placeholder')"
          (keydown.enter)="$event.preventDefault(); submit()"
        />
        @if (q()) {
          <button
            type="button"
            class="fs-bar__clear"
            (click)="q.set(''); submit()"
          >
            {{ 'forum.search.clear' | t }}
          </button>
        }
      </form>

      <!-- SUMMARY + SORT -->
      @if (response(); as r) {
        <div class="fs-summary">
          <span>
            <span class="num"><span class="acc">{{ r.totalCount }}</span></span>
            {{ 'forum.search.results_for' | t: { q: (q() || '—') } }}
          </span>
          <div class="sort">
            <a
              [class.is-active]="sort() === 'relevance'"
              (click)="setSort('relevance'); $event.preventDefault()"
              href="#"
            >{{ 'forum.search.sort_relevance' | t }}</a>
            <a
              [class.is-active]="sort() === 'newest'"
              (click)="setSort('newest'); $event.preventDefault()"
              href="#"
            >{{ 'forum.search.sort_newest' | t }}</a>
            <a
              [class.is-active]="sort() === 'most_replies'"
              (click)="setSort('most_replies'); $event.preventDefault()"
              href="#"
            >{{ 'forum.search.sort_most_replies' | t }}</a>
          </div>
        </div>
      }

      <!-- ACTIVE FILTER CHIPS -->
      @if (hasActiveFilters()) {
        <div class="fs-filters">
          <span class="lbl">{{ 'forum.search.active_filters' | t }}</span>

          @for (slug of selectedCats(); track slug) {
            <button
              type="button"
              class="fs-chip is-on"
              (click)="toggleCat(slug)"
            >
              {{ categoryName(slug) }}
              <span class="x">×</span>
            </button>
          }

          @if (author()) {
            <button
              type="button"
              class="fs-chip is-on"
              (click)="clearAuthor()"
            >
              &#64;{{ author() }}
              <span class="x">×</span>
            </button>
          }

          @if (from() || to()) {
            <button
              type="button"
              class="fs-chip is-on"
              (click)="clearDates()"
            >
              {{ dateRangeLabel() }}
              <span class="x">×</span>
            </button>
          }

          <button
            type="button"
            class="fs-chip-clear"
            (click)="clearAll()"
          >
            {{ 'forum.search.clear_all' | t }}
          </button>
        </div>
      }

      <div class="fs-main">

        <!-- RESULTS -->
        <div class="fs-results">
          @if (response(); as r) {
            @if (r.items.length === 0) {
              <app-empty-state
                icon="🔍"
                [title]="i18n.t('forum.search.no_results_title')"
                [lede]="i18n.t('forum.search.no_results_lede')"
                [ctaLabel]="i18n.t('forum.search.reset')"
                ctaRouterLink="/forum/cautare"
              />
            } @else {
              @for (hit of r.items; track hit.threadId; let i = $index) {
                <a
                  class="fs-result"
                  [routerLink]="['/forum', hit.categorySlug, hit.threadSlug]"
                >
                  <span class="fs-result__cat-num">{{ formatIndex(i, r.page, r.pageSize) }}</span>
                  <div class="fs-result__body">
                    <div class="fs-result__crumb">
                      <span class="cat">{{ hit.categoryName }}</span>
                      @for (tag of hit.tags.slice(0, 2); track tag) {
                        <span class="sep">/</span>
                        <span>{{ tag }}</span>
                      }
                    </div>
                    <h3 class="fs-result__title" [innerHTML]="hit.threadTitle"></h3>
                    @if (hit.snippet) {
                      <p
                        class="fs-result__snippet"
                        [innerHTML]="hit.snippet"
                      ></p>
                    }
                    <div class="fs-result__foot">
                      <span
                        class="avatar"
                        [style.background]="avatarBg(hit.authorUsername)"
                      >{{ initialsFor(hit.authorUsername) }}</span>
                      <span>
                        &#64;{{ hit.authorUsername ?? ('forum.deleted_user' | t) }}
                      </span>
                      <span>·</span>
                      <span>{{ relativeTime(hit.lastPostAt ?? hit.createdAt) }}</span>
                      <span>·</span>
                      <span class="replies">
                        {{ hit.postCount }} {{ 'forum.search.replies_short' | t }}
                      </span>
                    </div>
                  </div>
                  <div class="fs-result__stats">
                    <span class="rep">
                      {{ hit.postCount }}<small>{{ 'forum.replies_label' | t }}</small>
                    </span>
                  </div>
                </a>
              }
            }
          } @else if (loading()) {
            <p class="fs-empty">{{ 'app.loading' | t }}</p>
          } @else if (error()) {
            <p class="fs-empty">{{ 'forum.load_error' | t }}</p>
          }
        </div>

        <!-- FACETS SIDEBAR -->
        <aside class="fs-facets">

          <div class="fs-facets__block">
            <header class="fs-facets__head">
              {{ 'forum.search.facet_category' | t }}
            </header>
            <div class="fs-facets__body">
              @for (c of allCategories(); track c.id) {
                <a
                  class="fs-facets__row"
                  [class.is-on]="selectedCats().has(c.slug)"
                  (click)="toggleCat(c.slug); $event.preventDefault()"
                  href="#"
                >
                  {{ c.name }}
                </a>
              }
            </div>
          </div>

          <div class="fs-facets__block">
            <header class="fs-facets__head">
              {{ 'forum.search.facet_author' | t }}
            </header>
            <div class="fs-facets__body">
              <input
                class="fs-facets__author-input"
                type="text"
                [ngModel]="author()"
                (ngModelChange)="author.set($event)"
                [placeholder]="i18n.t('forum.search.facet_author_placeholder')"
                (keydown.enter)="$event.preventDefault(); submit()"
              />
            </div>
          </div>

          <div class="fs-facets__block">
            <header class="fs-facets__head">
              {{ 'forum.search.facet_date' | t }}
            </header>
            <div class="fs-facets__date">
              <input
                type="date"
                [ngModel]="from()"
                (ngModelChange)="from.set($event); submit()"
                [attr.aria-label]="'forum.search.from_label' | t"
              />
              <input
                type="date"
                [ngModel]="to()"
                (ngModelChange)="to.set($event); submit()"
                [attr.aria-label]="'forum.search.to_label' | t"
              />
            </div>
          </div>

        </aside>
      </div>

      <!-- PAGINATION -->
      @if (response(); as r) {
        @if (r.totalPages > 1) {
          <nav class="fr-pag" aria-label="Pagini">
            <span>
              {{
                'forum.search.pagination_summary' | t: {
                  page: r.page,
                  total: r.totalPages,
                  count: r.totalCount
                }
              }}
            </span>
            <div class="fr-pag__nums">
              <button
                type="button"
                class="fr-pag__num"
                [class.is-disabled]="r.page === 1"
                [disabled]="r.page === 1"
                (click)="goToPage(r.page - 1)"
              >‹</button>
              @for (p of paginationPages(); track p) {
                @if (p === '…') {
                  <span class="fr-pag__num is-ellipsis">…</span>
                } @else {
                  <button
                    type="button"
                    class="fr-pag__num"
                    [class.is-active]="p === r.page"
                    (click)="goToPage($any(p))"
                  >{{ p }}</button>
                }
              }
              <button
                type="button"
                class="fr-pag__num"
                [class.is-disabled]="r.page === r.totalPages"
                [disabled]="r.page === r.totalPages"
                (click)="goToPage(r.page + 1)"
              >›</button>
            </div>
          </nav>
        }
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      /* Layout from global v05-forum.css (.fs-bar / .fs-summary /
         .fs-filters / .fs-main / .fs-results / .fs-facets / .fs-result /
         .fs-chip / .fr-pag). Page-local rules below cover empty/error
         states, the author facet input, and small tweaks. */

      .fs-empty {
        padding: 40px 0;
        text-align: center;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .fs-facets__author-input {
        width: 100%;
        font-family: inherit;
        font-size: 13px;
        padding: 8px 10px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
      }
      .fs-facets__author-input:focus {
        outline: none;
        border-color: var(--accent);
      }

      .fs-summary .sort a {
        cursor: pointer;
      }
      .fs-summary .sort a.is-active {
        color: var(--accent);
      }

      /* Highlight tsquery <mark> from ts_headline */
      :host ::ng-deep .fs-result__snippet mark,
      :host ::ng-deep .fs-result__title mark {
        background: color-mix(in oklab, var(--accent) 30%, transparent);
        color: inherit;
        padding: 0 2px;
      }
    `,
  ],
})
export class ForumSearchPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sortOptions = SORT_OPTIONS;

  readonly q = signal('');
  readonly author = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly sort = signal<Sort>('relevance');
  readonly selectedCats = signal<Set<string>>(new Set());
  readonly page = signal(1);

  readonly allCategories = signal<ForumCategory[]>([]);
  readonly response = signal<ForumSearchResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);

  readonly hasActiveFilters = computed(() =>
    this.selectedCats().size > 0 || !!this.author() || !!this.from() || !!this.to(),
  );

  setSort(s: Sort): void {
    this.sort.set(s);
    this.page.set(1);
    void this.syncUrl();
  }

  clearAuthor(): void {
    this.author.set('');
    this.page.set(1);
    void this.syncUrl();
  }

  clearDates(): void {
    this.from.set('');
    this.to.set('');
    this.page.set(1);
    void this.syncUrl();
  }

  clearAll(): void {
    this.selectedCats.set(new Set());
    this.author.set('');
    this.from.set('');
    this.to.set('');
    this.page.set(1);
    void this.syncUrl();
  }

  categoryName(slug: string): string {
    return this.allCategories().find((c) => c.slug === slug)?.name ?? slug;
  }

  dateRangeLabel(): string {
    const f = this.from();
    const t = this.to();
    if (f && t) return `${this.formatDateShort(f)} – ${this.formatDateShort(t)}`;
    if (f) return `${this.i18n.t('forum.search.from_label')} ${this.formatDateShort(f)}`;
    if (t) return `${this.i18n.t('forum.search.to_label')} ${this.formatDateShort(t)}`;
    return '';
  }

  private formatDateShort(iso: string): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
    });
  }

  /** Returns the 2-digit row number for `.fs-result__cat-num` (01, 02, …)
   *  taking pagination into account so page 2's first result is "26"
   *  (assuming page size 25). */
  formatIndex(i: number, page: number, pageSize: number): string {
    const n = (page - 1) * pageSize + i + 1;
    return String(n).padStart(2, '0');
  }

  /** Hash username → hue for the avatar tint. Same routine as
   *  `forum-thread.page.ts` and `forum-category.page.ts`. */
  private hashHue(input: string | null | undefined): number {
    if (!input) return 0;
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return Math.abs(h) % 360;
  }

  avatarBg(username: string | null | undefined): string | null {
    if (!username) return null;
    return `oklch(0.55 0.12 ${this.hashHue(username)})`;
  }

  initialsFor(username: string | null): string {
    if (!username) return '··';
    return username.slice(0, 2).toUpperCase();
  }

  relativeTime(iso: string): string {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const sec = Math.round(diff / 1000);
    const min = Math.round(sec / 60);
    const hr = Math.round(min / 60);
    const day = Math.round(hr / 24);
    if (sec < 60) return this.i18n.t('forum.time.now');
    if (min < 60) return this.i18n.t('forum.time.minutes', { n: min });
    if (hr < 24) return this.i18n.t('forum.time.hours', { n: hr });
    if (day < 30) return this.i18n.t('forum.time.days', { n: day });
    return date.toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  constructor() {
    void this.loadCategories();
    this.route.queryParamMap.subscribe((p) => {
      this.q.set(p.get('q') ?? '');
      this.author.set(p.get('author') ?? '');
      this.from.set(p.get('from') ?? '');
      this.to.set(p.get('to') ?? '');
      this.sort.set(
        ((p.get('sort') as Sort) && SORT_OPTIONS.includes(p.get('sort') as Sort)
          ? (p.get('sort') as Sort)
          : 'relevance') as Sort,
      );
      const cats = (p.get('categories') ?? '').split(',').filter(Boolean);
      this.selectedCats.set(new Set(cats));
      this.page.set(Number(p.get('page') ?? '1') || 1);
      void this.fetch();
    });
  }

  toggleCat(slug: string): void {
    const next = new Set(this.selectedCats());
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    this.selectedCats.set(next);
    this.page.set(1);
    void this.syncUrl();
  }

  clearCats(): void {
    this.selectedCats.set(new Set());
    this.page.set(1);
    void this.syncUrl();
  }

  submit(): void {
    this.page.set(1);
    void this.syncUrl();
  }

  goToPage(n: number): void {
    const total = this.response()?.totalPages ?? 1;
    if (n < 1 || n > total) return;
    this.page.set(n);
    void this.syncUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private async syncUrl(): Promise<void> {
    const cats = [...this.selectedCats()];
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q() || null,
        author: this.author() || null,
        from: this.from() || null,
        to: this.to() || null,
        sort: this.sort() === 'relevance' ? null : this.sort(),
        categories: cats.length > 0 ? cats.join(',') : null,
        page: this.page() === 1 ? null : this.page(),
      },
      queryParamsHandling: 'merge',
    });
  }

  private async loadCategories(): Promise<void> {
    try {
      const cats = await this.forum.listCategories();
      this.allCategories.set(cats.filter((c) => c.kind === 'user'));
    } catch (err) {
      console.warn('[forum-search] categories load failed', err);
    }
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const cats = [...this.selectedCats()];
      const res = await this.forum.searchThreads({
        q: this.q() || undefined,
        author: this.author() || undefined,
        from: this.from() || undefined,
        to: this.to() || undefined,
        sort: this.sort(),
        categories: cats.length > 0 ? cats : undefined,
        page: this.page(),
      });
      this.response.set(res);
    } catch {
      this.error.set(true);
      this.response.set(null);
    } finally {
      this.loading.set(false);
    }
  }

}
