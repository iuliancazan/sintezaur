import { Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { COURSE_VARIANTS, VARIANT_MINUTES } from '../content/types';
import { VariantService } from '../core/variant.service';

/**
 * 90′ | 60′ — the course-length switch, same joined-pill skin as the EN|RO
 * toggle. Sits next to it on the hub and in the deck / script viewer bars.
 */
@Component({
  selector: 'ws-variant-toggle',
  imports: [TranslocoPipe],
  template: `
    <div
      class="seg"
      [class.seg--sm]="size() === 'sm'"
      role="group"
      [attr.aria-label]="'variant.label' | transloco"
    >
      @for (variant of variants; track variant) {
        <button
          type="button"
          class="seg__half"
          [class.seg__half--active]="variantService.variant() === variant"
          (click)="variantService.set(variant)"
          [attr.aria-label]="
            'variant.' + variant + '_aria' | transloco: { min: minutes[variant] }
          "
          [title]="
            'variant.' + variant + '_aria' | transloco: { min: minutes[variant] }
          "
        >
          {{ minutes[variant] }}′
        </button>
      }
    </div>
  `,
  styles: `
    .seg {
      display: flex;
      border: 1px solid var(--ws-border-strong);
      border-radius: 999px;
      overflow: hidden;
    }
    .seg__half {
      min-height: 0;
      padding: 7px 16px;
      border: none;
      background: none;
      font-family: var(--ws-font-mono);
      font-size: 12px;
      letter-spacing: 2px;
      color: var(--ws-text-faint);
      cursor: pointer;
    }
    .seg--sm .seg__half {
      padding: 5px 12px;
      font-size: 11px;
    }
    .seg__half--active {
      background: var(--ws-accent);
      color: var(--ws-bg);
      font-weight: 500;
    }
    @media print {
      .seg {
        display: none;
      }
    }
  `,
})
export class VariantToggleComponent {
  protected readonly variantService = inject(VariantService);
  protected readonly variants = COURSE_VARIANTS;
  protected readonly minutes = VARIANT_MINUTES;

  readonly size = input<'md' | 'sm'>('md');
}
