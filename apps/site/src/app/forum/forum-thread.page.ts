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
import { TPipe } from '../i18n/t.pipe';
import {
  ForumService,
  PostListItem,
  PostsResponse,
  ThreadDetail,
} from './forum.service';

interface SubReplyVM extends PostListItem {
  numbering: string;
  parentRef: { username: string | null; numbering: string } | null;
}

interface TopLevelGroupVM {
  post: PostListItem;
  numbering: string;
  children: SubReplyVM[];
  expanded: boolean;
}

const COLLAPSE_THRESHOLD = 5;

@Component({
  selector: 'app-forum-thread-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (thread(); as t) {
      <div class="shell">
        <!-- BREADCRUMB -->
        <nav class="ft-crumbs">
          <a routerLink="/forum">{{ 'forum.crumb_root' | t }}</a>
          <span class="sep">/</span>
          <a [routerLink]="['/forum', t.category.slug]">{{ t.category.name }}</a>
          <span class="sep">/</span>
          <span>{{ t.thread.title }}</span>
        </nav>

        <!-- SOURCE LINK (sistem) -->
        @if (t.sourceLink; as src) {
          <div class="ft-source">
            <span class="ft-source__label">
              {{
                (src.type === 'article'
                  ? 'forum.source.article'
                  : 'forum.source.gear'
                ) | t
              }}
              :
            </span>
            <a
              class="ft-source__link"
              [routerLink]="
                src.type === 'article'
                  ? ['/revista', src.slug]
                  : ['/tezaur', src.slug]
              "
            >
              {{ src.title }} →
            </a>
          </div>
        }

        <!-- HEADER -->
        <header class="ft-header crosses">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>
          <h1 class="ft-header__title">
            {{ t.thread.title }}
            @if (t.thread.lockedAt) {
              <span class="ft-lock" [title]="'forum.locked' | t">🔒</span>
            }
          </h1>
          <div class="ft-header__meta">
            @if (t.author) {
              <span class="ft-header__author">&#64;{{ t.author.username }}</span>
            } @else {
              <span>{{ 'forum.deleted_user' | t }}</span>
            }
            <span class="sep">·</span>
            <time>{{ formatDate(t.thread.createdAt) }}</time>
            <span class="sep">·</span>
            <span>{{ t.thread.postCount }} {{ 'forum.posts_count' | t }}</span>
          </div>

          @if (groups().length > 0) {
            <div class="ft-master">
              <button type="button" (click)="setAllExpanded(true)">
                {{ 'forum.expand_all' | t }}
              </button>
              <button type="button" (click)="setAllExpanded(false)">
                {{ 'forum.collapse_all' | t }}
              </button>
            </div>
          }
        </header>

        <!-- OP -->
        @if (op(); as p) {
          <article class="ft-op" [class.is-hidden]="!!p.hiddenAt">
            <div class="ft-post__meta">
              @if (p.authorUsername) {
                <span class="ft-post__author">&#64;{{ p.authorUsername }}</span>
              } @else {
                <span>{{ 'forum.deleted_user' | t }}</span>
              }
              <span class="sep">·</span>
              <time>{{ formatDate(p.createdAt) }}</time>
              @if (p.editedAt) {
                <span class="sep">·</span>
                <span class="ft-edited">{{ 'forum.edited' | t }}</span>
              }
            </div>

            @if (p.hiddenAt) {
              <p class="ft-hidden">{{ 'forum.hidden_post' | t }}</p>
            } @else {
              <div class="ft-post__body" [innerHTML]="p.bodyHtml"></div>
            }

            <div class="ft-actions">
              <button type="button" class="ft-action" (click)="onReply(p)">
                ↩ {{ 'forum.action.reply' | t }}
              </button>
              <button type="button" class="ft-action ft-action--like" (click)="onLike(p)">
                👍 {{ 'forum.action.like' | t }} · {{ p.likeCount }}
              </button>
            </div>
          </article>
        }

        <!-- REPLIES -->
        @if (groups().length === 0 && !loading()) {
          <p class="ft-empty">{{ 'forum.no_replies' | t }}</p>
        }

        <ol class="ft-replies">
          @for (g of groups(); track g.post.id) {
            <li>
              <article class="ft-post" [class.is-hidden]="!!g.post.hiddenAt">
                <div class="ft-post__head">
                  <span class="ft-num">#{{ g.numbering }}</span>
                  <div class="ft-post__meta">
                    @if (g.post.authorUsername) {
                      <span class="ft-post__author">&#64;{{ g.post.authorUsername }}</span>
                    } @else {
                      <span>{{ 'forum.deleted_user' | t }}</span>
                    }
                    <span class="sep">·</span>
                    <time>{{ formatDate(g.post.createdAt) }}</time>
                    @if (g.post.editedAt) {
                      <span class="sep">·</span>
                      <span class="ft-edited">{{ 'forum.edited' | t }}</span>
                    }
                  </div>
                </div>

                @if (g.post.hiddenAt) {
                  <p class="ft-hidden">{{ 'forum.hidden_post' | t }}</p>
                } @else {
                  <div class="ft-post__body" [innerHTML]="g.post.bodyHtml"></div>
                }

                <div class="ft-actions">
                  <button type="button" class="ft-action" (click)="onReply(g.post)">
                    ↩ {{ 'forum.action.reply' | t }}
                  </button>
                  <button type="button" class="ft-action ft-action--like" (click)="onLike(g.post)">
                    👍 {{ 'forum.action.like' | t }} · {{ g.post.likeCount }}
                  </button>
                </div>
              </article>

              @if (g.children.length > 0) {
                @if (!g.expanded) {
                  <button type="button" class="ft-strip" (click)="toggleGroup(g.post.id)">
                    ↓ {{ 'forum.show_n_replies' | t: { n: g.children.length } }}
                  </button>
                } @else {
                  @if (g.children.length > COLLAPSE_THRESHOLD) {
                    <button type="button" class="ft-strip" (click)="toggleGroup(g.post.id)">
                      ↑ {{ 'forum.hide_replies' | t }}
                    </button>
                  }
                  <ol class="ft-subreplies">
                    @for (s of g.children; track s.id) {
                      <li>
                        <article class="ft-post ft-sub" [class.is-hidden]="!!s.hiddenAt">
                          <div class="ft-post__head">
                            <span class="ft-num">#{{ s.numbering }}</span>
                            <div class="ft-post__meta">
                              @if (s.authorUsername) {
                                <span class="ft-post__author">&#64;{{ s.authorUsername }}</span>
                              } @else {
                                <span>{{ 'forum.deleted_user' | t }}</span>
                              }
                              <span class="sep">·</span>
                              <time>{{ formatDate(s.createdAt) }}</time>
                              @if (s.editedAt) {
                                <span class="sep">·</span>
                                <span class="ft-edited">{{ 'forum.edited' | t }}</span>
                              }
                            </div>
                          </div>

                          @if (s.parentRef) {
                            <div class="ft-parent-ref">
                              {{
                                'forum.in_reply_to' | t: {
                                  username: s.parentRef.username ?? '?',
                                  numbering: s.parentRef.numbering
                                }
                              }}
                            </div>
                          }

                          @if (s.hiddenAt) {
                            <p class="ft-hidden">{{ 'forum.hidden_post' | t }}</p>
                          } @else {
                            <div class="ft-post__body" [innerHTML]="s.bodyHtml"></div>
                          }

                          <div class="ft-actions">
                            <button type="button" class="ft-action" (click)="onReply(s)">
                              ↩ {{ 'forum.action.reply' | t }}
                            </button>
                            <button type="button" class="ft-action ft-action--like" (click)="onLike(s)">
                              👍 {{ 'forum.action.like' | t }} · {{ s.likeCount }}
                            </button>
                          </div>
                        </article>
                      </li>
                    }
                  </ol>
                }
              }
            </li>
          }
        </ol>

        @if (toast()) {
          <div class="ft-toast">{{ toast() }}</div>
        }
      </div>
    } @else if (loading()) {
      <p class="ft-empty">{{ 'app.loading' | t }}</p>
    } @else if (error()) {
      <p class="ft-empty">{{ 'forum.load_error' | t }}</p>
    }
  `,
  styles: [
    `
      :host { display: block; }

      .ft-crumbs {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        padding: 16px 0 8px;
      }
      .ft-crumbs a { color: var(--fg-muted); text-decoration: none; }
      .ft-crumbs a:hover { color: var(--accent); }
      .ft-crumbs .sep { margin: 0 8px; color: var(--fg-subtle); }

      .ft-source {
        padding: 12px 16px;
        margin: 0 0 12px;
        background: var(--bg-elev);
        border-left: 3px solid var(--accent);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .ft-source__label {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        margin-right: 8px;
      }
      .ft-source__link {
        color: var(--accent);
        text-decoration: none;
        font-family: var(--font-display);
        font-size: 14px;
      }
      .ft-source__link:hover { text-decoration: underline; }

      .ft-header {
        position: relative;
        padding: clamp(28px, 4vw, 48px) clamp(20px, 3vw, 32px);
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        margin: 8px 0 20px;
      }
      .ft-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 4vw, 44px);
        line-height: 1.05;
        margin: 0 0 12px;
        letter-spacing: 0.005em;
      }
      .ft-lock { font-size: 0.7em; margin-left: 8px; }
      .ft-header__meta {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .ft-header__author { color: var(--accent); }
      .ft-header__meta .sep { color: var(--fg-subtle); }
      .ft-master {
        display: flex;
        gap: 8px;
        margin-top: 14px;
      }
      .ft-master button {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 6px 10px;
        background: transparent;
        border: 1px solid var(--line-strong);
        color: var(--fg-muted);
        cursor: pointer;
      }
      .ft-master button:hover { color: var(--accent); border-color: var(--accent); }

      .ft-op,
      .ft-post {
        background: var(--bg-elev);
        border: var(--grid-line) solid var(--line);
        padding: 20px;
        margin: 0 0 14px;
      }
      .ft-op { border-left-width: 3px; border-left-color: var(--accent); }
      .ft-post.is-hidden,
      .ft-op.is-hidden { opacity: 0.55; }

      .ft-post__head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 12px;
      }
      .ft-num {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--accent);
        letter-spacing: 0.06em;
      }
      .ft-post__meta {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .ft-post__author { color: var(--accent); }
      .ft-post__meta .sep { color: var(--fg-subtle); }
      .ft-edited { font-style: italic; }

      .ft-parent-ref {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        padding: 6px 10px;
        margin: 0 0 10px;
        border-left: 2px solid var(--line-strong);
        background: color-mix(in oklab, var(--bg-elev) 80%, var(--bg) 20%);
      }

      .ft-post__body {
        font-size: 15px;
        line-height: 1.6;
        color: var(--fg);
      }
      .ft-post__body :first-child { margin-top: 0; }
      .ft-post__body :last-child { margin-bottom: 0; }
      .ft-post__body p { margin: 0 0 12px; }
      .ft-post__body a { color: var(--accent); }
      .ft-post__body img { max-width: 100%; height: auto; }
      .ft-post__body code {
        font-family: var(--font-mono);
        font-size: 0.9em;
        background: var(--bg);
        padding: 2px 5px;
        border: 1px solid var(--line);
      }
      .ft-post__body blockquote {
        border-left: 3px solid var(--line-strong);
        padding-left: 14px;
        color: var(--fg-muted);
        margin: 0 0 12px;
      }

      .ft-hidden {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg-muted);
        font-style: italic;
        margin: 0;
      }

      .ft-actions {
        margin-top: 14px;
        display: flex;
        gap: 8px;
      }
      .ft-action {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 6px 10px;
        background: transparent;
        border: 1px solid var(--line);
        color: var(--fg-muted);
        cursor: pointer;
      }
      .ft-action:hover { color: var(--accent); border-color: var(--accent); }

      .ft-strip {
        display: block;
        width: 100%;
        margin: 4px 0 14px 32px;
        padding: 8px 14px;
        background: transparent;
        border: 1px dashed var(--line-strong);
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-align: left;
        cursor: pointer;
      }
      .ft-strip:hover { background: var(--bg-elev); }

      .ft-replies,
      .ft-subreplies {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .ft-subreplies {
        margin-left: 32px;
        border-left: 1px solid var(--line-strong);
        padding-left: 16px;
      }
      .ft-sub { border-left-width: 2px; border-left-color: var(--line-strong); }

      .ft-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 30px 20px;
        text-align: center;
      }

      .ft-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-elev);
        border: 1px solid var(--accent);
        color: var(--fg);
        padding: 10px 18px;
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        z-index: 100;
        animation: ft-toast-in 0.2s ease-out;
      }
      @keyframes ft-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(8px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }

      @media (max-width: 720px) {
        .ft-subreplies { margin-left: 16px; padding-left: 10px; }
        .ft-strip { margin-left: 16px; }
        .ft-post,
        .ft-op { padding: 14px; }
        .ft-post__body { font-size: 14px; }
      }
    `,
  ],
})
export class ForumThreadPage {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly COLLAPSE_THRESHOLD = COLLAPSE_THRESHOLD;

  readonly thread = signal<ThreadDetail | null>(null);
  readonly posts = signal<PostsResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly toast = signal<string | null>(null);

  // Per-branch expanded state. Initial state seeded from data.
  readonly expandedMap = signal<Map<string, boolean>>(new Map());

  readonly op = computed(() => this.posts()?.op ?? null);

  readonly groups = computed<TopLevelGroupVM[]>(() => {
    const data = this.posts();
    if (!data) return [];

    const topLevels = data.replies
      .filter((p) => p.subSeq === null && p.topLevelSeq > 0)
      .sort((a, b) => a.topLevelSeq - b.topLevelSeq);

    const subsByTop = new Map<number, PostListItem[]>();
    for (const p of data.replies) {
      if (p.subSeq === null) continue;
      const arr = subsByTop.get(p.topLevelSeq) ?? [];
      arr.push(p);
      subsByTop.set(p.topLevelSeq, arr);
    }

    const postById = new Map<string, PostListItem>();
    for (const p of data.replies) postById.set(p.id, p);

    const expanded = this.expandedMap();
    return topLevels.map((post): TopLevelGroupVM => {
      const children = (subsByTop.get(post.topLevelSeq) ?? [])
        .slice()
        .sort((a, b) => (a.subSeq ?? 0) - (b.subSeq ?? 0));

      const subVMs: SubReplyVM[] = children.map((c) => {
        const numbering = `${c.topLevelSeq}.${c.subSeq}`;
        let parentRef: SubReplyVM['parentRef'] = null;
        if (c.parentPostId && c.parentPostId !== post.id) {
          const parent = postById.get(c.parentPostId);
          if (parent) {
            const parentNumber =
              parent.subSeq === null
                ? `${parent.topLevelSeq}`
                : `${parent.topLevelSeq}.${parent.subSeq}`;
            parentRef = {
              username: parent.authorUsername,
              numbering: parentNumber,
            };
          }
        }
        return { ...c, numbering, parentRef };
      });

      const explicit = expanded.get(post.id);
      const isExpanded =
        explicit !== undefined ? explicit : children.length <= COLLAPSE_THRESHOLD;

      return {
        post,
        numbering: `${post.topLevelSeq}`,
        children: subVMs,
        expanded: isExpanded,
      };
    });
  });

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const slug = p.get('slug');
      if (slug) void this.fetch(slug);
    });
  }

  toggleGroup(postId: string): void {
    const next = new Map(this.expandedMap());
    const group = this.groups().find((g) => g.post.id === postId);
    if (!group) return;
    next.set(postId, !group.expanded);
    this.expandedMap.set(next);
  }

  setAllExpanded(expanded: boolean): void {
    const next = new Map<string, boolean>();
    for (const g of this.groups()) next.set(g.post.id, expanded);
    this.expandedMap.set(next);
  }

  onReply(_post: PostListItem): void {
    if (!this.auth.currentUser()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.flashToast(this.i18n.t('forum.coming_soon'));
  }

  onLike(_post: PostListItem): void {
    if (!this.auth.currentUser()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.flashToast(this.i18n.t('forum.coming_soon'));
  }

  formatDate(iso: string | Date): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private flashToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2200);
  }

  private async fetch(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const [t, p] = await Promise.all([
        this.forum.getThread(slug),
        this.forum.listPosts(slug),
      ]);
      this.thread.set(t);
      this.posts.set(p);
      this.expandedMap.set(new Map());
    } catch {
      this.error.set(true);
      this.thread.set(null);
      this.posts.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
