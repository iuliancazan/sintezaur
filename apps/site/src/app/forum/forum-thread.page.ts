import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  SzEditorChange,
  SzEditorComponent,
  type SzEditorMentionItem,
} from '@sintezaur/ui';
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
  isPending: boolean;
}

interface ComposerState {
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
}

const COLLAPSE_THRESHOLD = 5;
const EDIT_WINDOW_MINUTES = 30;
const MIN_BODY_TEXT = 4;
const MOD_ROLES = new Set(['moderator', 'admin', 'superadmin']);

const EMPTY_COMPOSER: ComposerState = {
  bodyJson: {},
  bodyHtml: '',
  bodyText: '',
};

@Component({
  selector: 'app-forum-thread-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe, SzEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (thread(); as t) {
      <div class="shell">
        <nav class="ft-crumbs">
          <a routerLink="/forum">{{ 'forum.crumb_root' | t }}</a>
          <span class="sep">/</span>
          <a [routerLink]="['/forum', t.category.slug]">{{ t.category.name }}</a>
          <span class="sep">/</span>
          <span>{{ t.thread.title }}</span>
        </nav>

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
          <ng-container
            *ngTemplateOutlet="postTpl; context: { $implicit: p, numbering: 'OP', isOp: true }"
          />
        }

        <!-- REPLIES -->
        @if (groups().length === 0 && !loading()) {
          <p class="ft-empty">{{ 'forum.no_replies' | t }}</p>
        }

        <ol class="ft-replies">
          @for (g of groups(); track g.post.id) {
            <li>
              <ng-container
                *ngTemplateOutlet="postTpl; context: { $implicit: g.post, numbering: g.numbering, isPending: g.isPending }"
              />

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
                        <ng-container
                          *ngTemplateOutlet="postTpl; context: { $implicit: s, numbering: s.numbering, parentRef: s.parentRef }"
                        />
                      </li>
                    }
                  </ol>
                }
              }
            </li>
          }
        </ol>

        <!-- GENERAL REPLY (thread-wide) -->
        @if (canPostInThread()) {
          <section class="ft-general">
            @if (!generalOpen()) {
              <button type="button" class="ft-general__cta" (click)="openGeneral()">
                + {{ 'forum.compose.general_reply_cta' | t }}
              </button>
            } @else {
              <div class="ft-composer">
                <header class="ft-composer__head">
                  <span>{{ 'forum.compose.general_reply_title' | t }}</span>
                  <button type="button" (click)="cancelGeneral()">✕</button>
                </header>
                <sz-editor
                  [richMode]="true"
                  [maxLength]="4000"
                  [mentionSuggest]="mentionSuggest"
                  [placeholder]="i18n.t('forum.compose.reply_placeholder')"
                  (valueChange)="onGeneralChange($event)"
                />
                @if (generalError()) {
                  <p class="ft-composer__error">{{ generalError() }}</p>
                }
                <div class="ft-composer__actions">
                  <button type="button" class="ft-btn ft-btn--ghost" (click)="cancelGeneral()">
                    {{ 'forum.compose.cancel' | t }}
                  </button>
                  <button
                    type="button"
                    class="ft-btn ft-btn--primary"
                    [disabled]="!canSubmit(general()) || submitting()"
                    (click)="submitGeneral()"
                  >
                    @if (submitting()) {
                      {{ 'forum.compose.submitting' | t }}
                    } @else {
                      {{ 'forum.compose.send' | t }}
                    }
                  </button>
                </div>
              </div>
            }
          </section>
        } @else if (t.thread.lockedAt) {
          <p class="ft-empty">{{ 'forum.locked_notice' | t }}</p>
        } @else if (!auth.currentUser()) {
          <p class="ft-empty">
            <a routerLink="/login" [queryParams]="{ returnUrl: currentUrl }">
              {{ 'forum.login_to_reply' | t }}
            </a>
          </p>
        }

        @if (toast()) {
          <div class="ft-toast">{{ toast() }}</div>
        }
      </div>

      <!-- POST TEMPLATE -->
      <ng-template
        #postTpl
        let-p
        let-numbering="numbering"
        let-isOp="isOp"
        let-isPending="isPending"
        let-parentRef="parentRef"
      >
        <article
          class="ft-post"
          [class.ft-op]="isOp"
          [class.ft-sub]="!isOp && parentRef !== undefined && !numbering.startsWith('OP') && numbering.includes('.')"
          [class.is-hidden]="!!p.hiddenAt"
          [class.is-pending]="isPending"
        >
          <div class="ft-post__head">
            @if (!isOp) {
              <span class="ft-num">#{{ numbering }}</span>
            }
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
              @if (isPending) {
                <span class="ft-pending-badge">
                  {{ 'forum.pending_badge' | t }}
                </span>
              }
            </div>
          </div>

          @if (parentRef) {
            <div class="ft-parent-ref">
              {{
                'forum.in_reply_to' | t: {
                  username: parentRef.username ?? '?',
                  numbering: parentRef.numbering
                }
              }}
            </div>
          }

          @if (editingPost() === p.id) {
            <div class="ft-composer ft-composer--inline">
              <sz-editor
                [value]="editInitialHtml()"
                [richMode]="true"
                [maxLength]="4000"
                [mentionSuggest]="mentionSuggest"
                [placeholder]="i18n.t('forum.compose.reply_placeholder')"
                (valueChange)="onEditChange($event)"
              />
              @if (editError()) {
                <p class="ft-composer__error">{{ editError() }}</p>
              }
              <div class="ft-composer__actions">
                <button type="button" class="ft-btn ft-btn--ghost" (click)="cancelEdit()">
                  {{ 'forum.compose.cancel' | t }}
                </button>
                <button
                  type="button"
                  class="ft-btn ft-btn--primary"
                  [disabled]="!canSubmit(edit()) || submitting()"
                  (click)="submitEdit(p)"
                >
                  @if (submitting()) {
                    {{ 'forum.compose.submitting' | t }}
                  } @else {
                    {{ 'forum.compose.save_edit' | t }}
                  }
                </button>
              </div>
            </div>
          } @else if (p.hiddenAt) {
            <p class="ft-hidden">{{ 'forum.hidden_post' | t }}</p>
          } @else {
            <div class="ft-post__body" [innerHTML]="p.bodyHtml"></div>
          }

          @if (!p.hiddenAt && editingPost() !== p.id && !isPending) {
            <div class="ft-actions">
              @if (canPostInThread()) {
                <button type="button" class="ft-action" (click)="startReply(p)">
                  ↩ {{ 'forum.action.reply' | t }}
                </button>
              }
              <button type="button" class="ft-action ft-action--like" (click)="onLike(p)">
                👍 {{ 'forum.action.like' | t }} · {{ p.likeCount }}
              </button>
              @if (canEditPost(p)) {
                <button type="button" class="ft-action" (click)="startEdit(p)">
                  ✎ {{ 'forum.action.edit' | t }}
                </button>
              }
              @if (canDeletePost(p)) {
                <button type="button" class="ft-action ft-action--danger" (click)="deletePost(p)">
                  🗑 {{ 'forum.action.delete' | t }}
                </button>
              }
            </div>
          }

          @if (replyingTo() === p.id) {
            <div class="ft-composer ft-composer--inline">
              <header class="ft-composer__head">
                <span>
                  {{ 'forum.compose.reply_to' | t: { username: p.authorUsername ?? '?' } }}
                </span>
                <button type="button" (click)="cancelReply()">✕</button>
              </header>
              <sz-editor
                [richMode]="true"
                [maxLength]="4000"
                [mentionSuggest]="mentionSuggest"
                [placeholder]="i18n.t('forum.compose.reply_placeholder')"
                (valueChange)="onReplyChange($event)"
              />
              @if (replyError()) {
                <p class="ft-composer__error">{{ replyError() }}</p>
              }
              <div class="ft-composer__actions">
                <button type="button" class="ft-btn ft-btn--ghost" (click)="cancelReply()">
                  {{ 'forum.compose.cancel' | t }}
                </button>
                <button
                  type="button"
                  class="ft-btn ft-btn--primary"
                  [disabled]="!canSubmit(reply()) || submitting()"
                  (click)="submitReply(p)"
                >
                  @if (submitting()) {
                    {{ 'forum.compose.submitting' | t }}
                  } @else {
                    {{ 'forum.compose.send' | t }}
                  }
                </button>
              </div>
            </div>
          }
        </article>
      </ng-template>
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

      .ft-post {
        background: var(--bg-elev);
        border: var(--grid-line) solid var(--line);
        padding: 20px;
        margin: 0 0 14px;
      }
      .ft-op { border-left-width: 3px; border-left-color: var(--accent); }
      .ft-post.is-hidden { opacity: 0.55; }
      .ft-post.is-pending {
        border-color: #d4a017;
        background: color-mix(in oklab, #d4a017 8%, var(--bg-elev));
      }
      .ft-pending-badge {
        font-family: var(--font-mono);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 2px 6px;
        margin-left: 8px;
        background: #d4a017;
        color: var(--bg);
        border-radius: 2px;
      }

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
        align-items: baseline;
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
      .ft-post__body .sz-mention {
        color: var(--accent);
        background: color-mix(in oklab, var(--accent) 14%, transparent);
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: 500;
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
        flex-wrap: wrap;
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
      .ft-action--danger:hover { color: #e8665b; border-color: #e8665b; }

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
      .ft-empty a { color: var(--accent); }

      .ft-composer {
        margin-top: 14px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        padding: 12px;
      }
      .ft-composer--inline { margin-top: 14px; }
      .ft-composer__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
        padding: 4px 6px 10px;
      }
      .ft-composer__head button {
        background: transparent;
        border: 0;
        color: var(--fg-muted);
        font-size: 14px;
        cursor: pointer;
      }
      .ft-composer__head button:hover { color: var(--accent); }
      .ft-composer__error {
        font-family: var(--font-mono);
        font-size: 11px;
        color: #e8665b;
        padding: 8px 10px;
        background: color-mix(in oklab, #e8665b 12%, var(--bg));
        border-left: 3px solid #e8665b;
        margin: 10px 0 0;
      }
      .ft-composer__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 10px;
      }
      .ft-btn {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 8px 14px;
        border: 1px solid var(--line-strong);
        background: transparent;
        color: var(--fg-muted);
        cursor: pointer;
      }
      .ft-btn:hover { color: var(--fg); border-color: var(--accent); }
      .ft-btn--primary {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .ft-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .ft-btn--primary:hover:not(:disabled) { filter: brightness(1.1); }

      .ft-general { margin-top: 24px; }
      .ft-general__cta {
        width: 100%;
        padding: 14px;
        background: var(--bg-elev);
        border: 1px dashed var(--line-strong);
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        cursor: pointer;
      }
      .ft-general__cta:hover {
        background: color-mix(in oklab, var(--bg-elev) 80%, var(--accent) 20%);
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
        .ft-post { padding: 14px; }
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
  readonly currentUrl = this.router.url;

  readonly thread = signal<ThreadDetail | null>(null);
  readonly posts = signal<PostsResponse | null>(null);
  readonly pendingPosts = signal<PostListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly toast = signal<string | null>(null);

  readonly expandedMap = signal<Map<string, boolean>>(new Map());

  readonly replyingTo = signal<string | null>(null);
  readonly editingPost = signal<string | null>(null);
  readonly generalOpen = signal(false);
  readonly submitting = signal(false);

  readonly reply = signal<ComposerState>(EMPTY_COMPOSER);
  readonly edit = signal<ComposerState>(EMPTY_COMPOSER);
  readonly general = signal<ComposerState>(EMPTY_COMPOSER);

  readonly replyError = signal<string | null>(null);
  readonly editError = signal<string | null>(null);
  readonly generalError = signal<string | null>(null);

  readonly editInitialHtml = signal<string>('');

  readonly mentionSuggest = async (
    q: string,
  ): Promise<SzEditorMentionItem[]> => {
    try {
      return await this.forum.searchMentions(q);
    } catch {
      return [];
    }
  };

  readonly op = computed(() => this.posts()?.op ?? null);

  readonly groups = computed<TopLevelGroupVM[]>(() => {
    const data = this.posts();
    if (!data) return [];

    const allReplies = [...data.replies, ...this.pendingPosts()];

    const topLevels = allReplies
      .filter((p) => p.subSeq === null && p.topLevelSeq > 0)
      .sort((a, b) => a.topLevelSeq - b.topLevelSeq);

    const subsByTop = new Map<number, PostListItem[]>();
    for (const p of allReplies) {
      if (p.subSeq === null) continue;
      const arr = subsByTop.get(p.topLevelSeq) ?? [];
      arr.push(p);
      subsByTop.set(p.topLevelSeq, arr);
    }

    const postById = new Map<string, PostListItem>();
    for (const p of allReplies) postById.set(p.id, p);

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
        isPending: post.status === 'pending',
      };
    });
  });

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const slug = p.get('slug');
      if (slug) void this.fetch(slug);
    });
  }

  /* ============ expand/collapse ============ */

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

  /* ============ guards ============ */

  isMod(): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    return u.roles.some((r) => MOD_ROLES.has(r));
  }

  canPostInThread(): boolean {
    const t = this.thread();
    return !!t && !t.thread.lockedAt && !!this.auth.currentUser();
  }

  canEditPost(p: PostListItem): boolean {
    const u = this.auth.currentUser();
    if (!u) return false;
    if (this.isMod()) return true;
    if (p.authorId !== u.id) return false;
    const ageMs = Date.now() - new Date(p.createdAt).getTime();
    return ageMs <= EDIT_WINDOW_MINUTES * 60 * 1000;
  }

  canDeletePost(p: PostListItem): boolean {
    const u = this.auth.currentUser();
    if (!u || !p.authorId) return false;
    if (p.topLevelSeq === 0) return false; // OP delete folosește thread delete (M5-G)
    return p.authorId === u.id;
  }

  canSubmit(s: ComposerState): boolean {
    return s.bodyText.trim().length >= MIN_BODY_TEXT;
  }

  /* ============ reply (inline) ============ */

  startReply(p: PostListItem): void {
    if (!this.auth.currentUser()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.editingPost.set(null);
    this.replyingTo.set(p.id);
    this.reply.set(EMPTY_COMPOSER);
    this.replyError.set(null);
  }

  cancelReply(): void {
    this.replyingTo.set(null);
    this.reply.set(EMPTY_COMPOSER);
    this.replyError.set(null);
  }

  onReplyChange(c: SzEditorChange): void {
    this.reply.set({
      bodyJson: c.json as Record<string, unknown>,
      bodyHtml: c.html,
      bodyText: c.text,
    });
  }

  async submitReply(p: PostListItem): Promise<void> {
    if (!this.canSubmit(this.reply()) || this.submitting()) return;
    const t = this.thread();
    if (!t) return;
    this.submitting.set(true);
    this.replyError.set(null);
    try {
      const newPost = await this.forum.createReply(t.thread.id, {
        parentPostId: p.id,
        body: this.reply().bodyJson,
        bodyHtml: this.reply().bodyHtml,
      });
      this.applyNewPost(newPost);
      this.cancelReply();
    } catch (err) {
      this.replyError.set(this.errorMessage(err, 'forum.compose.submit_error'));
    } finally {
      this.submitting.set(false);
    }
  }

  /* ============ general reply ============ */

  openGeneral(): void {
    if (!this.auth.currentUser()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.generalOpen.set(true);
    this.general.set(EMPTY_COMPOSER);
    this.generalError.set(null);
  }

  cancelGeneral(): void {
    this.generalOpen.set(false);
    this.general.set(EMPTY_COMPOSER);
    this.generalError.set(null);
  }

  onGeneralChange(c: SzEditorChange): void {
    this.general.set({
      bodyJson: c.json as Record<string, unknown>,
      bodyHtml: c.html,
      bodyText: c.text,
    });
  }

  async submitGeneral(): Promise<void> {
    if (!this.canSubmit(this.general()) || this.submitting()) return;
    const t = this.thread();
    if (!t) return;
    this.submitting.set(true);
    this.generalError.set(null);
    try {
      const newPost = await this.forum.createReply(t.thread.id, {
        body: this.general().bodyJson,
        bodyHtml: this.general().bodyHtml,
      });
      this.applyNewPost(newPost);
      this.cancelGeneral();
    } catch (err) {
      this.generalError.set(
        this.errorMessage(err, 'forum.compose.submit_error'),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /* ============ edit ============ */

  startEdit(p: PostListItem): void {
    this.replyingTo.set(null);
    this.editingPost.set(p.id);
    this.edit.set({
      bodyJson: (p.body ?? {}) as Record<string, unknown>,
      bodyHtml: p.bodyHtml ?? '',
      bodyText: this.stripHtml(p.bodyHtml ?? ''),
    });
    this.editInitialHtml.set(p.bodyHtml ?? '');
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editingPost.set(null);
    this.edit.set(EMPTY_COMPOSER);
    this.editError.set(null);
  }

  onEditChange(c: SzEditorChange): void {
    this.edit.set({
      bodyJson: c.json as Record<string, unknown>,
      bodyHtml: c.html,
      bodyText: c.text,
    });
  }

  async submitEdit(p: PostListItem): Promise<void> {
    if (!this.canSubmit(this.edit()) || this.submitting()) return;
    this.submitting.set(true);
    this.editError.set(null);
    try {
      const updated = await this.forum.updatePost(p.id, {
        body: this.edit().bodyJson,
        bodyHtml: this.edit().bodyHtml,
      });
      this.replacePost(updated);
      this.cancelEdit();
      this.flashToast(this.i18n.t('forum.edited_ok'));
    } catch (err) {
      this.editError.set(this.errorMessage(err, 'forum.compose.submit_error'));
    } finally {
      this.submitting.set(false);
    }
  }

  /* ============ delete ============ */

  async deletePost(p: PostListItem): Promise<void> {
    if (!confirm(this.i18n.t('forum.confirm_delete'))) return;
    try {
      await this.forum.deletePost(p.id);
      this.removePost(p.id);
      this.flashToast(this.i18n.t('forum.deleted_ok'));
    } catch (err) {
      this.flashToast(this.errorMessage(err, 'forum.compose.submit_error'));
    }
  }

  /* ============ like (rămâne stub până la M5-E) ============ */

  onLike(_p: PostListItem): void {
    if (!this.auth.currentUser()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.flashToast(this.i18n.t('forum.coming_soon'));
  }

  /* ============ helpers ============ */

  formatDate(iso: string | Date): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').trim();
  }

  private applyNewPost(p: PostListItem): void {
    if (p.status === 'pending') {
      this.pendingPosts.set([...this.pendingPosts(), p]);
      this.flashToast(this.i18n.t('forum.pending_toast'));
      return;
    }
    const cur = this.posts();
    if (!cur) return;
    this.posts.set({ ...cur, replies: [...cur.replies, p] });
    this.flashToast(this.i18n.t('forum.posted_ok'));
  }

  private replacePost(p: PostListItem): void {
    const cur = this.posts();
    if (!cur) return;
    if (cur.op && cur.op.id === p.id) {
      this.posts.set({ ...cur, op: p });
    } else {
      this.posts.set({
        ...cur,
        replies: cur.replies.map((r) => (r.id === p.id ? p : r)),
      });
    }
  }

  private removePost(id: string): void {
    const cur = this.posts();
    if (!cur) return;
    this.posts.set({
      ...cur,
      replies: cur.replies.filter((r) => r.id !== id),
    });
  }

  private errorMessage(err: unknown, fallbackKey: string): string {
    const m = (err as { error?: { message?: string } })?.error?.message;
    if (typeof m === 'string') return m;
    return this.i18n.t(fallbackKey);
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
      this.pendingPosts.set([]);
    } catch {
      this.error.set(true);
      this.thread.set(null);
      this.posts.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
