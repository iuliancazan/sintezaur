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
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { EmptyStateComponent } from '../ui/empty-state.component';
import { TPipe } from '../i18n/t.pipe';
import {
  ARTICLE_CATEGORIES,
  RevistaService,
  type ArticleCategoryLiteral,
  type ArticleListItem,
  type ArticleListResponse,
} from './revista.service';

const SORT_OPTIONS = ['newest', 'oldest', 'most_viewed'] as const;
const PAGE_SIZE = 12;

/**
 * Revista list — V05 magazine layout (M13-E).
 *
 * Sections:
 *   .rev-header (big title + lede + optional editor CTA) →
 *   .rev-tabs (pillar tabs: all + 6 categories) →
 *   .rev-hero (featured = articles[0] when on "all" view) →
 *   .rev-main { .rev-grid + .rev-side (top-list + newsletter) }
 */
@Component({
  selector: 'app-revista-list-page',
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
      <!-- HEADER (V05: .rev-header) -->
      <section class="rev-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="rev-header__sub">{{ 'revista.page_eyebrow' | t }}</p>
          <h1>{{ 'revista.page_title' | t }}<span class="dot">.</span></h1>
        </div>
        <div>
          <p class="rev-header__lede">{{ 'revista.page_lede' | t }}</p>
          @if (canEdit()) {
            <a class="block__cta" routerLink="/revista/nou" style="margin-top:14px;">
              + {{ 'revista.new_article' | t }}
            </a>
          }
        </div>
      </section>

      <!-- PILLAR TABS (V05: .rev-tabs) -->
      <nav class="rev-tabs" [attr.aria-label]="i18n.t('revista.tabs_aria')">
        <a
          [class.is-active]="category() === null"
          [routerLink]="['/revista']"
          (click)="setCategory(null); $event.preventDefault()"
        >{{ 'revista.cat.all' | t }} <span class="count">{{ response()?.totalCount ?? '—' }}</span></a>
        @for (cat of categories; track cat) {
          <a
            [class.is-active]="category() === cat"
            [routerLink]="['/revista']"
            [queryParams]="{ category: cat }"
            (click)="setCategory(cat); $event.preventDefault()"
          >{{ 'revista.cat.' + cat | t }}</a>
        }
      </nav>

      <!-- FEATURED HERO (V05: .rev-hero) — articles[0] on "all" view -->
      @if (heroArticle(); as h) {
        <a class="rev-hero crosses" [routerLink]="['/revista', h.slug]" style="display:block;color:inherit;text-decoration:none;">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>
          <div class="rev-hero__media">
            <div class="gear-fill">
              @if (h.heroThumb) {
                <img class="gear-fill__photo" [src]="revista.imageUrl(h.heroThumb)" [alt]="h.title" loading="lazy" />
              }
            </div>
            <div class="rev-hero__overlay">
              <div class="rev-hero__meta">
                <span class="pill is-accent">{{ 'revista.featured' | t }}</span>
                <span class="pill" style="background:rgba(255,255,255,0.1); color:#fff; border-color:rgba(255,255,255,0.3)">
                  {{ 'revista.cat.' + h.category | t }}
                </span>
                @if (h.publishedAt) {
                  <span style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7)">
                    {{ formatDate(h.publishedAt) }}
                  </span>
                }
              </div>
              <h2 class="rev-hero__title">{{ h.title }}</h2>
              @if (h.excerpt) {
                <p class="rev-hero__excerpt">{{ h.excerpt }}</p>
              }
              <div class="rev-hero__byline">
                <span class="avatar" style="background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.3);color:#fff">
                  {{ initials(h.author.fullName || h.author.username) }}
                </span>
                <span>{{ h.author.fullName || h.author.username }}</span>
              </div>
            </div>
          </div>
        </a>
      }

      <!-- FOLLOW STRIP (logged-in, on a specific category) -->
      @if (category() !== null && auth.currentUser()) {
        <div class="rev-follow">
          <span class="rev-follow__label">
            <svg width="14" height="14"><use href="#i-bell"/></svg>
            {{ 'revista.follow.prompt' | t: { category: catLabel(category()!) } }}
          </span>
          <button
            type="button"
            class="rev-follow__btn"
            [class.is-on]="isFollowed(category()!)"
            [disabled]="followBusy()"
            (click)="toggleFollow(category()!)"
          >
            @if (isFollowed(category()!)) {
              ★ {{ 'revista.follow.unfollow' | t }}
            } @else {
              ☆ {{ 'revista.follow.follow' | t }}
            }
          </button>
        </div>
      }

      <!-- MAIN: grid + side rail (V05: .rev-main) -->
      <div class="rev-main">
        <div>
          <div class="rev-results-row">
            <span>
              <span class="accent">// </span>
              @if (response(); as r) {
                {{ 'revista.results_count' | t: { shown: r.items.length, total: r.totalCount } }}
              } @else if (loading()) {
                {{ 'app.loading' | t }}
              }
            </span>
            @if (response(); as r) {
              <span>{{ 'revista.pagination.page_of' | t: { page: r.page, total: r.totalPages } }}</span>
            }
          </div>

          @if (response(); as r) {
            @if (r.items.length === 0) {
              <app-empty-state
                icon="📰"
                [title]="'Niciun articol pentru filtrele alese'"
                [lede]="'Revista crește pe măsură ce comunitatea contribuie. Vezi toate articolele publicate sau încearcă altă categorie.'"
                ctaLabel="Toate articolele"
                ctaRouterLink="/revista"
              />
            } @else {
              <div class="rev-grid">
                @for (a of gridArticles(); track a.id; let i = $index) {
                  <a
                    class="rev-card"
                    [class.is-big]="i === 0 && gridArticles().length > 1"
                    [routerLink]="['/revista', a.slug]"
                  >
                    <div class="rev-card__media">
                      <div class="gear-fill" [attr.data-gear]="a.slug">
                        @if (a.heroThumb) {
                          <img class="gear-fill__photo" [src]="revista.imageUrl(a.heroThumb)" [alt]="a.title" loading="lazy" />
                        }
                      </div>
                      @if (isNewArticle(a)) {
                        <span class="rev-card__new">{{ 'revista.new_badge' | t }}</span>
                      }
                    </div>
                    <div class="rev-card__body">
                      <span class="rev-card__pill">// {{ 'revista.cat.' + a.category | t }}</span>
                      <h3 class="rev-card__title">{{ a.title }}</h3>
                      @if (a.excerpt) {
                        <p class="rev-card__excerpt">{{ a.excerpt }}</p>
                      }
                      <div class="rev-card__byline">
                        <span class="avatar" style="width:24px;height:24px;font-size:10px">
                          {{ initials(a.author.fullName || a.author.username) }}
                        </span>
                        <span>{{ a.author.fullName || a.author.username }}</span>
                        @if (a.publishedAt) {
                          <span style="opacity:.5">·</span>
                          <span>{{ formatShortDate(a.publishedAt) }}</span>
                        }
                      </div>
                    </div>
                  </a>
                }
              </div>
            }

            <!-- PAGINATION (.tez-pag from v05.css) -->
            @if (r.totalPages > 1) {
              <nav class="tez-pag" aria-label="Pagination">
                <span>
                  {{ 'revista.pagination.show_count' | t: { shown: r.items.length, total: r.totalCount } }}
                </span>
                <div class="tez-pag__nums">
                  <button
                    type="button"
                    class="tez-pag__num"
                    [class.is-disabled]="r.page === 1"
                    [disabled]="r.page === 1"
                    (click)="goToPage(r.page - 1)"
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
                  >›</button>
                </div>
              </nav>
            }
          }
        </div>

        <!-- Side rail (V05: .rev-side) -->
        <aside class="rev-side">
          @if (sideTopList().length > 0) {
            <div class="rev-side__block">
              <header class="rev-side__head">{{ 'revista.side_top_read' | t }}</header>
              <div class="rev-side__list">
                @for (a of sideTopList(); track a.id; let i = $index) {
                  <a [routerLink]="['/revista', a.slug]">
                    <span class="num">{{ (i + 1).toString().padStart(2, '0') }}</span>
                    <span class="ttl">{{ a.title }}</span>
                  </a>
                }
              </div>
            </div>
          }

          <div class="rev-side__block">
            <header class="rev-side__head">{{ 'revista.side_newsletter_head' | t }}</header>
            <div style="padding:18px;">
              <p style="margin:0 0 14px;font-size:13px;color:var(--fg-muted);">
                {{ 'revista.side_newsletter_body' | t }}
              </p>
              <div style="display:flex;">
                <input
                  type="email"
                  [placeholder]="i18n.t('revista.side_newsletter_placeholder')"
                  style="flex:1;padding:10px 12px;background:var(--bg);border:1px solid var(--line-strong);border-right:0;font-family:var(--font-mono);font-size:13px;color:var(--fg);outline:0;"
                />
                <button
                  type="button"
                  style="padding:10px 14px;background:var(--accent);color:var(--accent-fg);font-family:var(--font-mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;border:0;min-height:auto;"
                >→</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      /* All .rev-* / .tez-pag structural classes are provided by
         v05.css globally. Page-locals below cover only follow strip
         (custom) + results-row counter. */
      .rev-results-row {
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
      .rev-results-row .accent { color: var(--accent); }
      .rev-follow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 18px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        margin-bottom: 24px;
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .rev-follow__label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--fg-muted);
      }
      .rev-follow__btn {
        padding: 6px 12px;
        background: transparent;
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        min-height: auto;
      }
      .rev-follow__btn.is-on { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
      .rev-follow__btn:disabled { opacity: 0.5; cursor: wait; }
    `,
  ],
})
export class RevistaListPage {
  readonly i18n = inject(I18nService);
  readonly revista = inject(RevistaService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly categories = ARTICLE_CATEGORIES;
  readonly sortOptions = SORT_OPTIONS;

  readonly qText = signal('');
  readonly category = signal<ArticleCategoryLiteral | null>(null);
  readonly sort = signal<(typeof SORT_OPTIONS)[number]>('newest');
  readonly page = signal(1);

  readonly response = signal<ArticleListResponse | null>(null);
  readonly loading = signal(false);

  readonly followedCategories = signal<Set<ArticleCategoryLiteral>>(new Set());
  readonly followBusy = signal(false);

  /** Featured hero = first article only when on the "all" tab (no filter
      + first page). On filtered or paginated views, hero stays hidden and
      every article goes into the grid. */
  readonly heroArticle = computed<ArticleListItem | null>(() => {
    if (this.category() !== null || this.page() > 1) return null;
    return this.response()?.items[0] ?? null;
  });

  /** Articles for the .rev-grid — exclude the hero pick. */
  readonly gridArticles = computed<ArticleListItem[]>(() => {
    const items = this.response()?.items ?? [];
    if (this.heroArticle()) return items.slice(1);
    return items;
  });

  /** Side-rail top-list = items 2..6 of the response (different from grid). */
  readonly sideTopList = computed<ArticleListItem[]>(() => {
    const items = this.response()?.items ?? [];
    return items.slice(0, 5);
  });

  readonly canEdit = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return false;
    return u.roles.some((r) => r === 'editor' || r === 'admin' || r === 'superadmin');
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
    this.seo.set({
      title: 'Revista — articole despre tehnologie muzicală',
      description:
        'Recenzii, tutoriale, interviuri și ghiduri de cumpărare despre sintetizatoare, plug-in-uri, hardware și producție muzicală — în limba română.',
      canonicalPath: '/revista',
    });
    this.route.queryParamMap.subscribe((params) => {
      this.qText.set(params.get('q') ?? '');
      this.category.set((params.get('category') as ArticleCategoryLiteral | null) ?? null);
      this.sort.set(
        (params.get('sort') as (typeof SORT_OPTIONS)[number] | null) ?? 'newest',
      );
      this.page.set(Number(params.get('page') ?? '1') || 1);
      void this.fetch();
    });
    if (this.auth.currentUser()) void this.loadFollows();
  }

  isFollowed(cat: ArticleCategoryLiteral): boolean {
    return this.followedCategories().has(cat);
  }

  catLabel(cat: ArticleCategoryLiteral): string {
    return this.i18n.t('revista.cat.' + cat);
  }

  async toggleFollow(cat: ArticleCategoryLiteral): Promise<void> {
    if (this.followBusy()) return;
    this.followBusy.set(true);
    const wasFollowed = this.isFollowed(cat);
    try {
      if (wasFollowed) await this.revista.unfollow(cat);
      else await this.revista.follow(cat);
      const next = new Set(this.followedCategories());
      if (wasFollowed) next.delete(cat);
      else next.add(cat);
      this.followedCategories.set(next);
    } catch (err) {
      console.error('[revista] follow toggle failed', err);
    } finally {
      this.followBusy.set(false);
    }
  }

  private async loadFollows(): Promise<void> {
    try {
      const list = await this.revista.listFollows();
      this.followedCategories.set(new Set(list));
    } catch (err) {
      console.error('[revista] load follows failed', err);
    }
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

  formatShortDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  initials(name: string): string {
    if (!name) return '—';
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  isNewArticle(a: ArticleListItem): boolean {
    if (!a.publishedAt) return false;
    const days = (Date.now() - new Date(a.publishedAt).getTime()) / 86400000;
    return days >= 0 && days < 7;
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
