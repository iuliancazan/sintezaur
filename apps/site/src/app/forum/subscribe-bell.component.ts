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
import type { SubscriptionLevel } from './forum.service';

const LEVELS: (SubscriptionLevel | null)[] = [
  'watching',
  'tracking',
  'mentioned_only',
  'muted',
  null,
];

/**
 * Bell button + 5-option drop-down used on the thread + category pages.
 * Stateless — parent owns the current `level` and handles the change.
 *
 * Levels per spec §7.5 (locked at interview):
 *  - watching      = every reply notifies
 *  - tracking      = daily digest (stored, not yet delivered)
 *  - mentioned_only= only @-mentions
 *  - muted         = explicitly silenced
 *  - null          = no subscription (default)
 */
@Component({
  selector: 'app-forum-subscribe-bell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bell" [class.bell--open]="open()">
      <button
        type="button"
        class="bell__trigger"
        [class.bell__trigger--on]="isOn()"
        [disabled]="busy"
        (click)="onTriggerClick($event)"
      >
        <span class="bell__icon">
          @if (level === 'muted') {
            🔕
          } @else if (isOn()) {
            🔔
          } @else {
            🔕
          }
        </span>
        <span class="bell__label">{{ i18n.t('forum.sub.label_' + (level ?? 'off')) }}</span>
        <span class="bell__caret">▾</span>
      </button>

      @if (open()) {
        <ul class="bell__menu">
          @for (lv of levels; track lv) {
            <li>
              <button
                type="button"
                class="bell__opt"
                [class.is-active]="level === lv"
                [disabled]="busy"
                (click)="select(lv)"
              >
                <span class="bell__opt-name">
                  {{ i18n.t('forum.sub.label_' + (lv ?? 'off')) }}
                </span>
                <span class="bell__opt-desc">
                  {{ i18n.t('forum.sub.desc_' + (lv ?? 'off')) }}
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      :host { display: inline-block; position: relative; }

      .bell { position: relative; display: inline-block; }
      .bell__trigger {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: transparent;
        border: 1px solid var(--line-strong);
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        cursor: pointer;
      }
      .bell__trigger:hover { color: var(--accent); border-color: var(--accent); }
      .bell__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
      .bell__trigger--on {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .bell__icon { font-size: 14px; }
      .bell__caret { font-size: 10px; }

      .bell__menu {
        position: absolute;
        z-index: 50;
        top: calc(100% + 6px);
        right: 0;
        min-width: 280px;
        list-style: none;
        margin: 0;
        padding: 4px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }
      .bell__opt {
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 100%;
        text-align: left;
        padding: 10px 12px;
        background: transparent;
        border: 0;
        cursor: pointer;
        color: var(--fg);
        font-family: var(--font-ui);
      }
      .bell__opt:hover { background: color-mix(in oklab, var(--bg-elev) 70%, var(--accent) 30%); }
      .bell__opt.is-active .bell__opt-name { color: var(--accent); }
      .bell__opt.is-active::before {
        content: '✓ ';
        color: var(--accent);
      }
      .bell__opt-name {
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .bell__opt-desc {
        font-size: 11px;
        color: var(--fg-muted);
        line-height: 1.4;
      }

      @media (max-width: 720px) {
        .bell__label { display: none; }
        .bell__menu { right: auto; left: 0; min-width: 240px; }
      }
    `,
  ],
})
export class SubscribeBellComponent {
  readonly i18n: I18nService;
  readonly levels = LEVELS;
  readonly open = signal(false);

  @Input() level: SubscriptionLevel | null = null;
  @Input() busy = false;
  @Output() levelChange = new EventEmitter<SubscriptionLevel | null>();

  constructor(i18n: I18nService) {
    this.i18n = i18n;
  }

  isOn(): boolean {
    return this.level !== null && this.level !== 'muted';
  }

  onTriggerClick(ev: Event): void {
    ev.stopPropagation();
    this.open.set(!this.open());
  }

  select(lv: SubscriptionLevel | null): void {
    this.open.set(false);
    if (lv === this.level) return;
    this.levelChange.emit(lv);
  }

  @HostListener('document:click')
  closeMenu(): void {
    if (this.open()) this.open.set(false);
  }
}
