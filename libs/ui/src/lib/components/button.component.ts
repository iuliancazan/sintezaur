import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';

export type SzButtonVariant = 'primary' | 'ghost' | 'login' | 'cta';
export type SzButtonSize = 'sm' | 'md' | 'lg';

/**
 * Editorial-style button used across topbar, hero CTAs, forms, etc.
 *
 * Variants:
 *   - `primary` — gold fill, white-ish foreground (legacy "btn-login")
 *   - `login`   — alias for primary (kept for design fidelity)
 *   - `ghost`   — bordered, transparent background
 *   - `cta`     — block-style CTA with arrow suffix (used inside .block headers)
 */
@Component({
  selector: 'sz-button, button[sz-button], a[sz-button]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
  host: {
    '[attr.data-variant]': 'variant',
    '[attr.data-size]': 'size',
    class: 'sz-button',
  },
  styles: [
    `
      .sz-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        white-space: nowrap;
        font-family: var(--font-mono);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-weight: 600;
        border-radius: var(--radius);
        border: 1px solid transparent;
        transition:
          filter 0.15s ease,
          background 0.15s ease,
          border-color 0.15s ease,
          color 0.15s ease,
          transform 0.15s ease;
        cursor: pointer;
        min-height: 44px;
      }

      /* Sizes */
      .sz-button[data-size='sm'] {
        padding: 6px 12px;
        font-size: 10px;
        min-height: 32px;
      }
      .sz-button[data-size='md'] {
        padding: 8px 16px;
        font-size: 11px;
      }
      .sz-button[data-size='lg'] {
        padding: 14px 24px;
        font-size: 12px;
      }

      /* Variants */
      .sz-button[data-variant='primary'],
      .sz-button[data-variant='login'] {
        background: var(--accent);
        color: var(--accent-fg);
      }
      .sz-button[data-variant='primary']:hover,
      .sz-button[data-variant='login']:hover {
        filter: brightness(1.08);
      }
      .sz-button[data-variant='primary']:active,
      .sz-button[data-variant='login']:active {
        transform: translateY(1px);
      }

      .sz-button[data-variant='ghost'] {
        background: transparent;
        color: var(--fg);
        border-color: var(--line-strong);
      }
      .sz-button[data-variant='ghost']:hover {
        background: var(--bg-elev);
        border-color: var(--fg-muted);
      }

      .sz-button[data-variant='cta'] {
        background: var(--bg-card);
        color: var(--fg);
        border-color: var(--line-strong);
        padding: 10px 16px;
        font-size: 11px;
        letter-spacing: 0.12em;
      }
      .sz-button[data-variant='cta']:hover {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .sz-button[data-variant='cta']::after {
        content: '→';
        display: inline-block;
        transition: transform 0.15s ease;
      }
      .sz-button[data-variant='cta']:hover::after {
        transform: translateX(2px);
      }

      .sz-button:disabled,
      .sz-button[aria-disabled='true'] {
        opacity: 0.5;
        cursor: not-allowed;
        filter: none;
      }
    `,
  ],
})
export class SzButtonComponent {
  @Input() variant: SzButtonVariant = 'primary';
  @Input() size: SzButtonSize = 'md';
}
