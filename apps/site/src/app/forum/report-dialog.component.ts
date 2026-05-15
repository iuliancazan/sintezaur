import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

const CATEGORIES = [
  'spam',
  'hostility',
  'off_topic',
  'illegal',
  'other',
] as const;

export interface ReportSubmit {
  category: (typeof CATEGORIES)[number];
  reason: string;
}

/**
 * Reusable modal for content reports + mod-action reasons.
 *
 * Two modes (controlled by `mode`):
 *   - 'report'   : 5 categories + free text (min 10 chars). Submit emits
 *                  `{ category, reason }` and parent sends both joined as
 *                  `[CAT] reason text` to the API per spec interview.
 *   - 'hide'     : single textarea (min 10). No category — Just emits
 *                  `reason` via the `submit` event.
 */
@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="rd-backdrop" (click)="onCancel()">
        <div class="rd-dialog" (click)="$event.stopPropagation()">
          <header>
            <h2>
              @if (mode === 'report') {
                {{ 'forum.report.title' | t }}
              } @else {
                {{ 'forum.report.hide_title' | t }}
              }
            </h2>
            <button type="button" class="rd-close" (click)="onCancel()">✕</button>
          </header>
          <p class="rd-lede">
            @if (mode === 'report') {
              {{ 'forum.report.lede' | t }}
            } @else {
              {{ 'forum.report.hide_lede' | t }}
            }
          </p>

          @if (mode === 'report') {
            <label class="rd-field">
              <span>{{ 'forum.report.category_label' | t }}</span>
              <select [ngModel]="category()" (ngModelChange)="category.set($event)">
                @for (c of categories; track c) {
                  <option [value]="c">{{ 'forum.report.cat_' + c | t }}</option>
                }
              </select>
            </label>
          }

          <label class="rd-field">
            <span>{{ 'forum.report.reason_label' | t }}</span>
            <textarea
              rows="4"
              [ngModel]="reason()"
              (ngModelChange)="reason.set($event)"
              [placeholder]="i18n.t('forum.report.reason_placeholder')"
            ></textarea>
            <span class="rd-hint">{{ reason().length }} / 1000 (min 10)</span>
          </label>

          @if (error) {
            <p class="rd-error">{{ error }}</p>
          }

          <footer>
            <button type="button" class="rd-btn rd-btn--ghost" [disabled]="busy" (click)="onCancel()">
              {{ 'forum.compose.cancel' | t }}
            </button>
            <button
              type="button"
              class="rd-btn rd-btn--primary"
              [disabled]="!canSubmit() || busy"
              (click)="onSubmit()"
            >
              @if (busy) {
                {{ 'forum.compose.submitting' | t }}
              } @else if (mode === 'report') {
                {{ 'forum.report.send' | t }}
              } @else {
                {{ 'forum.report.hide_action' | t }}
              }
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .rd-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        z-index: 1000;
        display: grid;
        place-items: center;
      }
      .rd-dialog {
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        width: min(520px, 92vw);
        max-height: 90vh;
        overflow-y: auto;
        padding: 22px 24px;
      }
      .rd-dialog header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .rd-dialog h2 {
        font-family: var(--font-display);
        font-size: 22px;
        margin: 0;
      }
      .rd-close {
        background: transparent;
        border: 0;
        color: var(--fg-muted);
        font-size: 18px;
        cursor: pointer;
      }
      .rd-lede {
        color: var(--fg-muted);
        font-size: 13px;
        margin: 0 0 16px;
      }
      .rd-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
      }
      .rd-field span {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .rd-field select,
      .rd-field textarea {
        font-family: inherit;
        font-size: 14px;
        padding: 8px 10px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
      }
      .rd-field select:focus,
      .rd-field textarea:focus {
        outline: none;
        border-color: var(--accent);
      }
      .rd-field textarea { resize: vertical; }
      .rd-hint {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        text-align: right;
      }
      .rd-error {
        background: color-mix(in oklab, #e8665b 14%, var(--bg));
        color: #e8665b;
        padding: 8px 10px;
        font-size: 12px;
        margin: 0 0 12px;
        border-left: 3px solid #e8665b;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 8px;
      }
      .rd-btn {
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
      .rd-btn:hover { color: var(--fg); border-color: var(--accent); }
      .rd-btn--primary {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .rd-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .rd-btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
    `,
  ],
})
export class ReportDialogComponent {
  readonly i18n: I18nService;
  readonly categories = CATEGORIES;
  readonly category = signal<(typeof CATEGORIES)[number]>('spam');
  readonly reason = signal('');

  @Input() open = false;
  @Input() mode: 'report' | 'hide' = 'report';
  @Input() busy = false;
  @Input() error: string | null = null;

  @Output() submitReport = new EventEmitter<ReportSubmit>();
  @Output() cancel = new EventEmitter<void>();

  constructor(i18n: I18nService) {
    this.i18n = i18n;
  }

  canSubmit(): boolean {
    const text = this.reason().trim();
    if (this.mode === 'report') {
      return text.length >= 10 && text.length <= 1000;
    }
    return text.length >= 2 && text.length <= 500;
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    this.submitReport.emit({
      category: this.category(),
      reason: this.reason().trim(),
    });
  }

  onCancel(): void {
    if (this.busy) return;
    this.reason.set('');
    this.cancel.emit();
  }
}
