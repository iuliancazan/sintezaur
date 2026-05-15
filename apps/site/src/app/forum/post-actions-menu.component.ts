import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  signal,
} from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

export type PostActionKind = 'report' | 'hide' | 'unhide' | 'approve' | 'reject';
export type ThreadActionKind =
  | 'report'
  | 'lock'
  | 'unlock'
  | 'pin'
  | 'unpin'
  | 'delete';

/**
 * Kebab (⋮) menu attached to a post or thread. Renders a discrete set of
 * actions based on the current user's role and the target's state. The
 * parent owns the action handlers — this component just emits.
 */
@Component({
  selector: 'app-post-actions-menu',
  standalone: true,
  imports: [CommonModule, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kebab" [class.kebab--open]="open()">
      <button
        type="button"
        class="kebab__trigger"
        [attr.aria-label]="i18n.t('forum.actions_menu')"
        (click)="onTriggerClick($event)"
      >⋮</button>
      @if (open()) {
        <ul class="kebab__menu" role="menu">
          @if (canReport && !isOwn) {
            <li>
              <button type="button" role="menuitem" (click)="emit('report')">
                🚩 {{ 'forum.action.report' | t }}
              </button>
            </li>
          }
          @if (isMod) {
            @if (kind === 'post') {
              @if (postIsHidden) {
                <li>
                  <button type="button" role="menuitem" (click)="emit('unhide')">
                    👁 {{ 'forum.mod.unhide_post' | t }}
                  </button>
                </li>
              } @else {
                <li>
                  <button type="button" role="menuitem" (click)="emit('hide')">
                    🚫 {{ 'forum.mod.hide_post' | t }}
                  </button>
                </li>
              }
              @if (postIsPending) {
                <li>
                  <button type="button" role="menuitem" (click)="emit('approve')">
                    ✓ {{ 'forum.mod.approve_post' | t }}
                  </button>
                </li>
                <li>
                  <button type="button" role="menuitem" (click)="emit('reject')">
                    ✗ {{ 'forum.mod.reject_post' | t }}
                  </button>
                </li>
              }
            } @else {
              <li>
                <button
                  type="button"
                  role="menuitem"
                  (click)="emit(threadIsLocked ? 'unlock' : 'lock')"
                >
                  @if (threadIsLocked) {
                    🔓 {{ 'forum.mod.unlock_thread' | t }}
                  } @else {
                    🔒 {{ 'forum.mod.lock_thread' | t }}
                  }
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  (click)="emit(threadIsPinned ? 'unpin' : 'pin')"
                >
                  @if (threadIsPinned) {
                    📌 {{ 'forum.mod.unpin_thread' | t }}
                  } @else {
                    📌 {{ 'forum.mod.pin_thread' | t }}
                  }
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  class="danger"
                  (click)="emit('delete')"
                >
                  🗑 {{ 'forum.mod.delete_thread' | t }}
                </button>
              </li>
            }
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      :host { display: inline-block; position: relative; }

      .kebab__trigger {
        background: transparent;
        border: 1px solid var(--line);
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 14px;
        padding: 4px 10px;
        cursor: pointer;
      }
      .kebab__trigger:hover { color: var(--accent); border-color: var(--accent); }

      .kebab__menu {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        z-index: 60;
        list-style: none;
        margin: 0;
        padding: 4px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        min-width: 200px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }
      .kebab__menu li button {
        display: block;
        width: 100%;
        padding: 8px 12px;
        background: transparent;
        border: 0;
        text-align: left;
        cursor: pointer;
        font-family: var(--font-ui);
        font-size: 13px;
        color: var(--fg);
      }
      .kebab__menu li button:hover {
        background: color-mix(in oklab, var(--bg-elev) 80%, var(--accent) 20%);
      }
      .kebab__menu li button.danger { color: #e8665b; }
      .kebab__menu li button.danger:hover { background: color-mix(in oklab, var(--bg-elev) 75%, #e8665b 25%); }

      @media (max-width: 720px) {
        .kebab__menu { right: auto; left: 0; min-width: 180px; }
      }
    `,
  ],
})
export class PostActionsMenuComponent {
  readonly i18n: I18nService;
  readonly open = signal(false);

  @Input() kind: 'post' | 'thread' = 'post';
  @Input() canReport = false;
  @Input() isMod = false;
  @Input() isOwn = false;
  @Input() postIsHidden = false;
  @Input() postIsPending = false;
  @Input() threadIsLocked = false;
  @Input() threadIsPinned = false;

  @Output() action = new EventEmitter<PostActionKind | ThreadActionKind>();

  constructor(i18n: I18nService) {
    this.i18n = i18n;
  }

  emit(a: PostActionKind | ThreadActionKind): void {
    this.open.set(false);
    this.action.emit(a);
  }

  onTriggerClick(ev: Event): void {
    ev.stopPropagation();
    this.open.set(!this.open());
  }

  @HostListener('document:click')
  closeMenu(): void {
    if (this.open()) this.open.set(false);
  }
}
