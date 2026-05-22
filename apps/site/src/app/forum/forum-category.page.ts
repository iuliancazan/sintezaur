import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { EmptyStateComponent } from '../ui/empty-state.component';
import { TPipe } from '../i18n/t.pipe';
import {
  ForumService,
  SubscriptionLevel,
  ThreadListResponse,
} from './forum.service';
import { SubscribeBellComponent } from './subscribe-bell.component';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-forum-category-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TPipe,
    SubscribeBellComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      @if (response(); as r) {
        <!-- BREADCRUMB -->
        <nav class="td-crumb" aria-label="Breadcrumb">
          <a routerLink="/forum" class="td-crumb__back">
            <svg width="14" height="14" aria-hidden="true"><use href="#i-back"/></svg>
            {{ 'forum.back_to_root' | t }}
          </a>
          <span class="sep">·</span>
          <a routerLink="/forum">{{ 'forum.crumb_root' | t }}</a>
          <span class="sep">/</span>
          <span class="cur">{{ r.category.name }}</span>
        </nav>

        <!-- CATEGORY STRIP -->
        <section class="fl-cat-strip crosses">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>
          <div class="fl-cat-strip__body">
            <p class="fl-cat-strip__kicker">
              {{
                'forum.cat_kicker' | t: {
                  kind: (r.category.kind === 'system'
                    ? ('forum.kind_system' | t)
                    : ('forum.kind_user' | t))
                }
              }}
            </p>
            <h1 class="fl-cat-strip__title">{{ r.category.name }}</h1>
            @if (r.category.description) {
              <p class="fl-cat-strip__desc">{{ r.category.description }}</p>
            }
          </div>
          <div class="fl-cat-strip__meta">
            <div class="fl-cat-stat">
              <span class="v">{{ r.totalCount }}</span>
              <span class="k">{{ 'forum.threads_count' | t }}</span>
            </div>
            @if (auth.currentUser()) {
              <app-forum-subscribe-bell
                [level]="subLevel()"
                [busy]="subBusy()"
                (levelChange)="onSubChange($event, r)"
              />
            }
          </div>
        </section>

        <!-- ACTION ROW -->
        <div class="fl-actions">
          @if (canCompose(r)) {
            <a
              class="fl-actions__primary"
              [routerLink]="['/forum', r.category.slug, 'nou']"
            >
              {{ 'forum.compose.new_thread_short' | t }}
            </a>
          }
          <div class="fl-sort-tabs">
            <a class="is-active">{{ 'forum.sort.recent_activity' | t }}</a>
            <a class="is-disabled" title="Disponibil curând">
              {{ 'forum.sort.newest' | t }}
            </a>
            <a class="is-disabled" title="Disponibil curând">
              {{ 'forum.sort.most_replies' | t }}
            </a>
          </div>
        </div>

        @if (pinnedItems().length > 0) {
          <!-- PINNED -->
          <section class="fl-pinned">
            <header class="fl-pinned__head">
              <svg aria-hidden="true"><use href="#i-pin"/></svg>
              {{ 'forum.pinned_label' | t: { n: pinnedItems().length } }}
            </header>
            @for (t of pinnedItems(); track t.id) {
              <a
                class="fl-row"
                [routerLink]="['/forum', r.category.slug, t.slug]"
              >
                <div class="fl-row__pin">
                  <svg aria-hidden="true"><use href="#i-pin"/></svg>
                </div>
                <div class="fl-row__body">
                  <div class="fl-row__title-line">
                    <h3 class="fl-row__title">
                      {{ t.title }}
                      @if (t.lockedAt) {
                        <span class="ft-lock">🔒</span>
                      }
                    </h3>
                    <span class="fl-row__badge">
                      {{ 'forum.pinned' | t }}
                    </span>
                  </div>
                  @if (t.tags && t.tags.length > 0) {
                    <div class="fl-row__tags">
                      @for (tag of t.tags.slice(0, 4); track tag) {
                        <span class="fr-tag">{{ tag }}</span>
                      }
                    </div>
                  }
                </div>
                <div class="fl-row__activity">
                  <div class="by-row">
                    <span
                      class="avatar"
                      [style.background]="avatarBg(t.authorUsername)"
                    >{{ initialsFor(t.authorUsername) }}</span>
                    <span>
                      <strong>{{ t.authorUsername ?? ('forum.deleted_user' | t) }}</strong>
                    </span>
                  </div>
                  <span class="last">
                    {{ relativeTime(t.lastPostAt ?? t.createdAt) }}
                  </span>
                </div>
                <div class="fl-row__replies">
                  <span class="v">{{ t.postCount - 1 }}</span>
                  <span class="k">{{ 'forum.replies_short' | t }}</span>
                </div>
              </a>
            }
          </section>
        }

        @if (regularItems().length === 0 && pinnedItems().length === 0) {
          <app-empty-state
            icon="💬"
            [title]="i18n.t('forum.empty_category_title')"
            [lede]="i18n.t('forum.empty_category_lede')"
            [ctaLabel]="canCompose(r) ? i18n.t('forum.compose.new_thread') : ''"
            [ctaRouterLink]="canCompose(r) ? ['/forum', categorySlug(), 'nou'] : null"
          />
        } @else {
          <!-- REGULAR THREAD LIST -->
          <div class="fl-list">
            @for (t of regularItems(); track t.id) {
              <a
                class="fl-row"
                [routerLink]="['/forum', r.category.slug, t.slug]"
              >
                <div class="fl-row__pin"></div>
                <div class="fl-row__body">
                  <div class="fl-row__title-line">
                    <h3 class="fl-row__title">
                      {{ t.title }}
                      @if (t.lockedAt) {
                        <span class="ft-lock">🔒</span>
                      }
                    </h3>
                  </div>
                  @if (t.tags && t.tags.length > 0) {
                    <div class="fl-row__tags">
                      @for (tag of t.tags.slice(0, 4); track tag) {
                        <span class="fr-tag">{{ tag }}</span>
                      }
                    </div>
                  }
                </div>
                <div class="fl-row__activity">
                  <div class="by-row">
                    <span
                      class="avatar"
                      [style.background]="avatarBg(t.authorUsername)"
                    >{{ initialsFor(t.authorUsername) }}</span>
                    <span>
                      <strong>{{ t.authorUsername ?? ('forum.deleted_user' | t) }}</strong>
                    </span>
                  </div>
                  <span class="last">
                    {{ relativeTime(t.lastPostAt ?? t.createdAt) }}
                  </span>
                </div>
                <div class="fl-row__replies">
                  <span class="v">{{ t.postCount - 1 }}</span>
                  <span class="k">{{ 'forum.replies_short' | t }}</span>
                </div>
              </a>
            }
          </div>

          @if (r.totalPages > 1) {
            <nav class="fr-pag" aria-label="Pagini">
              <span>
                {{
                  'forum.pagination.page_of' | t: {
                    page: r.page,
                    total: r.totalPages
                  }
                }}
                ·
                {{
                  'forum.pagination.total_threads' | t: {
                    total: r.totalCount,
                    name: r.category.name
                  }
                }}
              </span>
              <div class="fr-pag__nums">
                <button
                  class="fr-pag__num"
                  type="button"
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
                  class="fr-pag__num"
                  type="button"
                  [class.is-disabled]="r.page === r.totalPages"
                  [disabled]="r.page === r.totalPages"
                  (click)="goToPage(r.page + 1)"
                >›</button>
              </div>
            </nav>
          }
        }
      } @else if (loading()) {
        <p class="fl-empty">{{ 'app.loading' | t }}</p>
      } @else if (error()) {
        <p class="fl-empty">{{ 'forum.load_error' | t }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      /* Most layout is global in v05-forum.css (.fl-cat-strip, .fl-row,
         .fl-actions, .fl-pinned, .fr-pag). Only page-local rules below. */

      .fl-empty {
        padding: 40px 0;
        text-align: center;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .fl-sort-tabs a.is-disabled {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: none;
      }

      .fl-row .ft-lock {
        font-size: 0.7em;
        margin-left: 6px;
      }
    `,
  ],
})
export class ForumCategoryPage {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  canCompose(r: ThreadListResponse): boolean {
    return r.category.kind === 'user' && !!this.auth.currentUser();
  }

  readonly response = signal<ThreadListResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly categorySlug = signal<string>('');
  readonly page = signal(1);

  readonly subLevel = signal<SubscriptionLevel | null>(null);
  readonly subBusy = signal(false);

  /** Pinned threads come first in the V08 layout (`.fl-pinned` section).
   *  Backend already sorts pinned-first so we just partition the list. */
  readonly pinnedItems = computed(() =>
    (this.response()?.items ?? []).filter((t) => t.pinPosition !== null),
  );

  readonly regularItems = computed(() =>
    (this.response()?.items ?? []).filter((t) => t.pinPosition === null),
  );

  /** Hash username → hue for the avatar tint (matches the same routine
   *  used by `forum-thread.page.ts`). */
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

  async onSubChange(
    level: SubscriptionLevel | null,
    r: ThreadListResponse,
  ): Promise<void> {
    if (this.subBusy()) return;
    const prev = this.subLevel();
    this.subBusy.set(true);
    this.subLevel.set(level);
    try {
      await this.forum.setCategorySubscription(r.category.id, level);
    } catch {
      this.subLevel.set(prev);
    } finally {
      this.subBusy.set(false);
    }
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
      this.seo.set({
        title: `Forum · ${res.category.name}`,
        description: `Discuții pe forum în categoria ${res.category.name}. ${res.totalCount} thread-uri.`,
        canonicalPath: `/forum/${slug}`,
      });
      this.subLevel.set(null);
      if (this.auth.currentUser()) {
        void this.loadSub(res.category.id);
      }
    } catch {
      this.error.set(true);
      this.response.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSub(categoryId: string): Promise<void> {
    try {
      const res = await this.forum.getCategorySubscription(categoryId);
      this.subLevel.set(res.level);
    } catch {
      // silent
    }
  }
}
