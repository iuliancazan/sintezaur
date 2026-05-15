import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TPipe } from '../i18n/t.pipe';

/**
 * Placeholder for the future Forum private-messages tab. Forum
 * PMs are not implemented yet — the future plan is to unify Bazar
 * and Forum inboxes here (one list, badge per source) once Forum
 * PMs land. Until then this tab just sets expectations.
 */
@Component({
  selector: 'app-forum-messages-placeholder-page',
  standalone: true,
  imports: [TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ph">
      <p class="ph__lead">{{ 'account.messages_shell.forum_soon_title' | t }}</p>
      <p class="ph__body">{{ 'account.messages_shell.forum_soon_body' | t }}</p>
    </div>
  `,
  styles: [
    `
      .ph {
        padding: 32px 0;
        text-align: center;
        color: var(--fg-muted);
      }
      .ph__lead {
        font-family: var(--font-display);
        font-size: 20px;
        color: var(--fg);
        margin: 0 0 8px;
      }
      .ph__body {
        max-width: 48ch;
        margin: 0 auto;
        line-height: 1.55;
        font-size: 14px;
      }
    `,
  ],
})
export class ForumMessagesPlaceholderPage {}
