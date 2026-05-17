import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { TPipe } from '../i18n/t.pipe';
import {
  ForumCategory,
  ForumService,
  ThreadListItem,
} from './forum.service';

/**
 * Forum landing — V08 layout (Forum.html reference).
 *
 * Sections:
 *   .fm-header (title + lede + crosses)
 *   .fm-actions (primary CTA + tabs)
 *   .fm-body { .fm-cats + .fm-trending aside }
 *   .fm-online (online avatars + counters)
 */
@Component({
  selector: 'app-forum-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- HEADER -->
      <section class="fm-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="fm-header__sub">{{ 'forum.page_eyebrow' | t }}</p>
          <h1>{{ 'forum.page_title' | t }}<span class="dot">.</span></h1>
        </div>
        <p class="fm-header__lede">{{ 'forum.page_lede' | t }}</p>
      </section>

      <!-- ACTION ROW -->
      <div class="fm-actions">
        <a class="bz-actions__primary" [routerLink]="newThreadLink()">
          {{ 'forum.action_new_thread' | t }}
        </a>
        <div class="fm-actions__tabs">
          <a class="is-active" routerLink="/forum">{{ 'forum.tab_all_short' | t }}</a>
          <a routerLink="/cont/favorite/abonamente">
            {{ 'forum.tab_subscribed' | t: { n: subscribedCount() } }}
          </a>
          <a routerLink="/forum">
            {{ 'forum.tab_unread' | t: { n: unreadCount() } }}
          </a>
        </div>
      </div>

      @if (loading()) {
        <p class="fm-empty">{{ 'app.loading' | t }}</p>
      } @else if (error()) {
        <p class="fm-empty">{{ 'forum.load_error' | t }}</p>
      } @else {
        <!-- FORUM BODY: categories + trending sidebar -->
        <div class="fm-body">

          <!-- CATEGORIES -->
          <div class="fm-cats">
            @for (c of allCats(); track c.id; let i = $index) {
              <a class="fm-cat" [routerLink]="['/forum', c.slug]">
                <span class="fm-cat__num">{{ formatNum(i + 1) }}</span>
                <div class="fm-cat__body">
                  <h3 class="fm-cat__title">{{ c.name }}</h3>
                  @if (c.description) {
                    <p class="fm-cat__desc">{{ c.description }}</p>
                  }
                  <div class="fm-cat__subs">
                    <span class="fm-cat__sub-chip">
                      {{ (c.kind === 'user' ? 'forum.kind_user' : 'forum.kind_system') | t }}
                    </span>
                    @if (c.kind === 'system') {
                      <span class="fm-cat__sub-chip">
                        {{ (c.key === 'anunturi' ? 'forum.badge_admin' : 'forum.badge_auto') | t }}
                      </span>
                    }
                  </div>
                </div>
                <div class="fm-cat__activity">
                  @if (lastActivityFor(c.slug); as la) {
                    <span><strong>&#64;{{ la.user }}</strong></span>
                    <span>{{ la.when }}</span>
                  } @else {
                    <span>—</span>
                    <span>—</span>
                  }
                </div>
                <div class="fm-cat__count">
                  <span class="v">{{ threadCountFor(c.slug) }}</span>
                  <span class="k">{{ 'forum.threads_count_label' | t }}</span>
                </div>
              </a>
            }
          </div>

          <!-- TRENDING (right rail) -->
          <aside class="fm-trending crosses">
            <span class="crosses-tl"></span><span class="crosses-tr"></span>
            <header class="fm-trending__head">
              <span class="fm-trending__title">{{ 'forum.trending_active' | t }}</span>
              <span class="fm-trending__live">{{ 'forum.trending_live' | t }}</span>
            </header>
            <div class="fm-trending__scroll">
              @for (t of trending(); track t.id) {
                <a class="fm-trending__card"
                   [routerLink]="['/forum', t.categorySlug, t.slug]">
                  <span class="ttl">{{ t.title }}</span>
                  <span class="meta">
                    {{ t.postCount }} {{ (t.postCount === 1 ? 'home.forum_post_one' : 'home.forum_post_many') | t }}
                    @if (t.authorUsername) { · &#64;{{ t.authorUsername }} }
                    · {{ relativeTime(t.lastPostAt ?? t.createdAt) }}
                  </span>
                </a>
              }
              @if (trending().length === 0) {
                <span class="fm-trending__empty">—</span>
              }
            </div>
          </aside>

        </div>

        <!-- ONLINE USERS -->
        <section class="fm-online crosses">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>
          <span class="fm-online__label">{{ 'forum.online_now' | t }}</span>
          <div class="fm-online__avatars">
            @for (a of onlineAvatars; track $index) {
              <span class="avatar">{{ a }}</span>
            }
          </div>
          <span class="fm-online__count">
            {{ 'forum.online_count' | t: { active: onlineActive, visible: onlineVisible } }}
          </span>
          <span class="fm-online__record">
            {{ 'forum.online_record' | t }}
            <strong>{{ onlineRecord }}</strong> · {{ onlineRecordDate }}
          </span>
        </section>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .fm-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 40px 20px;
        text-align: center;
      }
      .fm-trending__empty {
        display: block;
        padding: 16px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .fm-online__record {
        margin-left: auto;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        letter-spacing: 0.04em;
      }
      .fm-online__record strong { color: var(--fg); }
    `,
  ],
})
export class ForumListPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);
  private readonly seo = inject(SeoService);

  readonly categories = signal<ForumCategory[]>([]);
  readonly trending = signal<ThreadListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly subscribedCount = signal(0);
  readonly unreadCount = signal(0);

  // Static placeholder data for the "Online acum" strip (mirrors design ref).
  readonly onlineAvatars = [
    'RS', 'AB', 'VP', 'MD', 'LS', 'GO', 'RT', 'MN', 'AN', 'PR',
  ];
  readonly onlineActive = 142;
  readonly onlineVisible = 28;
  readonly onlineRecord = 312;
  readonly onlineRecordDate = '06 Mai 2026';

  /** All categories ordered user-first, then system. */
  readonly allCats = computed(() => {
    const cats = this.categories();
    const user = cats.filter((c) => c.kind === 'user');
    const system = cats.filter((c) => c.kind === 'system');
    return [...user, ...system];
  });

  /** First user category — used to wire the "Începe un thread nou" CTA. */
  readonly newThreadLink = computed(() => {
    const first = this.categories().find((c) => c.kind === 'user');
    return first ? ['/forum', first.slug, 'nou'] : ['/forum'];
  });

  constructor() {
    this.seo.set({
      title: 'Forum — discuții despre producția muzicală',
      description:
        'Comunitatea producătorilor de muzică din România: gear, producție, live, business. Discuții pe categorii, fără spam, fără marketing.',
      canonicalPath: '/forum',
    });
    void this.fetch();
  }

  formatNum(n: number): string {
    return n.toString().padStart(2, '0');
  }

  /** Pick the most-recent thread that belongs to this category. */
  lastActivityFor(slug: string): { user: string; when: string } | null {
    const t = this.trending().find((x) => x.categorySlug === slug);
    if (!t) return null;
    return {
      user: t.authorUsername ?? 'anon',
      when: this.relativeTime(t.lastPostAt ?? t.createdAt),
    };
  }

  /** Approximate thread count per category. Without a dedicated API we
      derive a quick count from trending; falls back to a dash. */
  threadCountFor(slug: string): string {
    const c = this.trending().filter((x) => x.categorySlug === slug).length;
    return c > 0 ? String(c) : '—';
  }

  /** "acum N min / oră / ore" — coarse RO relative formatter. */
  relativeTime(iso: string | null): string {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    const now = Date.now();
    const mins = Math.max(1, Math.floor((now - then) / 60000));
    if (mins < 60) return this.i18n.t('forum.relative_min', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours === 1) return this.i18n.t('forum.relative_hour', { n: 1 });
    if (hours < 48) return this.i18n.t('forum.relative_hours', { n: hours });
    const days = Math.floor(hours / 24);
    return this.i18n.t('forum.relative_hours', { n: days * 24 });
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const [cats, recent] = await Promise.all([
        this.forum.listCategories(),
        this.forum.listRecent(8).catch(() => []),
      ]);
      this.categories.set(cats);
      this.trending.set(recent);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
