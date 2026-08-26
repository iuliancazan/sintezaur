import { Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ThemeService } from '../core/theme.service';

/**
 * The ◐ circle button from the 2026-08-26-v02 canvas: flips the portal
 * chrome between the dark and light themes (persisted, shared with the
 * production gate).
 */
@Component({
  selector: 'ws-theme-toggle',
  imports: [TranslocoPipe],
  template: `
    <button
      type="button"
      class="tt"
      [class.tt--sm]="size() === 'sm'"
      (click)="themeService.toggle()"
      [attr.aria-label]="
        (themeService.theme() === 'dark' ? 'theme.to_light' : 'theme.to_dark')
          | transloco
      "
      [title]="
        (themeService.theme() === 'dark' ? 'theme.to_light' : 'theme.to_dark')
          | transloco
      "
    >
      ◐
    </button>
  `,
  styles: `
    .tt {
      min-height: 0;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--ws-border-strong);
      border-radius: 50%;
      background: none;
      color: var(--ws-text-faint);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;

      &:hover {
        color: var(--ws-text);
        border-color: var(--ws-pager-hover-border);
      }
    }
    .tt--sm {
      width: 30px;
      height: 30px;
      font-size: 14px;
    }
    @media print {
      .tt {
        display: none;
      }
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);

  readonly size = input<'md' | 'sm'>('md');
}
