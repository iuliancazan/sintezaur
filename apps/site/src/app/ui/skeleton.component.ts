import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tiny CSS skeleton placeholder (M6-C). Replaces "Se încarcă…" text
 * on detail / list pages so the layout snaps in before the data does.
 * Pure CSS animation (shimmer); honors `prefers-reduced-motion`.
 *
 * Usage:
 *   <app-skeleton width="60%" height="24px" />
 *   <app-skeleton width="100%" height="200px" radius="12px" />
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="sk"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="radius()"
      [style.display]="block() ? 'block' : 'inline-block'"
      aria-hidden="true"
    ></span>
  `,
  styles: [
    `
      :host { display: contents; }
      .sk {
        background: linear-gradient(
          90deg,
          var(--surface-2, rgba(255, 255, 255, 0.06)) 25%,
          var(--surface, rgba(255, 255, 255, 0.1)) 50%,
          var(--surface-2, rgba(255, 255, 255, 0.06)) 75%
        );
        background-size: 200% 100%;
        animation: sk-shimmer 1.4s linear infinite;
      }
      @keyframes sk-shimmer {
        from { background-position: 200% 0; }
        to   { background-position: -200% 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .sk { animation: none; opacity: 0.5; }
      }
    `,
  ],
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1em');
  readonly radius = input<string>('4px');
  readonly block = input<boolean>(true);
}
