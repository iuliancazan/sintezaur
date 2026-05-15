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
      <header class="fs-head crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <h1>{{ 'forum.search.title' | t }}</h1>
      </header>

      <form
        class="fs-form"
        (submit)="$event.preventDefault(); submit()"
      >
        <label class="fs-field fs-field--q">
          <span>{{ 'forum.search.query_label' | t }}</span>
          <input
            type="search"
            [ngModel]="q()"
            (ngModelChange)="q.set($event)"
            name="q"
            [placeholder]="i18n.t('forum.search.query_placeholder')"
            (keydown.enter)="$event.preventDefault(); submit()"
          />
        </label>
        <label class="fs-field">
          <span>{{ 'forum.search.author_label' | t }}</span>
          <input
            type="text"
            [ngModel]="author()"
            (ngModelChange)="author.set($event)"
            name="author"
            placeholder="username"
          />
        </label>
        <label class="fs-field">
          <span>{{ 'forum.search.from_label' | t }}</span>
          <input
            type="date"
            [ngModel]="from()"
            (ngModelChange)="from.set($event)"
            name="from"
          />
        </label>
        <label class="fs-field">
          <span>{{ 'forum.search.to_label' | t }}</span>
          <input
            type="date"
            [ngModel]="to()"
            (ngModelChange)="to.set($event)"
            name="to"
          />
        </label>
        <label class="fs-field">
          <span>{{ 'forum.search.sort_label' | t }}</span>
          <select [ngModel]="sort()" (ngModelChange)="sort.set($event)" name="sort">
            @for (s of sortOptions; track s) {
              <option [value]="s">{{ 'forum.search.sort_' + s | t }}</option>
            }
          </select>
        </label>
        <button type="submit" class="fs-btn fs-btn--primary" [disabled]="loading()">
          {{ loading() ? ('app.loading' | t) : ('forum.search.go' | t) }}
        </button>
      </form>

      <div class="fs-cats">
        <span class="fs-cats__label">{{ 'forum.search.categories_label' | t }}:</span>
        @for (c of allCategories(); track c.id) {
          <button
            type="button"
            class="fs-chip"
            [class.is-active]="selectedCats().has(c.slug)"
            (click)="toggleCat(c.slug)"
          >{{ c.name }}</button>
        }
        @if (selectedCats().size > 0) {
          <button type="button" class="fs-chip fs-chip--clear" (click)="clearCats()">✕ {{ 'forum.search.clear' | t }}</button>
        }
      </div>

      @if (response(); as r) {
        <div class="fs-meta">
          <span>{{ 'forum.search.results' | t: { total: r.totalCount } }}</span>
          @if (r.totalPages > 1) {
            <span>{{ 'forum.pagination.page_of' | t: { page: r.page, total: r.totalPages } }}</span>
          }
        </div>

        @if (r.items.length === 0) {
          <app-empty-state
            icon="🔍"
            [title]="'Nicio postare nu se potrivește'"
            [lede]="'Încearcă alți termeni de căutare sau elimină filtrele de categorie / autor.'"
            ctaLabel="Resetează căutarea"
            ctaRouterLink="/forum/cautare"
          />
        } @else {
          <ul class="fs-list">
            @for (hit of r.items; track hit.threadId) {
              <li>
                <a class="fs-hit" [routerLink]="['/forum', hit.categorySlug, hit.threadSlug]">
                  <div class="fs-hit__meta">
                    <span class="fs-hit__cat">{{ hit.categoryName }}</span>
                    @if (hit.authorUsername) {
                      <span class="sep">·</span>
                      <span class="fs-hit__author">&#64;{{ hit.authorUsername }}</span>
                    }
                    <span class="sep">·</span>
                    <time>{{ formatDate(hit.lastPostAt ?? hit.createdAt) }}</time>
                    <span class="sep">·</span>
                    <span>{{ hit.postCount }} {{ 'forum.search.replies_short' | t }}</span>
                  </div>
                  <h2 class="fs-hit__title">{{ hit.threadTitle }}</h2>
                  @if (hit.snippet) {
                    <p class="fs-hit__snippet" [innerHTML]="hit.snippet"></p>
                  }
                  @if (hit.tags.length > 0) {
                    <div class="fs-hit__tags">
                      @for (t of hit.tags; track t) {
                        <span class="fs-tag">#{{ t }}</span>
                      }
                    </div>
                  }
                </a>
              </li>
            }
          </ul>

          @if (r.totalPages > 1) {
            <nav class="fs-pag">
              <button type="button" [disabled]="r.page === 1" (click)="goToPage(r.page - 1)">‹</button>
              @for (p of paginationPages(); track p) {
                @if (p === '…') {
                  <span>…</span>
                } @else {
                  <button type="button" [class.is-active]="p === r.page" (click)="goToPage($any(p))">{{ p }}</button>
                }
              }
              <button type="button" [disabled]="r.page === r.totalPages" (click)="goToPage(r.page + 1)">›</button>
            </nav>
          }
        }
      } @else if (loading()) {
        <p class="fs-empty">{{ 'app.loading' | t }}</p>
      } @else if (error()) {
        <p class="fs-empty">{{ 'forum.load_error' | t }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .fs-head {
        position: relative;
        padding: clamp(28px, 4vw, 48px) clamp(20px, 3vw, 32px);
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        margin: var(--gutter-y) 0 20px;
      }
      .fs-head h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(32px, 4vw, 48px);
        line-height: 1;
        margin: 0;
        text-transform: uppercase;
      }
      .fs-form {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto;
        gap: 10px;
        align-items: end;
        margin-bottom: 16px;
      }
      .fs-field { display: flex; flex-direction: column; gap: 4px; }
      .fs-field span {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .fs-field input,
      .fs-field select {
        padding: 8px 10px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: inherit;
      }
      .fs-field input:focus,
      .fs-field select:focus { outline: none; border-color: var(--accent); }
      .fs-btn {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 10px 18px;
        border: 1px solid var(--accent);
        background: var(--accent);
        color: var(--accent-fg);
        cursor: pointer;
      }
      .fs-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .fs-btn:hover:not(:disabled) { filter: brightness(1.1); }
      .fs-cats {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 16px;
      }
      .fs-cats__label {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .fs-chip {
        padding: 6px 12px;
        border: 1px solid var(--line-strong);
        background: transparent;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 11px;
        cursor: pointer;
      }
      .fs-chip:hover { border-color: var(--accent); color: var(--accent); }
      .fs-chip.is-active {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .fs-chip--clear { border-style: dashed; }
      .fs-meta {
        display: flex;
        justify-content: space-between;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        margin-bottom: 12px;
      }
      .fs-list { list-style: none; margin: 0 0 24px; padding: 0; border: var(--grid-line) solid var(--line); }
      .fs-list li + li { border-top: var(--grid-line) solid var(--line); }
      .fs-hit {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 14px 18px;
        background: var(--bg-elev);
        color: var(--fg);
        text-decoration: none;
      }
      .fs-hit:hover { background: color-mix(in oklab, var(--bg-elev) 80%, var(--accent) 20%); }
      .fs-hit__meta {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .fs-hit__cat { color: var(--accent); }
      .fs-hit__author { color: var(--accent); }
      .fs-hit__meta .sep { color: var(--fg-subtle); }
      .fs-hit__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 18px;
        margin: 0;
      }
      .fs-hit__snippet {
        margin: 0;
        color: var(--fg-muted);
        font-size: 13px;
        line-height: 1.5;
      }
      .fs-hit__snippet mark {
        background: color-mix(in oklab, var(--accent) 28%, transparent);
        color: var(--fg);
        padding: 0 2px;
      }
      .fs-hit__tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .fs-tag {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-muted);
        background: var(--bg);
        padding: 2px 6px;
        border: 1px solid var(--line);
      }
      .fs-pag {
        display: inline-flex;
        gap: 4px;
        margin: 20px auto 60px;
        justify-content: center;
        width: 100%;
      }
      .fs-pag button,
      .fs-pag span {
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
      .fs-pag button.is-active { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
      .fs-pag button:disabled { opacity: 0.5; cursor: not-allowed; }
      .fs-empty { padding: 30px; text-align: center; color: var(--fg-muted); font-family: var(--font-mono); font-size: 13px; }

      @media (max-width: 900px) {
        .fs-form { grid-template-columns: 1fr 1fr; }
        .fs-form .fs-field--q { grid-column: 1 / -1; }
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
