import { Component, inject } from '@angular/core';
import { LanguageService } from '../core/language.service';

/** EN | RO pills, same visual language as the deck's hub toggle. */
@Component({
  selector: 'ws-lang-toggle',
  template: `
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
  `,
  styles: `
    .langs {
      display: flex;
      gap: 10px;
    }
    .langs__pill {
      padding: 7px 20px;
      min-height: 0;
      border-radius: 999px;
      font-family: var(--ws-font-body);
      font-size: 14px;
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
}
