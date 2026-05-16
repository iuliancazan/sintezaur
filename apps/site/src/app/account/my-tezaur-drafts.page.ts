import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  TezaurService,
  type TezaurMyDraft,
} from '../tezaur/tezaur.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

/**
 * "Drafturile mele Tezaur" — listing of all gear rows the current
 * user has authored, across all states. Continue editing ↔
 * `/tezaur/adauga?draft=<id>` (own draft / rejected); view live
 * page for approved; submitted shows a "în coadă" badge with no
 * actions. Delete confirms then calls `meDeleteDraft` (soft delete).
 */
@Component({
  selector: 'app-my-tezaur-drafts-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mtd">
      <header class="mtd__head">
        <a routerLink="/cont" class="mtd__back">
          ← {{ 'account.back_to_account' | t }}
        </a>
        <div class="mtd__title-row">
          <h1>{{ 'my_tezaur_drafts.title' | t }}</h1>
          <a routerLink="/tezaur/adauga" class="mtd__cta">
            + {{ 'tezaur.add_button' | t }}
          </a>
        </div>
        <p class="mtd__lede">{{ 'my_tezaur_drafts.lede' | t }}</p>
      </header>

      @if (loading()) {
        <p class="mtd__empty">{{ 'app.loading' | t }}</p>
      } @else if (drafts().length === 0) {
        <div class="mtd__empty">
          <p style="font-size:24px; margin:0 0 8px">📚</p>
          <p style="margin:0 0 6px"><strong>{{ 'my_tezaur_drafts.empty_title' | t }}</strong></p>
          <p style="margin:0 0 16px; color:var(--fg-muted); font-size:14px">{{ 'my_tezaur_drafts.empty_body' | t }}</p>
          <a routerLink="/tezaur/adauga" class="mtd__cta">
            + {{ 'tezaur.add_button' | t }}
          </a>
        </div>
      } @else {
        <ul class="mtd__list">
          @for (d of drafts(); track d.id) {
            <li class="mtd__row" [class.is-locked]="d.state === 'submitted' || d.state === 'approved'">
              <div class="mtd__media">
                @if (d.thumb) {
                  <img [src]="tezaur.imageUrl(d.thumb)" [alt]="d.brand + ' ' + d.model" />
                } @else {
                  <span class="mtd__media-placeholder">—</span>
                }
              </div>
              <div class="mtd__body">
                <div class="mtd__title-row-inner">
                  <span class="mtd__brand">{{ d.brand === 'Necunoscut' ? '—' : d.brand }}</span>
                  <span class="mtd__model">{{ d.model === 'Draft fără model' ? ('my_tezaur_drafts.unnamed' | t) : d.model }}</span>
                </div>
                <div class="mtd__meta">
                  <span class="mtd__state mtd__state--{{ d.state }}">
                    {{ 'tezaur.add.state.' + d.state | t }}
                  </span>
                  <span class="mtd__updated">
                    {{ 'my_tezaur_drafts.updated_prefix' | t }} {{ formatDate(d.updatedAt) }}
                  </span>
                </div>
                @if (d.state === 'rejected' && d.rejectionReason) {
                  <p class="mtd__reject">
                    <strong>{{ 'my_tezaur_drafts.reject_label' | t }}:</strong>
                    {{ d.rejectionReason }}
                  </p>
                }
              </div>
              <div class="mtd__actions">
                @if (d.state === 'draft' || d.state === 'rejected') {
                  <a
                    [routerLink]="['/tezaur/adauga']"
                    [queryParams]="{ draft: d.id }"
                    class="mtd__btn mtd__btn--primary"
                  >
                    {{ 'my_tezaur_drafts.action_continue' | t }}
                  </a>
                  <button
                    type="button"
                    class="mtd__btn mtd__btn--danger"
                    (click)="deleteDraft(d.id)"
                    [disabled]="deleting() === d.id"
                  >
                    {{ deleting() === d.id ? ('my_tezaur_drafts.deleting' | t) : ('my_tezaur_drafts.action_delete' | t) }}
                  </button>
                }
                @if (d.state === 'submitted') {
                  <span class="mtd__queued">⏳ {{ 'my_tezaur_drafts.queued_note' | t }}</span>
                }
                @if (d.state === 'approved') {
                  <a
                    [routerLink]="['/tezaur', d.slug]"
                    class="mtd__btn mtd__btn--ghost"
                  >
                    {{ 'my_tezaur_drafts.action_view' | t }} →
                  </a>
                }
              </div>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: var(--container);
        margin: 0 auto;
        padding: 32px var(--gutter-x) 80px;
      }
      .mtd__head {
        margin-bottom: 32px;
      }
      .mtd__back {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg-muted);
        text-decoration: none;
        display: inline-block;
        margin-bottom: 12px;
        min-height: auto;
      }
      .mtd__back:hover {
        color: var(--accent);
      }
      .mtd__title-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 16px;
        margin-bottom: 8px;
      }
      .mtd__title-row h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 44px);
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1.05;
        margin: 0;
        text-transform: uppercase;
      }
      .mtd__cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 10px 14px;
        background: var(--accent);
        color: var(--accent-fg);
        border: 1px solid var(--accent);
        text-decoration: none;
        min-height: auto;
      }
      .mtd__cta:hover {
        opacity: 0.9;
      }
      .mtd__lede {
        margin: 0;
        color: var(--fg-muted);
        font-size: 14px;
        line-height: 1.55;
        max-width: 60ch;
      }
      .mtd__empty {
        text-align: center;
        padding: 48px 24px;
        border: 1px dashed var(--line);
        background: var(--bg-elev);
      }
      .mtd__list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .mtd__row {
        display: grid;
        grid-template-columns: 88px 1fr auto;
        gap: 16px;
        padding: 14px;
        border: 1px solid var(--line);
        background: var(--bg-card);
        align-items: center;
      }
      .mtd__row.is-locked {
        opacity: 0.82;
      }
      .mtd__media {
        width: 88px;
        height: 88px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .mtd__media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .mtd__media-placeholder {
        font-family: var(--font-mono);
        font-size: 18px;
        color: var(--fg-subtle);
      }
      .mtd__title-row-inner {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-bottom: 6px;
      }
      .mtd__brand {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .mtd__model {
        font-size: 18px;
        font-weight: 600;
        color: var(--fg);
        line-height: 1.2;
        word-break: break-word;
      }
      .mtd__meta {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .mtd__state {
        display: inline-block;
        padding: 3px 8px;
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .mtd__state--draft {
        color: var(--fg-muted);
      }
      .mtd__state--submitted {
        color: oklch(0.78 0.13 80);
        border-color: oklch(0.78 0.13 80 / 0.4);
      }
      .mtd__state--approved {
        color: oklch(0.72 0.15 145);
        border-color: oklch(0.72 0.15 145 / 0.4);
      }
      .mtd__state--rejected {
        color: oklch(0.72 0.16 28);
        border-color: oklch(0.72 0.16 28 / 0.4);
      }
      .mtd__reject {
        margin: 8px 0 0;
        padding: 8px 10px;
        background: oklch(0.42 0.14 28 / 0.1);
        border-left: 2px solid oklch(0.72 0.16 28);
        font-size: 12px;
        line-height: 1.5;
        color: var(--fg);
      }
      .mtd__actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: stretch;
      }
      .mtd__btn {
        appearance: none;
        background: transparent;
        border: 1px solid var(--line);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 8px 12px;
        cursor: pointer;
        text-decoration: none;
        text-align: center;
        min-height: auto;
        min-width: auto;
      }
      .mtd__btn:hover:not(:disabled) {
        background: var(--bg-elev);
      }
      .mtd__btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mtd__btn--primary {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .mtd__btn--primary:hover {
        background: var(--accent);
        opacity: 0.9;
      }
      .mtd__btn--danger {
        color: oklch(0.72 0.16 28);
        border-color: oklch(0.72 0.16 28 / 0.4);
      }
      .mtd__btn--danger:hover:not(:disabled) {
        background: oklch(0.42 0.14 28 / 0.18);
      }
      .mtd__queued {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        color: var(--fg-muted);
        padding: 8px 12px;
      }
      @media (max-width: 720px) {
        .mtd__row {
          grid-template-columns: 64px 1fr;
        }
        .mtd__media {
          width: 64px;
          height: 64px;
        }
        .mtd__actions {
          grid-column: 1 / -1;
          flex-direction: row;
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class MyTezaurDraftsPage {
  readonly tezaur = inject(TezaurService);
  readonly i18n = inject(I18nService);

  readonly drafts = signal<TezaurMyDraft[]>([]);
  readonly loading = signal(true);
  readonly deleting = signal<string | null>(null);

  constructor() {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.tezaur.listMyDrafts();
      this.drafts.set(list);
    } catch (err) {
      console.error('[my-tezaur-drafts] load failed', err);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteDraft(id: string): Promise<void> {
    const ok = confirm(this.i18n.t('my_tezaur_drafts.delete_confirm'));
    if (!ok) return;
    this.deleting.set(id);
    try {
      await this.tezaur.deleteDraft(id);
      this.drafts.update((rows) => rows.filter((r) => r.id !== id));
    } catch (err) {
      console.error('[my-tezaur-drafts] delete failed', err);
    } finally {
      this.deleting.set(null);
    }
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }
}
