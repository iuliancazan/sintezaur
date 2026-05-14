import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { ForumService, ThreadListResponse } from './forum.service';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-forum-category-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <nav class="fc-crumbs">
        <a routerLink="/forum">{{ 'forum.crumb_root' | t }}</a>
        <span class="sep">/</span>
        <span>{{ response()?.category?.name ?? '' }}</span>
      </nav>

      @if (response(); as r) {
        <section class="fc-header crosses">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>
          <h1 class="fc-header__title">{{ r.category.name }}</h1>
          @if (r.category.description) {
            <p class="fc-header__desc">{{ r.category.description }}</p>
          }
        </section>

        <div class="fc-results">
          <span>
            <span class="accent">// </span>
            {{
              'forum.results_count' | t: { shown: r.items.length, total: r.totalCount }
            }}
          </span>
          @if (r.totalPages > 1) {
            <span>
              {{
                'forum.pagination.page_of' | t: { page: r.page, total: r.totalPages }
              }}
            </span>
          }
        </div>

        @if (r.items.length === 0) {
          <p class="fc-empty">{{ 'forum.no_threads' | t }}</p>
        } @else {
          <ul class="fc-list">
            @for (t of r.items; track t.id) {
              <li>
                <a class="fc-thread" [routerLink]="['/forum', r.category.slug, t.slug]">
                  <span class="fc-thread__bullet">
                    @if (t.pinPosition !== null) {
                      <span class="fc-pin" [title]="'forum.pinned' | t">📌</span>
                    } @else {
                      ▌
                    }
                  </span>
                  <span class="fc-thread__body">
                    <span class="fc-thread__title">
                      {{ t.title }}
                      @if (t.lockedAt) {
                        <span class="fc-lock">🔒</span>
                      }
                    </span>
                    <span class="fc-thread__meta">
                      @if (t.authorUsername) {
                        <span class="fc-thread__author">&#64;{{ t.authorUsername }}</span>
                      } @else {
                        <span>{{ 'forum.deleted_user' | t }}</span>
                      }
                      <span class="sep">·</span>
                      <span>{{ relativeTime(t.lastPostAt ?? t.createdAt) }}</span>
                    </span>
                  </span>
                  <span class="fc-thread__count">
                    <span class="num">{{ t.postCount }}</span>
                    <span class="lbl">{{ 'forum.replies_short' | t }}</span>
                  </span>
                </a>
              </li>
            }
          </ul>

          @if (r.totalPages > 1) {
            <nav class="fc-pag">
              <button type="button" [disabled]="r.page === 1" (click)="goToPage(r.page - 1)">‹</button>
              @for (p of paginationPages(); track p) {
                @if (p === '…') {
                  <span class="is-ellipsis">…</span>
                } @else {
                  <button type="button" [class.is-active]="p === r.page" (click)="goToPage($any(p))">{{ p }}</button>
                }
              }
              <button type="button" [disabled]="r.page === r.totalPages" (click)="goToPage(r.page + 1)">›</button>
            </nav>
          }
        }
      } @else if (loading()) {
        <p class="fc-empty">{{ 'app.loading' | t }}</p>
      } @else if (error()) {
        <p class="fc-empty">{{ 'forum.load_error' | t }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .fc-crumbs {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        padding: 16px 0 8px;
      }
      .fc-crumbs a { color: var(--fg-muted); text-decoration: none; }
      .fc-crumbs a:hover { color: var(--accent); }
      .fc-crumbs .sep { margin: 0 8px; color: var(--fg-subtle); }

      .fc-header {
        position: relative;
        padding: clamp(28px, 4vw, 48px) clamp(20px, 3vw, 32px);
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        margin: 8px 0 20px;
      }
      .fc-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(36px, 5vw, 56px);
        line-height: 1;
        text-transform: uppercase;
        margin: 0 0 10px;
        letter-spacing: 0.005em;
      }
      .fc-header__desc {
        color: var(--fg-muted);
        font-size: 14px;
        max-width: 60ch;
        margin: 0;
      }

      .fc-results {
        display: flex;
        justify-content: space-between;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        padding: 8px 0 12px;
      }
      .fc-results .accent { color: var(--accent); }

      .fc-list {
        list-style: none;
        margin: 0 0 24px;
        padding: 0;
        border: var(--grid-line) solid var(--line);
      }
      .fc-list li + li { border-top: var(--grid-line) solid var(--line); }

      .fc-thread {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 14px 18px;
        background: var(--bg-elev);
        color: var(--fg);
        text-decoration: none;
        transition: background 0.15s ease;
      }
      .fc-thread:hover {
        background: color-mix(in oklab, var(--bg-elev) 80%, var(--accent) 20%);
      }
      .fc-thread__bullet { color: var(--accent); font-size: 18px; line-height: 1; }
      .fc-pin { font-size: 14px; }
      .fc-thread__body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .fc-thread__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 16px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .fc-lock { font-size: 12px; }
      .fc-thread__meta {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
        display: inline-flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .fc-thread__author { color: var(--accent); }
      .fc-thread__meta .sep { color: var(--fg-subtle); }

      .fc-thread__count {
        display: flex;
        flex-direction: column;
        align-items: end;
        font-family: var(--font-mono);
        color: var(--fg-muted);
      }
      .fc-thread__count .num {
        font-size: 18px;
        font-weight: 600;
        color: var(--fg);
      }
      .fc-thread__count .lbl {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .fc-pag {
        display: inline-flex;
        gap: 4px;
        margin: 20px auto 60px;
        justify-content: center;
        width: 100%;
      }
      .fc-pag button,
      .fc-pag .is-ellipsis {
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
      .fc-pag button:hover:not(:disabled) { color: var(--fg); border-color: var(--line-strong); }
      .fc-pag button.is-active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
      .fc-pag button:disabled { opacity: 0.5; cursor: not-allowed; }
      .fc-pag .is-ellipsis { border: 0; background: transparent; cursor: default; }

      .fc-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 40px 20px;
        text-align: center;
      }

      @media (max-width: 720px) {
        .fc-thread { grid-template-columns: auto 1fr; padding: 12px 14px; }
        .fc-thread__count { grid-column: 2; flex-direction: row; gap: 6px; align-items: baseline; }
        .fc-thread__count .num { font-size: 14px; }
      }
    `,
  ],
})
export class ForumCategoryPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly response = signal<ThreadListResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly categorySlug = signal<string>('');
  readonly page = signal(1);

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
    this.route.paramMap.subscribe((p) => {
      this.categorySlug.set(p.get('category') ?? '');
      void this.fetch();
    });
    this.route.queryParamMap.subscribe((q) => {
      const next = Number(q.get('page') ?? '1') || 1;
      if (next !== this.page()) {
        this.page.set(next);
        void this.fetch();
      }
    });
  }

  goToPage(n: number): void {
    const total = this.response()?.totalPages ?? 1;
    if (n < 1 || n > total) return;
    this.page.set(n);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: n === 1 ? null : n },
      queryParamsHandling: 'merge',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  private async fetch(): Promise<void> {
    const slug = this.categorySlug();
    if (!slug) return;
    this.loading.set(true);
    this.error.set(false);
    try {
      const res = await this.forum.listThreads(slug, {
        page: this.page(),
        pageSize: PAGE_SIZE,
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
