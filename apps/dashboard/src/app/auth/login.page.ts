import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { AuthService } from './auth.service';
import { DASHBOARD_ROLES, hasAnyRole } from './auth.types';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login">
      <h1 class="login__title">{{ 'auth.login.title' | t }}</h1>
      <p class="login__subtitle">{{ 'auth.login.subtitle' | t }}</p>

      @if (notStaffReason()) {
        <div class="form-error">{{ 'auth.errors.not_staff' | t }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="form-error">{{ formError() }}</div>
        }
        <div class="field">
          <label class="field__label" for="email">{{ 'auth.login.fields.email' | t }}</label>
          <input
            id="email"
            class="field__input"
            type="email"
            autocomplete="email"
            inputmode="email"
            formControlName="email"
          />
        </div>
        <div class="field">
          <label class="field__label" for="password">{{ 'auth.login.fields.password' | t }}</label>
          <input
            id="password"
            class="field__input"
            type="password"
            autocomplete="current-password"
            formControlName="password"
          />
        </div>
        <button class="submit" type="submit" [disabled]="form.invalid || pending()">
          {{ (pending() ? 'auth.shared.submitting' : 'auth.login.submit') | t }}
        </button>
      </form>
    </main>
  `,
  styles: [
    `
      .login {
        max-width: 440px;
        margin: 80px auto;
        padding: 32px 28px;
        background: var(--bg-elev);
        border: var(--grid-line) solid var(--line);
      }
      .login__title {
        font-family: var(--font-display);
        font-size: 32px;
        margin: 0 0 6px;
        color: var(--fg);
        letter-spacing: 0.02em;
      }
      .login__subtitle {
        color: var(--fg-muted);
        font-size: 14px;
        margin: 0 0 24px;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .field__label {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .field__input {
        padding: 12px 14px;
        background: var(--bg-card);
        border: var(--grid-line) solid var(--line);
        color: var(--fg);
        outline: none;
      }
      .field__input:focus {
        border-color: var(--accent);
      }
      .submit {
        padding: 14px 18px;
        background: var(--accent);
        color: var(--accent-fg);
        font-family: var(--font-mono);
        font-size: 13px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 600;
        width: 100%;
      }
      .submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .form-error {
        background: rgba(224, 122, 95, 0.12);
        border: 1px solid rgba(224, 122, 95, 0.45);
        color: #e07a5f;
        padding: 10px 14px;
        font-size: 13px;
        margin-bottom: 18px;
      }
    `,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly pending = signal(false);
  readonly formError = signal<string | null>(null);
  readonly notStaffReason = signal(
    this.route.snapshot.queryParamMap.get('reason') === 'not_staff',
  );

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);
    this.notStaffReason.set(false);
    try {
      const user = await this.auth.login(
        this.form.value.email!.trim().toLowerCase(),
        this.form.value.password!,
      );
      if (!hasAnyRole(user, DASHBOARD_ROLES)) {
        await this.auth.logout();
        this.formError.set(this.i18n.t('auth.errors.not_staff'));
        return;
      }
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.formError.set(this.mapError(err));
    } finally {
      this.pending.set(false);
    }
  }

  private mapError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        const message = String(err.error?.message ?? '').toLowerCase();
        if (message.includes('confirmat')) {
          return this.i18n.t('auth.errors.email_not_verified');
        }
        return this.i18n.t('auth.errors.invalid_credentials');
      }
      if (err.status === 429) return this.i18n.t('auth.errors.rate_limited');
    }
    return this.i18n.t('auth.shared.unexpected_error');
  }
}
