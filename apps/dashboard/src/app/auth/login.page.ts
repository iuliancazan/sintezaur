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
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-card__brand">
          <img src="/assets/brand/logo-white.png" alt="" />
          <span class="name">Sintezaur</span>
        </div>
        <h1 class="auth-card__title">{{ 'auth.login.title' | t }}</h1>
        <p class="auth-card__sub">{{ 'auth.login.subtitle' | t }}</p>

        @if (notStaffReason()) {
          <div class="auth-card__err">{{ 'auth.errors.not_staff' | t }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError()) {
            <div class="auth-card__err">{{ formError() }}</div>
          }
          <div class="field">
            <label class="field__label" for="email">{{ 'auth.login.fields.email' | t }}</label>
            <input
              id="email"
              class="field__input field__input--mono"
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
              class="field__input field__input--mono"
              type="password"
              autocomplete="current-password"
              formControlName="password"
            />
          </div>
          <button class="btn btn--primary" type="submit" [disabled]="form.invalid || pending()" style="width:100%;justify-content:center;margin-top:6px">
            {{ (pending() ? 'auth.shared.submitting' : 'auth.login.submit') | t }}
          </button>
        </form>
      </div>
    </div>
  `,
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
