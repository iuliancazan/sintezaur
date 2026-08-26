import { Component, inject, input } from '@angular/core';
import { LanguageService } from '../core/language.service';

/**
 * EN | RO toggle. Two skins:
 *  - `segment` (default) — the redesigned joined pill: one bordered capsule,
 *    active half filled orange (2026-08-26-v02 "Workshop Portal");
 *  - `outline` — the separate outlined pills kept by the Sintezaur-branded
 *    selection page (rebrandable via --lt-accent).
 * `size="sm"` is the compact viewer-bar variant.
 */
@Component({
  selector: 'ws-lang-toggle',
  template: `
    @if (variant() === 'segment') {
      <div class="seg" [class.seg--sm]="size() === 'sm'">
        <button
          type="button"
          class="seg__half"
          [class.seg__half--active]="languageService.lang() === 'en'"
          (click)="languageService.set('en')"
        >
          EN
        </button>
        <button
          type="button"
          class="seg__half"
          [class.seg__half--active]="languageService.lang() === 'ro'"
          (click)="languageService.set('ro')"
        >
          RO
        </button>
      </div>
    } @else {
      <div class="langs">
        <button
          type="button"
          class="langs__pill"
          [class.langs__pill--active]="languageService.lang() === 'en'"
          (click)="languageService.set('en')"
        >
          EN
        </button>
        <button
          type="button"
          class="langs__pill"
          [class.langs__pill--active]="languageService.lang() === 'ro'"
          (click)="languageService.set('ro')"
        >
          RO
        </button>
      </div>
    }
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
      padding: 7px 18px;
      border: none;
      background: none;
      font-family: var(--ws-font-mono);
      font-size: 12px;
      letter-spacing: 2px;
      color: var(--ws-text-faint);
      cursor: pointer;
    }
    .seg--sm .seg__half {
      padding: 5px 14px;
      font-size: 11px;
    }
    .seg__half--active {
      background: var(--ws-accent);
      color: var(--ws-bg);
      font-weight: 500;
    }

    .langs {
      display: flex;
      gap: 10px;
    }
    .langs__pill {
      padding: 7px 20px;
      min-height: 0;
      border-radius: 999px;
      font-family: var(--ws-font-mono);
      font-size: 13px;
      letter-spacing: 3px;
      background: none;
      border: 2px solid var(--ws-card-border);
      color: var(--ws-text-faint);
      cursor: pointer;
    }
    .langs__pill--active {
      /* Pages can rebrand the toggle via --lt-accent (e.g. Sintezaur gold). */
      border-color: var(--lt-accent, var(--ws-accent-bright));
      color: var(--lt-accent, var(--ws-accent-bright));
    }
  `,
})
export class LangToggleComponent {
  protected readonly languageService = inject(LanguageService);

  readonly variant = input<'segment' | 'outline'>('segment');
  readonly size = input<'md' | 'sm'>('md');
}
