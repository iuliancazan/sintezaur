import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../i18n/t.pipe';
import { I18nService } from '../i18n/i18n.service';
import {
  NotificationPreferencesService,
  type NotificationChannelKey,
  type NotificationKind,
  type NotificationMode,
  type PreferenceRow,
} from './notification-preferences.service';

interface GroupDef {
  /** i18n key for the group label */
  labelKey: string;
  kinds: NotificationKind[];
}

const GROUPS: GroupDef[] = [
  {
    labelKey: 'prefs.group.bazar',
    kinds: [
      'bazar_new_message',
      'bazar_new_offer',
      'bazar_counter_offer',
      'bazar_offer_accepted',
      'bazar_offer_rejected',
      'bazar_price_drop_watched',
      'bazar_saved_search_match',
      'bazar_listing_expiring',
      'bazar_transaction_confirmed_by_other',
      'bazar_review_submitted_on_me',
    ],
  },
  {
    labelKey: 'prefs.group.tezaur',
    kinds: ['tezaur_review_on_my_gear'],
  },
  {
    labelKey: 'prefs.group.revista',
    kinds: ['revista_article_in_followed_category', 'revista_reply_to_my_article'],
  },
  {
    labelKey: 'prefs.group.forum',
    kinds: [
      'forum_reply_in_subscribed',
      'forum_mention',
      'forum_badge_earned',
      'forum_mod_action_on_my_content',
      'forum_report_resolved',
    ],
  },
  {
    labelKey: 'prefs.group.system',
    kinds: ['admin_announcement', 'storage_quota_lifetime_reached'],
  },
];

const CHANNELS: NotificationChannelKey[] = ['in_app', 'email'];

/**
 * `/cont/preferinte` — spec §7.5 in-app prefs matrix.
 *
 * Server returns the full kind × channel matrix with default fallback
 * already applied. User clicks toggles, page batches changes locally,
 * single PUT on Save. Per-kind reset-to-default is a stretch goal —
 * for now, toggling channels manually is sufficient.
 */
@Component({
  selector: 'app-notification-preferences-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="prefs">
      <header class="prefs__head">
        <a routerLink="/cont" class="prefs__back">← {{ 'account.back' | t }}</a>
        <h1>{{ 'prefs.title' | t }}</h1>
        <p class="prefs__meta">{{ 'prefs.intro' | t }}</p>
      </header>

      @if (loading()) {
        <p class="muted">{{ 'common.loading' | t }}</p>
      } @else {
        <form (ngSubmit)="save()">
          @for (g of groups; track g.labelKey) {
            <section class="group">
              <h2>{{ g.labelKey | t }}</h2>
              <table>
                <thead>
                  <tr>
                    <th>{{ 'prefs.col.trigger' | t }}</th>
                    <th>{{ 'prefs.col.in_app' | t }}</th>
                    <th>{{ 'prefs.col.email' | t }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (k of g.kinds; track k) {
                    <tr>
                      <td>{{ 'prefs.kind.' + k | t }}</td>
                      @for (c of channels; track c) {
                        <td>
                          <label class="cb">
                            <input
                              type="checkbox"
                              [checked]="isOn(k, c)"
                              (change)="onToggle(k, c, $any($event.target).checked)"
                            />
                            <span></span>
                          </label>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          }

          @if (toast(); as t) {
            <p class="toast">{{ t }}</p>
          }
          @if (errorMsg(); as e) {
            <p class="error">{{ e }}</p>
          }

          <div class="actions">
            <button
              type="submit"
              [disabled]="!dirty() || saving()"
              class="btn-primary"
            >
              {{ saving() ? ('common.saving' | t) : ('prefs.save' | t) }}
            </button>
          </div>
        </form>
      }
    </main>
  `,
  styles: [
    `
      .prefs {
        max-width: 920px;
        margin: 0 auto;
        padding: 32px var(--gutter-x);
      }
      .prefs__head h1 {
        font-family: var(--font-display);
        font-size: clamp(24px, 4vw, 32px);
        margin: 12px 0 4px;
      }
      .prefs__back {
        font-size: 13px;
        opacity: 0.7;
        text-decoration: none;
        color: inherit;
      }
      .prefs__meta {
        font-size: 14px;
        opacity: 0.75;
        margin-bottom: 24px;
      }
      .group {
        margin-bottom: 24px;
        background: var(--surface-card, #fff);
        border: 1px solid var(--surface-border, #e4e4e7);
        padding: 12px 16px;
      }
      .group h2 {
        margin: 0 0 8px;
        font-family: var(--font-display);
        font-size: 15px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      th, td {
        border-bottom: 1px solid var(--surface-border, #e4e4e7);
        padding: 6px 8px;
        text-align: left;
      }
      th {
        font-weight: 600;
        background: var(--surface-section, #f9fafb);
      }
      th:nth-child(2),
      th:nth-child(3),
      td:nth-child(2),
      td:nth-child(3) {
        width: 90px;
        text-align: center;
      }
      .cb input {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
      }
      .btn-primary {
        padding: 10px 18px;
        font-size: 14px;
        background: var(--accent, #2563eb);
        color: #fff;
        border: none;
        cursor: pointer;
      }
      .btn-primary[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .toast {
        color: var(--green-700, #15803d);
        font-size: 13px;
        margin: 12px 0 0;
      }
      .error {
        color: var(--red-700, #b91c1c);
        font-size: 13px;
        margin: 12px 0 0;
      }
      .muted { opacity: 0.6; }
    `,
  ],
})
export class NotificationPreferencesPage implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(NotificationPreferencesService);

  readonly groups = GROUPS;
  readonly channels = CHANNELS;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly toast = signal<string | null>(null);
  readonly errorMsg = signal<string | null>(null);
  /** Effective state — server snapshot merged with local edits. */
  readonly state = signal<Map<string, NotificationMode>>(new Map());
  /** Tracks which keys have been edited since last save (for PUT). */
  readonly edits = signal<Map<string, NotificationMode>>(new Map());

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.api.list();
      const map = new Map<string, NotificationMode>();
      for (const r of items) {
        map.set(this.key(r.kind, r.channel), r.mode);
      }
      this.state.set(map);
      this.edits.set(new Map());
    } catch {
      this.errorMsg.set('Eroare la încărcarea preferințelor.');
    } finally {
      this.loading.set(false);
    }
  }

  isOn(kind: NotificationKind, channel: NotificationChannelKey): boolean {
    return this.state().get(this.key(kind, channel)) === 'on';
  }

  onToggle(
    kind: NotificationKind,
    channel: NotificationChannelKey,
    on: boolean,
  ): void {
    const k = this.key(kind, channel);
    const mode: NotificationMode = on ? 'on' : 'off';

    const next = new Map(this.state());
    next.set(k, mode);
    this.state.set(next);

    const nextEdits = new Map(this.edits());
    nextEdits.set(k, mode);
    this.edits.set(nextEdits);

    this.toast.set(null);
    this.errorMsg.set(null);
  }

  dirty(): boolean {
    return this.edits().size > 0;
  }

  async save(): Promise<void> {
    const edits = this.edits();
    if (edits.size === 0) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    try {
      const items: PreferenceRow[] = [];
      for (const [key, mode] of edits) {
        const [kind, channel] = key.split('::') as [
          NotificationKind,
          NotificationChannelKey,
        ];
        items.push({ kind, channel, mode });
      }
      await this.api.save(items);
      this.edits.set(new Map());
      this.toast.set(this.i18n.t('prefs.saved'));
      setTimeout(() => this.toast.set(null), 2400);
    } catch {
      this.errorMsg.set('Eroare la salvare. Reîncearcă.');
    } finally {
      this.saving.set(false);
    }
  }

  private key(kind: NotificationKind, channel: NotificationChannelKey): string {
    return `${kind}::${channel}`;
  }
}
