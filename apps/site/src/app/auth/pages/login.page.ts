import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AuthService } from '../auth.service';
import { AuthShellComponent } from '../auth-shell.component';
import { authFormStyles } from '../auth-form.styles';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      [title]="'auth.login.title' | t"
      [subtitle]="'auth.login.subtitle' | t"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="form-error">{{ formError() }}</div>
        }
        <div class="field">
          <label class="field__label" for="email">{{ 'auth.login.fields.email' | t }}</label>
          <input
            id="email"
            name="email"
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
            name="password"
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
      <div class="extra">
        <a routerLink="/forgot-password">{{ 'auth.login.forgot_link' | t }}</a>
      </div>
      <div class="extra">
        {{ 'auth.login.no_account' | t }}
        <a routerLink="/signup">{{ 'auth.login.signup_link' | t }}</a>
      </div>
    </app-auth-shell>
  `,
  styles: [authFormStyles],
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

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();
    try {
      await this.auth.login(value.email.trim().toLowerCase(), value.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
      await this.router.navigateByUrl(redirect);
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
        if (message.includes('blocat')) {
          return this.i18n.t('auth.errors.account_locked');
        }
        return this.i18n.t('auth.errors.invalid_credentials');
      }
      if (err.status === 429) return this.i18n.t('auth.errors.rate_limited');
    }
    return this.i18n.t('auth.shared.unexpected_error');
  }
}
