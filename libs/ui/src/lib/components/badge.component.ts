import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';

export type SzBadgeVariant =
  | 'pill'
  | 'accent'
  | 'live'
  | 'condition'
  | 'category'
  | 'tag';

/**
 * Inline metadata pill — used for tags, conditions, "Featured", "Live",
 * categories, etc. Pure CSS via tokens.
 */
@Component({
  selector: 'sz-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (variant === 'live') {
      <span class="sz-badge__dot"></span>
    }
    <ng-content />
  `,
  host: {
    '[attr.data-variant]': 'variant',
    class: 'sz-badge',
  },
  styles: [
    `
      .sz-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border: 1px solid var(--line-strong);
        background: var(--bg-card);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }

      .sz-badge[data-variant='accent'] {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }

      .sz-badge[data-variant='live'] {
        background: var(--bg-card);
        color: var(--fg);
      }
      .sz-badge__dot {
        width: 6px;
        height: 6px;
        background: var(--accent);
        display: inline-block;
        animation: sz-pulse-dot 1.6s ease-in-out infinite;
      }
      @keyframes sz-pulse-dot {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.4;
          transform: scale(0.65);
        }
      }

      .sz-badge[data-variant='condition'] {
        background: var(--bg);
        border-color: var(--line-strong);
        font-size: 10px;
        padding: 4px 8px;
      }
      .sz-badge[data-variant='condition'][data-cond='nou'],
      .sz-badge[data-variant='condition'][data-cond='ca_nou'] {
        color: var(--accent);
        border-color: var(--accent);
      }

      .sz-badge[data-variant='category'] {
        color: var(--accent);
        background: transparent;
        border: 0;
        padding: 0;
        font-size: 10px;
        letter-spacing: 0.18em;
      }

      .sz-badge[data-variant='tag'] {
        font-size: 9px;
        letter-spacing: 0.14em;
        padding: 3px 6px;
        border-color: var(--line);
        color: var(--fg-muted);
        background: transparent;
      }
    `,
  ],
})
export class SzBadgeComponent {
  @Input() variant: SzBadgeVariant = 'pill';
}
