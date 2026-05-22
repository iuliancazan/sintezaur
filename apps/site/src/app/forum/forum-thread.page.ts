import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ToastService } from '../ui/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  SzEditorChange,
  SzEditorComponent,
  type SzEditorMentionItem,
} from '@sintezaur/ui';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { clampDescription, stripHtml } from '../seo/seo.utils';
import { TPipe } from '../i18n/t.pipe';
import {
  ForumService,
  PostListItem,
  PostsResponse,
  SubscriptionLevel,
  ThreadDetail,
} from './forum.service';
import {
  PostActionsMenuComponent,
  type PostActionKind,
  type ThreadActionKind,
} from './post-actions-menu.component';
import {
  ReportDialogComponent,
  type ReportSubmit,
} from './report-dialog.component';
import { SubscribeBellComponent } from './subscribe-bell.component';
import {
  AttachmentBoxComponent,
  AttachmentListComponent,
  AttachmentsService,
  type AttachmentItem,
} from '../storage';

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
  imports: [
    CommonModule,
    RouterLink,
    TPipe,
    SzEditorComponent,
    SubscribeBellComponent,
    PostActionsMenuComponent,
    ReportDialogComponent,
    AttachmentListComponent,
    AttachmentBoxComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (thread(); as t) {
      <div class="shell">
        <!-- BREADCRUMB -->
        <nav class="td-crumb" aria-label="Breadcrumb">
          <a [routerLink]="['/forum', t.category.slug]" class="td-crumb__back">
            <svg width="14" height="14" aria-hidden="true"><use href="#i-back"/></svg>
            {{ t.category.name }}
          </a>
          <span class="sep">/</span>
          <a routerLink="/forum">{{ 'forum.crumb_root' | t }}</a>
          <span class="sep">/</span>
          <span class="cur">{{ t.thread.title }}</span>
        </nav>

        <!-- STICKY THREAD BAR -->
        <div class="ft-sticky">
          <a
            class="ft-sticky__back"
            [routerLink]="['/forum', t.category.slug]"
            [attr.aria-label]="'forum.back_to_category' | t"
          >
            <svg aria-hidden="true"><use href="#i-back"/></svg>
          </a>
          <div class="ft-sticky__title">
            {{ t.thread.title }}
            @if (t.thread.lockedAt) {
              <span class="ft-lock" [title]="'forum.locked' | t">🔒</span>
            }
          </div>
          <span class="ft-sticky__cat">{{ t.category.name }}</span>
          <span class="ft-sticky__progress">
            {{ visiblePostIndex() }} / {{ totalPostsCount() }}
          </span>
        </div>

        @if (t.sourceLink; as src) {
          <div class="ft-source">
            <span class="ft-source__label">
              {{
                (src.type === 'article'
                  ? 'forum.source.article'
                  : 'forum.source.gear'
                ) | t
              }}:
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

        <div class="ft-main">

          <!-- LEFT: posts column -->
          <div>

            <!-- OP POST -->
            @if (op(); as p) {
              <article class="ft-op crosses" [id]="'post-' + (p.topLevelSeq || 1)">
                <span class="crosses-tl"></span><span class="crosses-tr"></span>

                <header class="ft-op__head">
                  <div class="ft-op__avatar" [style.background]="avatarBg(p.authorUsername)">
                    {{ initialsFor(p.authorFullName, p.authorUsername) }}
                  </div>
                  <div class="ft-op__author">
                    <div class="nm">
                      {{ p.authorFullName ?? p.authorUsername ?? ('forum.deleted_user' | t) }}
                      @if (p.authorUsername) {
                        <span class="at">&#64;{{ p.authorUsername }}</span>
                      }
                      @if (trustTier(p.authorCreatedAt, p.authorApprovedPostCount); as tier) {
                        <span class="fr-trust is-{{ tier.kind }}">{{ tier.label }}</span>
                      }
                    </div>
                    <div class="meta">
                      {{ 'forum.post_number_label' | t }}
                      <span class="acc">#1</span>
                      <span class="sep">·</span>
                      <time>{{ formatDate(p.createdAt) }}</time>
                      @if (p.editedAt) {
                        <span class="sep">·</span>
                        <span class="edited">{{ 'forum.edited' | t }}</span>
                      }
                    </div>
                  </div>
                  @if (auth.currentUser()) {
                    <app-forum-subscribe-bell
                      [level]="subLevel()"
                      [busy]="subBusy()"
                      (levelChange)="onSubChange($event)"
                    />
                  }
                </header>

                <div class="ft-op__body">
                  <h1 class="ft-op__title">{{ t.thread.title }}</h1>

                  @if ((t.gearTagged && t.gearTagged.length > 0) || (t.thread.tags && t.thread.tags.length > 0)) {
                    <div class="ft-op__tags">
                      @for (g of t.gearTagged; track g.id) {
                        <a class="fr-gear-chip" [routerLink]="['/tezaur', g.slug]">
                          <span class="fr-gear-chip__photo"></span>
                          {{ g.brand }} {{ g.model }}
                        </a>
                      }
                      @for (tag of t.thread.tags; track tag) {
                        <a
                          class="fr-tag"
                          [routerLink]="['/forum/cautare']"
                          [queryParams]="{ tag: tag }"
                        >{{ tag }}</a>
                      }
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
                    <div class="ft-hidden">
                      <span>{{ 'forum.hidden_post' | t }}</span>
                    </div>
                  } @else {
                    <div class="ft-prose" [innerHTML]="p.bodyHtml"></div>
                    @if (attachmentsByPost().get(p.id); as atts) {
                      @if (atts.length > 0) {
                        <app-attachment-list [items]="atts" />
                      }
                    }
                    @if (isOwnPost(p) && editingPost() !== p.id) {
                      <app-attachment-box
                        [target]="{ kind: 'forum-post', postId: p.id }"
                        [initial]="attachmentsByPost().get(p.id) ?? []"
                        (changed)="onAttachmentsChanged(p.id, $event)"
                      />
                    }
                  }
                </div>

                <div class="ft-engage">
                  <button
                    type="button"
                    class="ft-engage__btn"
                    [class.is-on]="likedByMe().has(p.id)"
                    (click)="onLike(p)"
                  >
                    <svg aria-hidden="true"><use href="#i-heart"/></svg>
                    <span class="num">{{ p.likeCount }}</span>
                    <span>{{ 'forum.engage.useful' | t }}</span>
                  </button>
                  <button type="button" class="ft-engage__btn" (click)="scrollToReplies()">
                    <svg aria-hidden="true"><use href="#i-reply"/></svg>
                    <span class="num">{{ totalRepliesCount() }}</span>
                    <span>{{ 'forum.engage.replies' | t }}</span>
                  </button>
                  <button type="button" class="ft-engage__btn" (click)="sharePost(p, true)">
                    <svg aria-hidden="true"><use href="#i-share"/></svg>
                    <span>{{ 'forum.engage.share' | t }}</span>
                  </button>
                  @if (canEditPost(p)) {
                    <button type="button" class="ft-engage__btn" (click)="startEdit(p)">
                      <svg aria-hidden="true"><use href="#i-quote"/></svg>
                      <span>{{ 'forum.action.edit' | t }}</span>
                    </button>
                  }
                  <div class="ft-engage__spacer"></div>
                  @if (auth.currentUser()) {
                    <app-post-actions-menu
                      kind="thread"
                      [canReport]="true"
                      [isMod]="isMod()"
                      [isOwn]="isOwnThread(t)"
                      [threadIsLocked]="!!t.thread.lockedAt"
                      [threadIsPinned]="t.thread.pinPosition !== null"
                      (action)="onThreadAction($any($event), t)"
                    />
                  }
                </div>
              </article>
            }

            <!-- REPLIES HEADER -->
            <header class="ft-replies-head" id="ft-replies-anchor">
              <h2>
                {{ 'forum.replies_label' | t }}
                <span class="num">/ {{ totalRepliesCount() }}</span>
              </h2>
              <span class="sub">{{ 'forum.replies_sub' | t }}</span>
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

            @if (groups().length === 0 && !loading()) {
              <p class="ft-empty">{{ 'forum.no_replies' | t }}</p>
            }

            <div class="ft-replies">
              @for (g of groups(); track g.post.id) {
                <ng-container
                  *ngTemplateOutlet="postTpl; context: { $implicit: g.post, numbering: g.numbering, isPending: g.isPending }"
                />

                @if (g.children.length > 0) {
                  @if (!g.expanded) {
                    <button
                      type="button"
                      class="ft-children-toggle"
                      (click)="toggleGroup(g.post.id)"
                    >
                      <span class="arrow">▸</span>
                      <span><b>{{ g.children.length }}</b> {{ 'forum.nested_replies' | t }}</span>
                      <span class="ft-children-toggle__preview">
                        {{ childrenPreview(g.children) }}
                      </span>
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="ft-children-toggle is-open"
                      (click)="toggleGroup(g.post.id)"
                    >
                      <span class="arrow">▾</span>
                      <span>{{ 'forum.hide_replies' | t }}</span>
                    </button>
                    <div class="ft-children is-open">
                      <div class="ft-children__inner">
                        @for (s of g.children; track s.id) {
                          <ng-container
                            *ngTemplateOutlet="postTpl; context: { $implicit: s, numbering: s.numbering, parentRef: s.parentRef }"
                          />
                        }
                      </div>
                    </div>
                  }
                }
              }
            </div>

            <!-- STICKY REPLY BOX -->
            @if (canPostInThread()) {
              @if (!generalOpen()) {
                <div class="ft-replybox">
                  <div
                    class="ft-replybox__avatar"
                    [style.background]="avatarBg(currentUserName())"
                  >
                    {{ currentUserInitials() }}
                  </div>
                  <input
                    class="ft-replybox__input"
                    type="text"
                    [placeholder]="i18n.t('forum.compose.replybox_placeholder')"
                    (focus)="openGeneral()"
                    readonly
                  />
                  <button type="button" class="ft-replybox__cta" (click)="openGeneral()">
                    {{ 'forum.compose.send' | t }}
                  </button>
                </div>
              } @else {
                <div class="ft-composer">
                  <header class="ft-composer__head">
                    <span>{{ 'forum.compose.general_reply_title' | t }}</span>
                    <button type="button" (click)="cancelGeneral()">✕</button>
                  </header>
                  <sz-editor
                    [value]="general().bodyHtml"
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
            } @else if (t.thread.lockedAt) {
              <p class="ft-empty">{{ 'forum.locked_notice' | t }}</p>
            } @else if (!auth.currentUser()) {
              <p class="ft-empty">
                <a routerLink="/login" [queryParams]="{ returnUrl: currentUrl }">
                  {{ 'forum.login_to_reply' | t }}
                </a>
              </p>
            }

          </div>

          <!-- RIGHT: sidebar -->
          <aside class="ft-side">
            @if (t.gearTagged && t.gearTagged.length > 0) {
              <div class="ft-side__block">
                <header class="ft-side__head">{{ 'forum.side.gear' | t }}</header>
                @for (g of t.gearTagged; track g.id) {
                  <a class="ft-side-gear" [routerLink]="['/tezaur', g.slug]">
                    <div class="ft-side-gear__media"></div>
                    <div>
                      <div class="ft-side-gear__brand">
                        {{ g.brand }}@if (g.yearReleased) { · {{ g.yearReleased }} }
                      </div>
                      <div class="ft-side-gear__model">{{ g.model }}</div>
                    </div>
                  </a>
                }
              </div>
            }

            @if (peopleActive().length > 0) {
              <div class="ft-side__block">
                <header class="ft-side__head">{{ 'forum.side.people' | t }}</header>
                <div class="ft-side__body">
                  <div class="ft-people">
                    @for (per of peopleActive(); track per.username) {
                      <div class="ft-people__row">
                        <span
                          class="avatar"
                          [style.background]="avatarBg(per.username)"
                        >{{ per.initials }}</span>
                        <div>
                          <div class="nm">{{ per.username }}</div>
                          <div class="at">
                            @if (per.isOp) { OP · }&#64;{{ per.username }}
                          </div>
                        </div>
                        <span class="ct">{{ per.postCount }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </aside>
        </div>

        @if (toast()) {
          <div class="ft-toast">{{ toast() }}</div>
        }

        <app-report-dialog
          [open]="!!dialogState()"
          [mode]="dialogState()?.mode ?? 'report'"
          [busy]="dialogBusy()"
          [error]="dialogError()"
          (submitReport)="onDialogSubmit($event)"
          (cancel)="closeDialog()"
        />
      </div>

      <!-- floating jump-to-newest -->
      @if (showJump()) {
        <button class="ft-jump is-visible" type="button" (click)="scrollToBottom()">
          <svg width="12" height="12" aria-hidden="true"><use href="#i-arrow-down"/></svg>
          {{ 'forum.jump_to_newest' | t: { n: totalPostsCount() } }}
        </button>
      }

      <!-- POST TEMPLATE (V08 .ft-post with rail + main) -->
      <ng-template
        #postTpl
        let-p
        let-numbering="numbering"
        let-isPending="isPending"
        let-parentRef="parentRef"
      >
        <article
          class="ft-post"
          [class.is-hidden]="!!p.hiddenAt"
          [class.is-pending]="isPending"
          [id]="'post-' + numbering"
        >
          <div class="ft-post__rail">
            <div
              class="ft-post__avatar"
              [style.background]="avatarBg(p.authorUsername)"
            >{{ initialsFor(p.authorFullName, p.authorUsername) }}</div>
            <span class="ft-post__num">#{{ numbering }}</span>
          </div>

          <div class="ft-post__main">

            @if (parentRef) {
              <a
                class="ft-quote-ref"
                (click)="toggleParentPreview(p.id); $event.preventDefault()"
                href="#"
              >
                <span>
                  {{ 'forum.in_reply_to_short' | t }}
                  <span class="at">&#64;{{ parentRef.username ?? '?' }}</span>
                  — {{ 'forum.post_number_label' | t }}
                  <span class="pn">#{{ parentRef.numbering }}</span>
                </span>
                <span class="pv">
                  @if (parentPreviewOpen().has(p.id)) {
                    {{ 'forum.hide_preview' | t }}
                  } @else {
                    {{ 'forum.see_preview' | t }}
                  }
                </span>
              </a>
              @if (parentPreviewOpen().has(p.id)) {
                <div class="ft-quote-preview is-open">
                  <div class="ft-quote-preview__inner">
                    <span class="by">
                      &#64;{{ parentRef.username ?? '?' }}
                      {{ 'forum.wrote_in' | t }}
                      #{{ parentRef.numbering }}:
                    </span>
                    <span>{{ parentPreviewText(p.parentPostId) }}</span>
                  </div>
                </div>
              }
            }

            <header class="ft-post__head">
              @if (p.authorUsername) {
                <span class="nm">
                  {{ p.authorFullName ?? p.authorUsername }}
                </span>
                <span class="at">&#64;{{ p.authorUsername }}</span>
              } @else {
                <span class="nm">{{ 'forum.deleted_user' | t }}</span>
              }
              @if (trustTier(p.authorCreatedAt, p.authorApprovedPostCount); as tier) {
                <span class="fr-trust is-{{ tier.kind }}">{{ tier.label }}</span>
              }
              <span class="time">
                {{ formatDate(p.createdAt) }}
                @if (p.editedAt) {
                  <span class="edited">{{ 'forum.edited' | t }}</span>
                }
                @if (isPending) {
                  <span class="ft-pending-badge">
                    {{ 'forum.pending_badge' | t }}
                  </span>
                }
              </span>
            </header>

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
              <div class="ft-hidden">
                <span>{{ 'forum.hidden_post' | t }}</span>
              </div>
            } @else {
              <div class="ft-prose" [innerHTML]="p.bodyHtml"></div>
              @if (attachmentsByPost().get(p.id); as atts) {
                @if (atts.length > 0) {
                  <app-attachment-list [items]="atts" />
                }
              }
            }

            @if (!p.hiddenAt && editingPost() !== p.id && !isPending) {
              <div class="ft-actions">
                <button
                  type="button"
                  class="ft-actions__btn"
                  [class.is-on]="likedByMe().has(p.id)"
                  (click)="onLike(p)"
                >
                  <svg aria-hidden="true"><use href="#i-heart"/></svg>
                  <span class="ft-actions__count">{{ p.likeCount }}</span>
                  <span>{{ 'forum.action.like' | t }}</span>
                </button>
                @if (canPostInThread()) {
                  <button type="button" class="ft-actions__btn" (click)="startReply(p)">
                    <svg aria-hidden="true"><use href="#i-reply"/></svg>
                    <span>{{ 'forum.action.reply' | t }}</span>
                  </button>
                  <button type="button" class="ft-actions__btn" (click)="quotePost(p)">
                    <svg aria-hidden="true"><use href="#i-quote"/></svg>
                    <span>{{ 'forum.action.quote' | t }}</span>
                  </button>
                }
                <button type="button" class="ft-actions__btn" (click)="sharePost(p)">
                  <svg aria-hidden="true"><use href="#i-share"/></svg>
                  <span>{{ 'forum.action.share' | t }}</span>
                </button>
                @if (canEditPost(p)) {
                  <button type="button" class="ft-actions__btn" (click)="startEdit(p)">
                    <span>{{ 'forum.action.edit' | t }}</span>
                  </button>
                }
                @if (canDeletePost(p)) {
                  <button type="button" class="ft-actions__btn ft-actions__btn--danger" (click)="deletePost(p)">
                    <span>{{ 'forum.action.delete' | t }}</span>
                  </button>
                }
                @if (auth.currentUser()) {
                  <app-post-actions-menu
                    style="margin-left:auto"
                    kind="post"
                    [canReport]="true"
                    [isMod]="isMod()"
                    [isOwn]="isOwnPost(p)"
                    [postIsHidden]="!!p.hiddenAt"
                    [postIsPending]="p.status === 'pending'"
                    (action)="onPostAction($any($event), p)"
                  />
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
                  [value]="reply().bodyHtml"
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

            @if (isOwnPost(p) && editingPost() !== p.id && !p.hiddenAt) {
              <app-attachment-box
                [target]="{ kind: 'forum-post', postId: p.id }"
                [initial]="attachmentsByPost().get(p.id) ?? []"
                (changed)="onAttachmentsChanged(p.id, $event)"
              />
            }
          </div>
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

      /* Most layout + chrome lives in the global v05-forum.css (.ft-*,
         .fr-*) and v05.css (.td-crumb). This block only holds page-local
         rules: states (pending / hidden), the inline composer that isn't
         in the V08 design, the toast, and a few mobile tweaks. */

      .ft-empty {
        padding: 40px 0;
        text-align: center;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .ft-empty a { color: var(--accent); text-decoration: none; }

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

      .ft-lock {
        font-size: 0.7em;
        margin-left: 6px;
      }

      .ft-replies-head .ft-master {
        display: inline-flex;
        gap: 6px;
        margin-left: auto;
      }
      .ft-replies-head .ft-master button {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 5px 10px;
        background: transparent;
        border: 1px solid var(--line-strong);
        color: var(--fg-muted);
        cursor: pointer;
      }
      .ft-replies-head .ft-master button:hover {
        color: var(--accent);
        border-color: var(--accent);
      }

      /* States the global stylesheet doesn't ship */
      .ft-post.is-pending,
      .ft-op.is-pending {
        opacity: 0.7;
        border-style: dashed;
      }
      .ft-post.is-hidden {
        opacity: 0.5;
      }
      .ft-pending-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        margin-left: 8px;
        background: color-mix(in oklab, oklch(0.7 0.16 75) 12%, var(--bg));
        border: 1px solid oklch(0.7 0.16 75);
        color: oklch(0.7 0.16 75);
        font-family: var(--font-mono);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .ft-post__head .time .edited,
      .ft-op__head .meta .edited {
        margin-left: 6px;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        text-transform: lowercase;
      }

      /* Inline composer (reply + edit inside .ft-post / .ft-op) — not in
         the V08 static design (it shows a sticky bottom box only). */
      .ft-composer {
        margin: 14px 0;
        padding: 14px;
        background: var(--bg);
        border: 1px solid var(--line);
      }
      .ft-composer--inline {
        margin: 12px 0 4px;
      }
      .ft-composer__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
        margin-bottom: 10px;
      }
      .ft-composer__head button {
        background: transparent;
        border: none;
        color: var(--fg-muted);
        font-size: 14px;
        cursor: pointer;
        padding: 2px 6px;
      }
      .ft-composer__head button:hover { color: var(--accent); }
      .ft-composer__error {
        margin: 8px 0 0;
        padding: 8px 12px;
        background: color-mix(in oklab, #c0392b 12%, var(--bg));
        border: 1px solid #c0392b;
        color: #c0392b;
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .ft-composer__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 10px;
      }
      .ft-btn {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 8px 14px;
        cursor: pointer;
        border: 1px solid var(--line-strong);
        background: transparent;
        color: var(--fg);
      }
      .ft-btn:hover:not(:disabled) {
        color: var(--accent);
        border-color: var(--accent);
      }
      .ft-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .ft-btn--primary {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .ft-btn--primary:hover:not(:disabled) {
        filter: brightness(1.08);
        color: var(--accent-fg);
      }
      .ft-btn--ghost {
        background: transparent;
      }

      .ft-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        background: var(--bg-card);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 12px;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      /* Danger variant for delete actions — global v05-forum styles
         the base .ft-actions__btn; we layer the destructive tone. */
      .ft-actions__btn--danger:hover {
        color: oklch(0.7 0.16 28);
        border-color: oklch(0.7 0.16 28);
      }

      /* The sub-pill is the V08 subscribe widget; we still use the
         existing SubscribeBellComponent (its own template + popover).
         Squash it into the OP head row so it sits where .fr-sub-pill
         would sit in the static design. */
      .ft-op__head app-forum-subscribe-bell {
        align-self: flex-start;
        margin-left: auto;
      }

      /* Children-toggle hint text (preview of nested replies). */
      .ft-children-toggle__preview {
        margin-left: auto;
        color: var(--fg-subtle);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: none;
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media (max-width: 720px) {
        .ft-main { grid-template-columns: 1fr; }
        .ft-side { display: none; }
        .ft-composer { padding: 10px; }
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
  private readonly seo = inject(SeoService);
  private readonly attachments = inject(AttachmentsService);

  /** Attachments indexed by `postId` for O(1) lookups in the post template. */
  readonly attachmentsByPost = signal<Map<string, AttachmentItem[]>>(new Map());

  /** Set of post IDs whose parent-quote preview is currently expanded. */
  readonly parentPreviewOpen = signal<Set<string>>(new Set());

  /** Tracks the vertical scroll position (updated by `@HostListener`). Drives
   *  the sticky bar progress counter and the floating jump-to-newest button. */
  readonly scrollY = signal(0);

  readonly COLLAPSE_THRESHOLD = COLLAPSE_THRESHOLD;
  readonly currentUrl = this.router.url;

  private readonly toastSvc = inject(ToastService);

  readonly thread = signal<ThreadDetail | null>(null);
  readonly posts = signal<PostsResponse | null>(null);
  readonly pendingPosts = signal<PostListItem[]>([]);
  readonly likedByMe = signal<Set<string>>(new Set());
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly toast = signal<string | null>(null);

  readonly subLevel = signal<SubscriptionLevel | null>(null);
  readonly subBusy = signal(false);

  readonly dialogState = signal<{
    mode: 'report' | 'hide';
    targetType: 'forum_post' | 'forum_thread';
    targetId: string;
  } | null>(null);
  readonly dialogBusy = signal(false);
  readonly dialogError = signal<string | null>(null);

  readonly expandedMap = signal<Map<string, boolean>>(new Map());

  readonly replyingTo = signal<string | null>(null);
  readonly editingPost = signal<string | null>(null);
  readonly generalOpen = signal(false);
  readonly submitting = signal(false);

  readonly reply = signal<ComposerState>(EMPTY_COMPOSER);
  readonly edit = signal<ComposerState>(EMPTY_COMPOSER);
  readonly general = signal<ComposerState>(EMPTY_COMPOSER);

  /** Anti-spam time-on-form timestamps (set when each composer opens). */
  private replyStartedAt = 0;
  private generalStartedAt = 0;
  private dialogStartedAt = 0;

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
    this.replyStartedAt = Date.now();
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
        hp: '',
        formStartedAt: this.replyStartedAt,
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
    this.generalStartedAt = Date.now();
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
        hp: '',
        formStartedAt: this.generalStartedAt,
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

  /* ============ like ============ */

  async onLike(p: PostListItem): Promise<void> {
    if (!this.auth.currentUser()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    const currentlyLiked = this.likedByMe().has(p.id);
    // Optimistic flip.
    this.applyLikeOptimistic(p.id, !currentlyLiked);
    try {
      const res = await this.forum.toggleLike(p.id);
      this.applyLikeAuthoritative(p.id, res.liked, res.likeCount);
    } catch (err) {
      // Rollback.
      this.applyLikeOptimistic(p.id, currentlyLiked);
      this.flashToast(this.errorMessage(err, 'forum.compose.submit_error'));
    }
  }

  private applyLikeOptimistic(postId: string, liked: boolean): void {
    const next = new Set(this.likedByMe());
    const delta = liked && !next.has(postId) ? 1 : !liked && next.has(postId) ? -1 : 0;
    if (liked) next.add(postId);
    else next.delete(postId);
    this.likedByMe.set(next);
    if (delta !== 0) this.bumpLikeCount(postId, delta);
  }

  private applyLikeAuthoritative(
    postId: string,
    liked: boolean,
    count: number,
  ): void {
    const next = new Set(this.likedByMe());
    if (liked) next.add(postId);
    else next.delete(postId);
    this.likedByMe.set(next);
    this.setLikeCount(postId, count);
  }

  private bumpLikeCount(postId: string, delta: number): void {
    const cur = this.posts();
    if (!cur) return;
    const apply = (p: PostListItem): PostListItem =>
      p.id === postId
        ? { ...p, likeCount: Math.max(0, p.likeCount + delta) }
        : p;
    this.posts.set({
      ...cur,
      op: cur.op ? apply(cur.op) : cur.op,
      replies: cur.replies.map(apply),
    });
  }

  private setLikeCount(postId: string, count: number): void {
    const cur = this.posts();
    if (!cur) return;
    const apply = (p: PostListItem): PostListItem =>
      p.id === postId ? { ...p, likeCount: count } : p;
    this.posts.set({
      ...cur,
      op: cur.op ? apply(cur.op) : cur.op,
      replies: cur.replies.map(apply),
    });
  }

  /* ============ kebab actions (M5-G) ============ */

  isOwnPost(p: PostListItem): boolean {
    const u = this.auth.currentUser();
    return !!u && p.authorId === u.id;
  }

  isOwnThread(t: ThreadDetail): boolean {
    const u = this.auth.currentUser();
    return !!u && t.thread.authorId === u.id;
  }

  onPostAction(action: PostActionKind, p: PostListItem): void {
    if (action === 'report') {
      this.openDialog('report', 'forum_post', p.id);
      return;
    }
    if (action === 'hide') {
      this.openDialog('hide', 'forum_post', p.id);
      return;
    }
    if (action === 'unhide') {
      void this.runMod(() => this.forum.modUnhidePost(p.id), () =>
        this.replacePost({ ...p, hiddenAt: null, hiddenReason: null }),
      );
      return;
    }
    if (action === 'approve') {
      void this.runMod(() => this.forum.modApprovePost(p.id), () =>
        this.replacePost({ ...p, status: 'approved' }),
      );
      return;
    }
    if (action === 'reject') {
      void this.runMod(() => this.forum.modRejectPost(p.id), () =>
        this.removePost(p.id),
      );
      return;
    }
  }

  onThreadAction(action: ThreadActionKind, t: ThreadDetail): void {
    if (action === 'report') {
      this.openDialog('report', 'forum_thread', t.thread.id);
      return;
    }
    if (action === 'lock' || action === 'unlock') {
      void this.runMod(
        () => this.forum.modLockThread(t.thread.id, action === 'lock'),
        () => {
          const cur = this.thread();
          if (!cur) return;
          this.thread.set({
            ...cur,
            thread: {
              ...cur.thread,
              lockedAt: action === 'lock' ? new Date().toISOString() : null,
            },
          });
        },
      );
      return;
    }
    if (action === 'pin' || action === 'unpin') {
      void this.runMod(
        () => this.forum.modPinThread(t.thread.id, action === 'pin'),
        () => {
          const cur = this.thread();
          if (!cur) return;
          this.thread.set({
            ...cur,
            thread: {
              ...cur.thread,
              pinPosition: action === 'pin' ? 1 : null,
              pinnedAt: action === 'pin' ? new Date().toISOString() : null,
            },
          });
        },
      );
      return;
    }
    if (action === 'delete') {
      if (!confirm(this.i18n.t('forum.mod.confirm_delete_thread'))) return;
      void this.runMod(
        () => this.forum.modDeleteThread(t.thread.id),
        () => {
          this.flashToast(this.i18n.t('forum.mod.thread_deleted'));
          setTimeout(
            () =>
              this.router.navigate(['/forum', t.category.slug]).catch(() => {}),
            800,
          );
        },
      );
    }
  }

  private async runMod(
    call: () => Promise<unknown>,
    onSuccess: () => void,
  ): Promise<void> {
    try {
      await call();
      onSuccess();
      this.flashToast(this.i18n.t('forum.mod.action_ok'));
    } catch (err) {
      this.flashToast(this.errorMessage(err, 'forum.compose.submit_error'));
    }
  }

  openDialog(
    mode: 'report' | 'hide',
    targetType: 'forum_post' | 'forum_thread',
    targetId: string,
  ): void {
    this.dialogState.set({ mode, targetType, targetId });
    this.dialogError.set(null);
    this.dialogStartedAt = Date.now();
  }

  closeDialog(): void {
    if (this.dialogBusy()) return;
    this.dialogState.set(null);
    this.dialogError.set(null);
  }

  async onDialogSubmit(payload: ReportSubmit): Promise<void> {
    const ds = this.dialogState();
    if (!ds || this.dialogBusy()) return;
    this.dialogBusy.set(true);
    this.dialogError.set(null);
    try {
      if (ds.mode === 'report') {
        const reason = `[${payload.category.toUpperCase()}] ${payload.reason}`;
        await this.forum.reportContent({
          targetType: ds.targetType,
          targetId: ds.targetId,
          reason,
          hp: '',
          formStartedAt: this.dialogStartedAt,
        });
        this.flashToast(this.i18n.t('forum.report.thanks'));
      } else {
        // hide
        await this.forum.modHidePost(ds.targetId, payload.reason);
        const cur = this.posts();
        if (cur) {
          const apply = (p: PostListItem): PostListItem =>
            p.id === ds.targetId
              ? { ...p, hiddenAt: new Date().toISOString(), hiddenReason: payload.reason }
              : p;
          this.posts.set({
            ...cur,
            op: cur.op ? apply(cur.op) : cur.op,
            replies: cur.replies.map(apply),
          });
        }
        this.flashToast(this.i18n.t('forum.mod.action_ok'));
      }
      this.dialogState.set(null);
    } catch (err) {
      this.dialogError.set(this.errorMessage(err, 'forum.compose.submit_error'));
    } finally {
      this.dialogBusy.set(false);
    }
  }

  /* ============ subscription ============ */

  async onSubChange(level: SubscriptionLevel | null): Promise<void> {
    const t = this.thread();
    if (!t || this.subBusy()) return;
    const prev = this.subLevel();
    this.subBusy.set(true);
    this.subLevel.set(level);
    try {
      await this.forum.setThreadSubscription(t.thread.id, level);
      this.flashToast(this.i18n.t('forum.sub.changed_toast'));
    } catch (err) {
      this.subLevel.set(prev);
      this.flashToast(this.errorMessage(err, 'forum.compose.submit_error'));
    } finally {
      this.subBusy.set(false);
    }
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
      this.applySeo(t, p.op);
      this.expandedMap.set(new Map());
      this.pendingPosts.set([]);
      this.likedByMe.set(new Set());
      this.subLevel.set(null);
      this.attachmentsByPost.set(new Map());

      if (this.auth.currentUser()) {
        // Fire-and-forget — don't block render if these fail.
        void this.loadUserAnnotations(t.thread.id);
      }
      void this.loadAttachments(slug);
    } catch (err) {
      // Spec §7.13: backend returns 404 with body `{ redirectTo, message }`
      // when the slug has a redirect (active 301 or expired 410). Site
      // router honors it — replaceUrl for active, /gone route for expired.
      const body = (err as { error?: { redirectTo?: string; message?: string } })
        ?.error;
      if (body?.redirectTo) {
        if (body.message === 'gone') {
          void this.router.navigate(['/gone']);
        } else {
          // Forum redirect body comes back with placeholder path; the
          // canonical category slug isn't in the redirect payload, so
          // route to /forum and let the user re-find the thread.
          void this.router.navigateByUrl('/forum', { replaceUrl: true });
        }
        return;
      }
      this.error.set(true);
      this.thread.set(null);
      this.posts.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAttachments(slug: string): Promise<void> {
    try {
      const items = await this.attachments.listForumAttachmentsByThread(slug);
      const map = new Map<string, AttachmentItem[]>();
      for (const a of items) {
        const key = a.postId ?? '';
        if (!key) continue;
        const arr = map.get(key) ?? [];
        arr.push(a);
        map.set(key, arr);
      }
      this.attachmentsByPost.set(map);
    } catch {
      // Non-fatal — attachments stay empty on transient failures.
    }
  }

  onAttachmentsChanged(postId: string, items: AttachmentItem[]): void {
    const next = new Map(this.attachmentsByPost());
    if (items.length === 0) next.delete(postId);
    else next.set(postId, items);
    this.attachmentsByPost.set(next);
  }

  private applySeo(t: ThreadDetail, op: PostListItem | null): void {
    const lede = op?.bodyHtml
      ? clampDescription(stripHtml(op.bodyHtml))
      : `Discuție pe Forum Sintezaur · categoria ${t.category.name} · ${t.thread.postCount} răspunsuri.`;
    this.seo.set({
      title: t.thread.title,
      description: lede,
      canonicalPath: `/forum/${t.category.slug}/${t.thread.slug}`,
      ogType: 'article',
    });
    this.seo.setJsonLd([
      {
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: t.thread.title,
        articleBody: lede,
        datePublished: t.thread.createdAt,
        dateModified: t.thread.updatedAt,
        author: t.author
          ? {
              '@type': 'Person',
              name: t.author.fullName || t.author.username,
              url: `${window.location.origin}/autor/${t.author.username}`,
            }
          : undefined,
        interactionStatistic: {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/CommentAction',
          userInteractionCount: Math.max(0, t.thread.postCount - 1),
        },
        isPartOf: {
          '@type': 'WebPage',
          name: t.category.name,
          url: `${window.location.origin}/forum/${t.category.slug}`,
        },
      },
      SeoService.breadcrumbList([
        { name: 'Acasă', path: '/' },
        { name: 'Forum', path: '/forum' },
        { name: t.category.name, path: `/forum/${t.category.slug}` },
        {
          name: t.thread.title,
          path: `/forum/${t.category.slug}/${t.thread.slug}`,
        },
      ]),
    ]);
  }

  private async loadUserAnnotations(threadId: string): Promise<void> {
    try {
      const [likes, sub] = await Promise.all([
        this.forum.listMyLikes(threadId),
        this.forum.getThreadSubscription(threadId),
      ]);
      this.likedByMe.set(new Set(likes.postIds));
      this.subLevel.set(sub.level);
    } catch (err) {
      console.warn('[forum] load user annotations failed', err);
    }
  }

  /* ============ V08 visual helpers ============
   * Methods/computeds below feed the V08 layout (`.ft-sticky` progress
   * counter, trust badges on `.fr-trust`, avatar tints on `.ft-op__avatar`
   * and `.ft-post__avatar`, the "Cei mai activi" sidebar, share/quote/jump
   * engagement controls). They derive from existing data — no extra
   * backend round-trips. */

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrollY.set(window.scrollY || 0);
  }

  /** Total posts in the thread (OP + paginated replies — pending ones
   *  excluded from the visible total because they aren't rendered yet). */
  readonly totalPostsCount = computed(() => {
    const p = this.posts();
    if (!p) return 0;
    return (p.op ? 1 : 0) + p.replies.length;
  });

  readonly totalRepliesCount = computed(() => {
    const p = this.posts();
    if (!p) return 0;
    // Prefer the server-side total (covers paginated branches not on
    // this page). Falls back to the local replies array when missing.
    return Math.max(p.replies.length, p.totalReplies ?? 0);
  });

  /**
   * The post-number currently anchored near the top of the viewport.
   * Mirrors the V08 sticky-bar progress display ("18 / 143"). On SSR
   * (no window) we report `1` so the markup is stable.
   */
  readonly visiblePostIndex = computed(() => {
    // Reactive on scrollY — the value itself isn't used directly, just
    // forces recompute on every scroll tick.
    void this.scrollY();
    if (typeof window === 'undefined') return 1;
    const nodes = document.querySelectorAll<HTMLElement>('.ft-op, .ft-post');
    let topMost = 1;
    let idx = 1;
    for (const node of Array.from(nodes)) {
      const rect = node.getBoundingClientRect();
      if (rect.top < 200) topMost = idx;
      idx += 1;
    }
    return topMost;
  });

  /** Show the floating jump-to-newest button after the user scrolls past
   *  the OP (~600px is the heuristic from the V08 reference). */
  readonly showJump = computed(() => this.scrollY() > 600);

  /** Top-5 most-active users in the current thread (sorted by post count).
   *  Derived purely from the loaded posts; no extra fetch. */
  readonly peopleActive = computed(() => {
    const p = this.posts();
    if (!p) return [];
    const opId = p.op?.authorId ?? null;
    type Tally = {
      authorId: string;
      username: string;
      fullName: string | null;
      postCount: number;
    };
    const byAuthor = new Map<string, Tally>();
    const all: PostListItem[] = [];
    if (p.op) all.push(p.op);
    all.push(...p.replies);
    for (const post of all) {
      if (!post.authorId || !post.authorUsername || post.hiddenAt) continue;
      const cur = byAuthor.get(post.authorId);
      if (cur) {
        cur.postCount += 1;
      } else {
        byAuthor.set(post.authorId, {
          authorId: post.authorId,
          username: post.authorUsername,
          fullName: post.authorFullName,
          postCount: 1,
        });
      }
    }
    return Array.from(byAuthor.values())
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5)
      .map((t) => ({
        username: t.username,
        initials: this.initialsFor(t.fullName, t.username),
        postCount: t.postCount,
        isOp: t.authorId === opId,
      }));
  });

  /* ---------- avatar paint ---------- */

  /** Deterministic 0–359 hue from a string (FNV-1a-ish 32-bit). Keeps the
   *  same user always painted with the same tint without an extra fetch. */
  private hashHue(input: string | null | undefined): number {
    if (!input) return 0;
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return Math.abs(h) % 360;
  }

  avatarBg(seed: string | null | undefined): string | null {
    if (!seed) return null;
    return `oklch(0.55 0.12 ${this.hashHue(seed)})`;
  }

  initialsFor(fullName: string | null, username: string | null): string {
    const source = (fullName ?? username ?? '').trim();
    if (!source) return '··';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  /* ---------- trust badge ---------- */

  /**
   * Resolve the {kind, label} for the per-post trust pill. Tiers thresholds
   * are matched to the V08 reference (Veteran for the long-time members,
   * Activ for the regulars, default = no badge so newbie rows stay clean).
   * Moderators get a separate "Mod" pill courtesy of the `.is-mod` class.
   */
  trustTier(
    createdAtIso: string | null,
    approvedPostCount: number | null,
  ): { kind: 'veteran' | 'regular' | 'mod'; label: string } | null {
    if (!createdAtIso) return null;
    const ageMs = Date.now() - new Date(createdAtIso).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const postCount = approvedPostCount ?? 0;

    if (ageDays >= 730 || postCount >= 100) {
      return {
        kind: 'veteran',
        label: this.i18n.t('forum.trust.veteran'),
      };
    }
    if (ageDays >= 180 || postCount >= 30) {
      return {
        kind: 'regular',
        label: this.i18n.t('forum.trust.regular'),
      };
    }
    return null;
  }

  /* ---------- current user (for sticky reply box) ---------- */

  currentUserName(): string | null {
    return this.auth.currentUser()?.username ?? null;
  }

  currentUserInitials(): string {
    const u = this.auth.currentUser();
    if (!u) return 'EU';
    return this.initialsFor(u.fullName ?? null, u.username);
  }

  /* ---------- engagement actions ---------- */

  /** Copy the post deep-link (`…#post-<id>`) to the clipboard. With
   *  `asThread=true` we copy the canonical thread URL instead (used by
   *  the OP "Distribuie" button which shares the whole thread). */
  async sharePost(p: PostListItem, asThread = false): Promise<void> {
    const t = this.thread();
    if (!t) return;
    const base = `${window.location.origin}/forum/${t.category.slug}/${t.thread.slug}`;
    const numbering = this.numberingForPost(p);
    const url = asThread ? base : `${base}#post-${numbering}`;
    try {
      await navigator.clipboard.writeText(url);
      this.toastSvc.success(this.i18n.t('forum.share.copied'));
    } catch {
      // Fallback when clipboard is unavailable (e.g. http context) —
      // show the URL so the user can copy it manually.
      this.flashToast(url);
    }
  }

  /** Opens the inline reply composer with the parent body pre-quoted as
   *  a blockquote. The composer is the same one used by `startReply` so
   *  no extra wiring is needed — we just patch the editor seed. */
  quotePost(p: PostListItem): void {
    if (!this.auth.currentUser()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    const quotedHtml = `<blockquote><p>@${p.authorUsername ?? '?'} ${this.i18n.t('forum.quote.wrote')}</p>${p.bodyHtml ?? ''}</blockquote><p></p>`;
    this.editingPost.set(null);
    this.replyingTo.set(p.id);
    this.reply.set({
      bodyJson: {},
      bodyHtml: quotedHtml,
      bodyText: this.stripHtml(quotedHtml),
    });
    this.replyError.set(null);
    this.replyStartedAt = Date.now();
  }

  scrollToReplies(): void {
    if (typeof document === 'undefined') return;
    const anchor = document.getElementById('ft-replies-anchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollToBottom(): void {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  /* ---------- parent quote preview (toggle inline) ---------- */

  toggleParentPreview(postId: string): void {
    const next = new Set(this.parentPreviewOpen());
    if (next.has(postId)) next.delete(postId);
    else next.add(postId);
    this.parentPreviewOpen.set(next);
  }

  /** Returns the plain-text version of a parent post body, capped at 240
   *  characters so the preview stays compact. */
  parentPreviewText(parentPostId: string | null): string {
    if (!parentPostId) return '';
    const p = this.posts();
    if (!p) return '';
    const all: PostListItem[] = [];
    if (p.op) all.push(p.op);
    all.push(...p.replies);
    const parent = all.find((x) => x.id === parentPostId);
    if (!parent) return '';
    const text = this.stripHtml(parent.bodyHtml ?? '');
    return text.length > 240 ? text.slice(0, 240).trimEnd() + '…' : text;
  }

  /** Comma-separated preview of usernames in the nested-replies toggle
   *  ("vlad.b, rares.s și 3 alții"). Mirrors the V08 toggle hint. */
  childrenPreview(children: SubReplyVM[]): string {
    if (children.length === 0) return '';
    const names = Array.from(
      new Set(
        children
          .map((c) => c.authorUsername)
          .filter((n): n is string => !!n),
      ),
    );
    if (names.length === 0) return '';
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} ${this.i18n.t('forum.and_n_others', { n: names.length - 2 })}`;
  }

  /** Picks the right numbering string for a post — OP gets "1", top-level
   *  replies get their topLevelSeq, sub-replies use "{top}.{sub}". */
  private numberingForPost(p: PostListItem): string {
    if (p.topLevelSeq === 0) return '1';
    if (p.subSeq !== null) return `${p.topLevelSeq}.${p.subSeq}`;
    return `${p.topLevelSeq}`;
  }
}
