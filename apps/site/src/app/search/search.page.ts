import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { TPipe } from '../i18n/t.pipe';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import {
  UnifiedSearchService,
  type UnifiedSearchResponse,
} from './search.service';

/**
 * `/cautare` — unified cross-module search per spec §7.6.
 *
 * Single search input + 4 result groups (Tezaur / Bazar / Revista /
 * Forum). Each group shows top 5 hits with "Vezi toate {N}" deep-link
 * to the per-section search page (so users can drill into one
 * module's full filter UI if needed).
 *
 * Query syncs to `?q=...` URL param so search results are shareable
 * and back-button works. Debounced input (300ms) to avoid hammering
 * the backend on every keystroke.
 */
@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="search">
      <header class="search__head">
        <h1>{{ 'search.title' | t }}</h1>
        <p class="search__meta">{{ 'search.intro' | t }}</p>
      </header>

      <form (submit)="$event.preventDefault(); onSearch()">
        <input
          type="search"
          class="search__input"
          [(ngModel)]="query"
          name="q"
          [placeholder]="i18n.t('search.placeholder')"
          (input)="onQueryChange()"
          autocomplete="off"
          autocapitalize="off"
          autofocus
        />
      </form>

      @if (loading()) {
        <p class="muted">{{ 'common.loading' | t }}</p>
      } @else if (response(); as r) {
        @if (r.tooShort) {
          <p class="muted">{{ 'search.too_short' | t }}</p>
        } @else if (r.totalHits === 0) {
          <p class="muted">
            {{ 'search.no_results' | t: { query: r.query } }}
          </p>
        } @else {
          <p class="search__totals">
            {{ 'search.totals' | t: { total: r.totalHits } }}
          </p>

          @if (r.tezaur.totalCount > 0) {
            <section class="group">
              <header class="group__head">
                <h2>{{ 'search.section.tezaur' | t }}</h2>
                <span class="muted">
                  {{ 'search.section_count' | t: { n: r.tezaur.totalCount } }}
                </span>
              </header>
              <ul class="hits">
                @for (h of r.tezaur.items; track h.id) {
                  <li>
                    <a [routerLink]="['/tezaur', h.slug]" class="hit">
                      <span class="hit__title">{{ h.brand }} {{ h.model }}</span>
                      <span class="hit__meta">
                        {{ h.category }}
                        @if (h.yearReleased) { · {{ h.yearReleased }} }
                      </span>
                    </a>
                  </li>
                }
              </ul>
              @if (r.tezaur.totalCount > r.tezaur.items.length) {
                <a
                  [routerLink]="['/tezaur']"
                  [queryParams]="{ q: r.query }"
                  class="see-all"
                >
                  {{ 'search.see_all' | t: { n: r.tezaur.totalCount } }} →
                </a>
              }
            </section>
          }

          @if (r.bazar.totalCount > 0) {
            <section class="group">
              <header class="group__head">
                <h2>{{ 'search.section.bazar' | t }}</h2>
                <span class="muted">
                  {{ 'search.section_count' | t: { n: r.bazar.totalCount } }}
                </span>
              </header>
              <ul class="hits">
                @for (h of r.bazar.items; track h.id) {
                  <li>
                    <a [routerLink]="['/bazar', h.slug]" class="hit">
                      <span class="hit__title">{{ h.title }}</span>
                      <span class="hit__meta">
                        {{ h.price }} {{ h.currency | uppercase }}
                        @if (h.city) { · {{ h.city }} }
                        · {{ h.condition }}
                      </span>
                    </a>
                  </li>
                }
              </ul>
              @if (r.bazar.totalCount > r.bazar.items.length) {
                <a
                  [routerLink]="['/bazar']"
                  [queryParams]="{ q: r.query }"
                  class="see-all"
                >
                  {{ 'search.see_all' | t: { n: r.bazar.totalCount } }} →
                </a>
              }
            </section>
          }

          @if (r.revista.totalCount > 0) {
            <section class="group">
              <header class="group__head">
                <h2>{{ 'search.section.revista' | t }}</h2>
                <span class="muted">
                  {{ 'search.section_count' | t: { n: r.revista.totalCount } }}
                </span>
              </header>
              <ul class="hits">
                @for (h of r.revista.items; track h.id) {
                  <li>
                    <a [routerLink]="['/revista', h.slug]" class="hit">
                      <span class="hit__title">{{ h.title }}</span>
                      @if (h.excerpt) {
                        <span class="hit__excerpt">{{ h.excerpt }}</span>
                      }
                    </a>
                  </li>
                }
              </ul>
              @if (r.revista.totalCount > r.revista.items.length) {
                <a
                  [routerLink]="['/revista']"
                  [queryParams]="{ q: r.query }"
                  class="see-all"
                >
                  {{ 'search.see_all' | t: { n: r.revista.totalCount } }} →
                </a>
              }
            </section>
          }

          @if (r.forum.totalCount > 0) {
            <section class="group">
              <header class="group__head">
                <h2>{{ 'search.section.forum' | t }}</h2>
                <span class="muted">
                  {{ 'search.section_count' | t: { n: r.forum.totalCount } }}
                </span>
              </header>
              <ul class="hits">
                @for (h of r.forum.items; track h.threadId) {
                  <li>
                    <a
                      [routerLink]="['/forum', h.categorySlug, h.threadSlug]"
                      class="hit"
                    >
                      <span class="hit__title">{{ h.threadTitle }}</span>
                      <span class="hit__meta">
                        {{ h.categoryName }} · {{ h.postCount }} răspunsuri
                      </span>
                      @if (h.snippet) {
                        <span
                          class="hit__excerpt"
                          [innerHTML]="h.snippet"
                        ></span>
                      }
                    </a>
                  </li>
                }
              </ul>
              @if (r.forum.totalCount > r.forum.items.length) {
                <a
                  [routerLink]="['/forum/cautare']"
                  [queryParams]="{ q: r.query }"
                  class="see-all"
                >
                  {{ 'search.see_all' | t: { n: r.forum.totalCount } }} →
                </a>
              }
            </section>
          }
        }
      } @else {
        <p class="muted">{{ 'search.start_typing' | t }}</p>
      }
    </main>
  `,
  styles: [
    `
      .search {
        max-width: 880px;
        margin: 0 auto;
        padding: 32px var(--gutter-x);
      }
      .search__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 40px);
        margin: 0 0 8px;
      }
      .search__meta {
        margin: 0 0 16px;
        opacity: 0.75;
        font-size: 14px;
      }
      .search__input {
        width: 100%;
        padding: 14px 16px;
        font-size: 17px;
        border: 1px solid var(--surface-border, #e4e4e7);
        border-radius: 6px;
        background: var(--surface-card, #fff);
        color: var(--fg);
        margin-bottom: 24px;
      }
      .search__totals {
        font-size: 14px;
        opacity: 0.7;
        margin: 0 0 16px;
      }
      .group {
        margin-bottom: 32px;
      }
      .group__head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 12px;
        border-bottom: 1px solid var(--surface-border, #e4e4e7);
        padding-bottom: 6px;
      }
      .group__head h2 {
        font-family: var(--font-display);
        font-size: 18px;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .hits {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .hits li {
        border-left: 2px solid var(--surface-border, #e4e4e7);
        padding-left: 12px;
      }
      .hits li:hover {
        border-left-color: var(--accent, #2563eb);
      }
      .hit {
        display: flex;
        flex-direction: column;
        gap: 4px;
        text-decoration: none;
        color: inherit;
      }
      .hit__title {
        font-weight: 600;
        font-size: 15px;
      }
      .hit__meta {
        font-size: 12px;
        opacity: 0.7;
      }
      .hit__excerpt {
        font-size: 13px;
        opacity: 0.85;
        line-height: 1.4;
      }
      .hit__excerpt :global(mark) {
        background: rgba(251, 191, 36, 0.35);
        color: inherit;
        padding: 0 2px;
        font-weight: 500;
      }
      .see-all {
        display: inline-block;
        margin-top: 8px;
        font-size: 13px;
        color: var(--accent, #2563eb);
        text-decoration: none;
      }
      .see-all:hover { text-decoration: underline; }
      .muted { opacity: 0.6; }
    `,
  ],
})
export class SearchPage implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private readonly api = inject(UnifiedSearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  query = '';
  readonly loading = signal(false);
  readonly response = signal<UnifiedSearchResponse | null>(null);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private queryParamSub: Subscription | null = null;

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('search.title'),
      description: this.i18n.t('search.intro'),
      canonicalPath: '/cautare',
    });
    this.queryParamSub = this.route.queryParamMap.subscribe((p) => {
      const q = p.get('q') ?? '';
      if (q !== this.query) {
        this.query = q;
        if (q.trim().length >= 2) {
          void this.runSearch(q);
        } else {
          this.response.set(null);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.queryParamSub?.unsubscribe();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onQueryChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.onSearch(), 300);
  }

  onSearch(): void {
    const q = this.query.trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q ? { q } : {},
      replaceUrl: true,
    });
  }

  private async runSearch(q: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.search(q, 5);
      this.response.set(res);
    } catch {
      this.response.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
