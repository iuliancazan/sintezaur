import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastService } from '../ui/toast.service';
import {
  FeedbackKind,
  FeedbackService,
} from './feedback.service';

interface KindOption {
  value: FeedbackKind;
  label: string;
  hint: string;
}

const KINDS: KindOption[] = [
  {
    value: 'bug',
    label: 'Bug',
    hint: 'Ceva nu funcționează — buton care nu răspunde, mesaj de eroare, layout stricat.',
  },
  {
    value: 'sugestie',
    label: 'Sugestie',
    hint: 'O idee de îmbunătățire — funcționalitate lipsă, UX care ar putea fi mai bun.',
  },
  {
    value: 'altele',
    label: 'Altele',
    hint: 'Orice altceva — laude, întrebări generale, idei strategice.',
  },
];

/**
 * Feedback modal mounted in the root shell. Listens to
 * `FeedbackService.open$` — opens via `feedback.open()` from anywhere.
 * Captures `window.location.pathname + search` automatically.
 *
 * Auth required at API level: the call site (the link in
 * `/cont/account-home`) is behind the auth guard, but a logged-out
 * user reaching `feedback.open()` from elsewhere will still see the
 * modal and get a 401 on submit — the global error interceptor
 * already toasts a friendly message, so no extra UX is needed here.
 */
@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (feedback.open$()) {
      <div
        class="fb-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-title"
        (click)="onBackdropClick($event)"
      >
        <div class="fb-modal">
          <header class="fb-modal__head">
            <h2 id="fb-title">Trimite feedback</h2>
            <button
              class="fb-modal__close"
              type="button"
              aria-label="Închide formularul de feedback"
              (click)="close()"
            >
              ×
            </button>
          </header>

          @if (submitted()) {
            <div class="fb-success">
              <p><strong>Mulțumim!</strong></p>
              <p>
                Am primit feedback-ul tău și o să-l citim cât de curând.
              </p>
              <button class="fb-btn" type="button" (click)="reset()">
                Trimite alt feedback
              </button>
              <button class="fb-btn fb-btn--ghost" type="button" (click)="close()">
                Închide
              </button>
            </div>
          } @else {
            <form
              class="fb-form"
              [formGroup]="form"
              (ngSubmit)="submit()"
              novalidate
            >
              <p class="fb-lede">
                Suntem în beta — feedback-ul tău e cel mai util. Mai
                ales bug-urile.
              </p>

              <fieldset class="fb-kind">
                <legend class="fb-kind__legend">Tip feedback</legend>
                @for (k of kinds; track k.value) {
                  <label class="fb-kind__opt">
                    <input
                      type="radio"
                      [value]="k.value"
                      formControlName="kind"
                    />
                    <span>
                      <strong>{{ k.label }}</strong>
                      <small>{{ k.hint }}</small>
                    </span>
                  </label>
                }
              </fieldset>

              <label class="fb-field">
                <span class="fb-field__label">Mesaj</span>
                <textarea
                  class="fb-field__input"
                  rows="6"
                  formControlName="body"
                  placeholder="Descrie cât mai specific — ce ai făcut, ce s-a întâmplat, ce te așteptai să se întâmple."
                  maxlength="10000"
                ></textarea>
                <small class="fb-field__hint">
                  Minim 10 caractere. Pagina curentă o reținem automat:
                  <code>{{ capturedUrl() }}</code>
                </small>
              </label>

              <div class="fb-actions">
                <button
                  class="fb-btn fb-btn--ghost"
                  type="button"
                  (click)="close()"
                >
                  Renunță
                </button>
                <button
                  class="fb-btn"
                  type="submit"
                  [disabled]="form.invalid || pending()"
                >
                  {{ pending() ? 'Se trimite…' : 'Trimite' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host { display: contents; }
      .fb-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        z-index: 1200;
        padding: 40px 16px;
        overflow-y: auto;
      }
      .fb-modal {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        width: min(560px, 100%);
        padding: 22px 24px 18px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      }
      .fb-modal__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .fb-modal__head h2 {
        margin: 0;
        font-size: 20px;
        color: var(--ink);
      }
      .fb-modal__close {
        background: transparent;
        border: none;
        color: var(--ink-soft);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .fb-modal__close:hover { color: var(--ink); }
      .fb-lede {
        margin: 0 0 14px;
        font-size: 13px;
        color: var(--ink-soft);
      }
      .fb-kind {
        border: none;
        margin: 0 0 14px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .fb-kind__legend {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--ink);
      }
      .fb-kind__opt {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 8px 10px;
        border: 1px solid var(--line);
        border-radius: 6px;
        cursor: pointer;
      }
      .fb-kind__opt:hover { background: var(--surface-2); }
      .fb-kind__opt input[type='radio'] { margin-top: 3px; }
      .fb-kind__opt strong {
        display: block;
        font-size: 13px;
        color: var(--ink);
        margin-bottom: 2px;
      }
      .fb-kind__opt small {
        font-size: 12px;
        color: var(--ink-soft);
        line-height: 1.4;
      }
      .fb-field { display: block; margin-bottom: 14px; }
      .fb-field__label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--ink);
      }
      .fb-field__input {
        width: 100%;
        padding: 8px 10px;
        font-family: inherit;
        font-size: 14px;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: var(--bg);
        color: var(--ink);
        resize: vertical;
      }
      .fb-field__input:focus {
        outline: 2px solid var(--accent);
        outline-offset: -1px;
      }
      .fb-field__hint {
        display: block;
        font-size: 12px;
        color: var(--ink-soft);
        margin-top: 4px;
        line-height: 1.4;
      }
      .fb-field__hint code {
        background: var(--surface-2);
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 11px;
      }
      .fb-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .fb-btn {
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 600;
        border: none;
        border-radius: 6px;
        background: var(--accent);
        color: var(--accent-ink, #fff);
        cursor: pointer;
      }
      .fb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .fb-btn--ghost {
        background: transparent;
        color: var(--ink);
        border: 1px solid var(--line);
      }
      .fb-success {
        padding: 14px 4px;
        text-align: center;
      }
      .fb-success p { margin: 0 0 8px; color: var(--ink); }
      .fb-success .fb-btn { margin: 4px; }
      @media (max-width: 600px) {
        .fb-backdrop { padding: 16px; }
      }
    `,
  ],
})
export class FeedbackModal {
  readonly feedback = inject(FeedbackService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly kinds = KINDS;
  readonly pending = signal(false);
  readonly submitted = signal(false);
  readonly capturedUrl = signal('');

  readonly form = this.fb.nonNullable.group({
    kind: this.fb.nonNullable.control<FeedbackKind>('bug', [
      Validators.required,
    ]),
    body: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10_000)]],
  });

  constructor() {
    // Refresh the captured URL on each open. The signal is read inside
    // an effect-friendly way via the template; we also re-stamp it on
    // explicit reset.
    if (typeof window !== 'undefined') {
      this.capturedUrl.set(this.currentUrl());
    }
  }

  private currentUrl(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.pathname}${window.location.search}`;
  }

  onBackdropClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.close();
  }

  close(): void {
    this.feedback.close();
    // Reset state for next time, but only after the modal animates out.
    setTimeout(() => {
      if (!this.feedback.open$()) {
        this.submitted.set(false);
        this.pending.set(false);
        this.form.reset({ kind: 'bug', body: '' });
      }
    }, 100);
  }

  reset(): void {
    this.submitted.set(false);
    this.form.reset({ kind: 'bug', body: '' });
    this.capturedUrl.set(this.currentUrl());
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    const value = this.form.getRawValue();
    try {
      await this.feedback.submit({
        kind: value.kind,
        body: value.body.trim(),
        pageUrl: this.capturedUrl(),
      });
      this.submitted.set(true);
      this.toast.success('Feedback trimis ✓');
    } catch (err) {
      // 401 → toast deja interpus de http error interceptor pentru cazul
      // anonymous; alte erori sunt prinse global. Reset pending state.
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.toast.warn('Trebuie să fii autentificat ca să trimiți feedback.');
        this.close();
      }
    } finally {
      this.pending.set(false);
    }
  }
}
