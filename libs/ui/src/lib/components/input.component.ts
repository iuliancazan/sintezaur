import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SzIconComponent } from '../icons/icon.component';

export type SzInputVariant = 'text' | 'search';

/**
 * Text / search input. The `search` variant adds the magnifier icon
 * prefix and an optional kbd hint slot (Cmd-K style).
 */
@Component({
  selector: 'sz-input',
  standalone: true,
  imports: [FormsModule, SzIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <label class="sz-input" [attr.data-variant]="variant">
      @if (variant === 'search') {
        <sz-icon name="search" [size]="16" class="sz-input__icon" />
      }
      <input
        [type]="type"
        [attr.name]="name"
        [attr.placeholder]="placeholder"
        [attr.autocomplete]="autocomplete"
        [attr.aria-label]="ariaLabel"
        [(ngModel)]="value"
        (ngModelChange)="valueChange.emit($event)"
      />
      @if (kbdHint) {
        <kbd class="sz-input__kbd">{{ kbdHint }}</kbd>
      }
    </label>
  `,
  styles: [
    `
      .sz-input {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        border-radius: var(--radius);
        transition: border-color 0.15s ease;
        width: 100%;
      }
      .sz-input:focus-within {
        border-color: var(--accent);
      }
      .sz-input input {
        flex: 1;
        background: transparent;
        border: 0;
        outline: 0;
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 13px;
        min-height: 24px;
      }
      .sz-input input::placeholder {
        color: var(--fg-subtle);
      }

      .sz-input__icon {
        color: var(--fg-muted);
        flex-shrink: 0;
      }

      .sz-input__kbd {
        padding: 2px 6px;
        background: var(--bg-card);
        border: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-muted);
        letter-spacing: 0.08em;
      }
    `,
  ],
})
export class SzInputComponent {
  @Input() variant: SzInputVariant = 'text';
  @Input() type = 'text';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() name?: string;
  @Input() autocomplete?: string;
  @Input() ariaLabel?: string;
  @Input() kbdHint?: string;

  @Output() valueChange = new EventEmitter<string>();
}
