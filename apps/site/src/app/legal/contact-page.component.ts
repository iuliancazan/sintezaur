import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { AuthService } from '../auth/auth.service';
import {
  ContactCategory,
  LegalPage as LegalPageRow,
  LegalService,
} from './legal.service';

interface CategoryOption {
  value: ContactCategory;
  label: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'cumparator', label: 'Cumpărător' },
  { value: 'vanzator', label: 'Vânzător' },
  { value: 'editor', label: 'Editor' },
  { value: 'juridic', label: 'Juridic / GDPR' },
  { value: 'altele', label: 'Altele' },
];

/**
 * `/contact` page — fetches the editable intro (same `legal_pages.slug =
 * 'contact'` row as the other static pages) and renders the submit
 * form underneath. Authenticated users have name + email pre-filled
 * (still editable). Honeypot field stays in the DOM as `hidden`-via-CSS;
 * `formStartedAt` is captured at component construction to satisfy
 * the server's >3s time-on-form check.
 */
@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="legal contact">
      <article class="legal__shell">
        @if (introLoading()) {
          <p class="legal__loading">Se încarcă…</p>
        } @else if (intro(); as page) {
          <header class="legal__head">
            <h1>{{ page.title }}</h1>
            <p class="legal__updated">
              Ultima actualizare: {{ updatedLabel() }}
            </p>
          </header>
          <div class="legal__body" [innerHTML]="renderedIntro()"></div>
        }

        @if (submitted()) {
          <div class="contact__success">
            <h2>Mesaj trimis ✓</h2>
            <p>
              Mulțumim! Răspundem în maxim 3 zile lucrătoare la
              <strong>{{ submittedEmail() }}</strong>.
            </p>
            <button type="button" class="btn" (click)="reset()">
              Trimite alt mesaj
            </button>
          </div>
        } @else {
          <form
            class="contact__form"
            [formGroup]="form"
            (ngSubmit)="submit()"
            novalidate
          >
            <h2 class="contact__form-title">Formular de contact</h2>

            @if (formError()) {
              <div class="form-error" role="alert">{{ formError() }}</div>
            }

            <div class="field">
              <label class="field__label" for="ct-name">Nume</label>
              <input
                id="ct-name"
                class="field__input"
                type="text"
                autocomplete="name"
                formControlName="name"
                maxlength="80"
              />
            </div>

            <div class="field">
              <label class="field__label" for="ct-email">Email</label>
              <input
                id="ct-email"
                class="field__input"
                type="email"
                autocomplete="email"
                inputmode="email"
                formControlName="email"
                maxlength="254"
              />
            </div>

            <div class="field">
              <label class="field__label" for="ct-category">Categorie</label>
              <select
                id="ct-category"
                class="field__input"
                formControlName="category"
              >
                @for (opt of categories; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label class="field__label" for="ct-subject">Subiect</label>
              <input
                id="ct-subject"
                class="field__input"
                type="text"
                formControlName="subject"
                maxlength="200"
              />
            </div>

            <div class="field">
              <label class="field__label" for="ct-body">Mesaj</label>
              <textarea
                id="ct-body"
                class="field__input field__textarea"
                rows="8"
                formControlName="body"
                maxlength="10000"
              ></textarea>
              <p class="field__hint">
                Minim 10 caractere. Maxim 10.000.
              </p>
            </div>

            <!-- honeypot — invisible to humans, irresistible to bots -->
            <label class="hp" aria-hidden="true" tabindex="-1">
              Website
              <input
                type="text"
                tabindex="-1"
                autocomplete="off"
                formControlName="hp"
              />
            </label>

            <button
              class="submit btn"
              type="submit"
              [disabled]="form.invalid || pending()"
            >
              {{ pending() ? 'Se trimite…' : 'Trimite mesaj' }}
            </button>
          </form>
        }
      </article>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .legal { padding: 24px 0 64px; }
      .legal__shell {
        max-width: 760px;
        margin: 0 auto;
        padding: 0 20px;
      }
      .legal__head h1 {
        font-size: 32px;
        margin: 0 0 6px;
        color: var(--ink);
      }
      .legal__updated {
        font-size: 13px;
        color: var(--ink-soft);
        margin: 0 0 24px;
      }
      .legal__body { color: var(--ink); line-height: 1.65; }
      .legal__body h2 { font-size: 20px; margin: 24px 0 10px; }
      .legal__body ul { margin: 0 0 12px; padding-left: 22px; }
      .legal__body li { margin-bottom: 4px; }
      .legal__body a { color: var(--accent); text-decoration: underline; }
      .legal__loading { color: var(--ink-soft); }

      .contact__form {
        margin-top: 32px;
        padding: 24px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
      }
      .contact__form-title {
        font-size: 20px;
        margin: 0 0 16px;
      }
      .field { margin-bottom: 14px; }
      .field__label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--ink);
      }
      .field__input {
        width: 100%;
        padding: 8px 10px;
        font-size: 14px;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: var(--bg);
        color: var(--ink);
        font-family: inherit;
      }
      .field__input:focus {
        outline: 2px solid var(--accent);
        outline-offset: -1px;
      }
      .field__textarea { resize: vertical; min-height: 120px; }
      .field__hint {
        font-size: 12px;
        color: var(--ink-soft);
        margin: 4px 0 0;
      }
      .hp {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      .btn {
        background: var(--accent);
        color: var(--accent-ink, #fff);
        border: none;
        padding: 10px 18px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .submit { margin-top: 8px; }
      .form-error {
        padding: 10px 12px;
        margin-bottom: 16px;
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.4);
        border-radius: 6px;
        color: #b71c1c;
        font-size: 14px;
      }
      .contact__success {
        margin-top: 32px;
        padding: 24px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        text-align: center;
      }
      .contact__success h2 { margin: 0 0 8px; color: var(--ink); }
      .contact__success p { color: var(--ink); margin: 0 0 16px; }
    `,
  ],
})
export class ContactPage {
  private readonly fb = inject(FormBuilder);
  private readonly legal = inject(LegalService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly categories = CATEGORY_OPTIONS;

  readonly intro = signal<LegalPageRow | null>(null);
  readonly introLoading = signal(true);
  readonly pending = signal(false);
  readonly submitted = signal(false);
  readonly submittedEmail = signal('');
  readonly formError = signal<string | null>(null);

  private readonly formStartedAt = Date.now();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    category: this.fb.nonNullable.control<ContactCategory>('altele', [
      Validators.required,
    ]),
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10_000)]],
    hp: [''],
  });

  readonly renderedIntro = computed<SafeHtml>(() => {
    const p = this.intro();
    if (!p) return '';
    const html = marked.parse(p.bodyMd, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  readonly updatedLabel = computed(() => {
    const p = this.intro();
    if (!p) return '';
    try {
      return new Date(p.updatedAt).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return p.updatedAt;
    }
  });

  constructor() {
    if (typeof document !== 'undefined') {
      document.title = 'Contact · Sintezaur';
    }
    this.loadIntro();
    this.prefillFromAuth();
  }

  private async loadIntro(): Promise<void> {
    try {
      const page = await this.legal.getPage('contact');
      this.intro.set(page);
    } catch {
      this.intro.set(null);
    } finally {
      this.introLoading.set(false);
    }
  }

  private prefillFromAuth(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.form.patchValue({
      name: user.fullName || user.username || '',
      email: user.email ?? '',
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);

    const value = this.form.getRawValue();
    try {
      await this.legal.submitContact({
        name: value.name.trim(),
        email: value.email.trim().toLowerCase(),
        category: value.category,
        subject: value.subject.trim(),
        body: value.body.trim(),
        hp: value.hp,
        formStartedAt: this.formStartedAt,
      });
      this.submittedEmail.set(value.email);
      this.submitted.set(true);
    } catch (err) {
      this.formError.set(messageFor(err));
    } finally {
      this.pending.set(false);
    }
  }

  reset(): void {
    this.submitted.set(false);
    this.form.reset({ category: 'altele' });
    this.prefillFromAuth();
  }
}

function messageFor(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 400) {
      const msg = err.error?.message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.join(', ');
      return 'Datele introduse nu sunt valide.';
    }
    if (err.status === 429) {
      return 'Prea multe mesaje. Mai încearcă peste câteva minute.';
    }
  }
  return 'A apărut o eroare neașteptată. Te rugăm încearcă mai târziu.';
}
