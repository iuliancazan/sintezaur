import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AuthService } from '../auth.service';
import { AuthShellComponent } from '../auth-shell.component';
import { authFormStyles } from '../auth-form.styles';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      [title]="'auth.signup.title' | t"
      [subtitle]="'auth.signup.subtitle' | t"
    >
      @if (success()) {
        <div class="form-success">
          <strong>{{ 'auth.signup.success_title' | t }}.</strong>
          {{ 'auth.signup.success_body' | t: { email: form.value.email! } }}
        </div>
        <div class="extra">
          <a routerLink="/login">{{ 'auth.login.title' | t }}</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }
          <div class="field">
            <label class="field__label" for="email">{{ 'auth.signup.fields.email' | t }}</label>
            <input
              id="email"
              name="email"
              class="field__input"
              type="email"
              autocomplete="email"
              inputmode="email"
              formControlName="email"
            />
            <span class="field__help">{{ 'auth.signup.fields.email_help' | t }}</span>
          </div>
          <div class="field">
            <label class="field__label" for="username">{{ 'auth.signup.fields.username' | t }}</label>
            <input
              id="username"
              name="username"
              class="field__input"
              type="text"
              autocapitalize="none"
              autocomplete="username"
              formControlName="username"
            />
            <span class="field__help">{{ 'auth.signup.fields.username_help' | t }}</span>
          </div>
          <div class="field">
            <label class="field__label" for="fullName">{{ 'auth.signup.fields.full_name' | t }}</label>
            <input
              id="fullName"
              name="fullName"
              class="field__input"
              type="text"
              autocomplete="name"
              formControlName="fullName"
            />
            <span class="field__help">{{ 'auth.signup.fields.full_name_help' | t }}</span>
          </div>
          <div class="field">
            <label class="field__label" for="password">{{ 'auth.signup.fields.password' | t }}</label>
            <input
              id="password"
              name="password"
              class="field__input"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            />
            <span class="field__help">{{ 'auth.signup.fields.password_help' | t }}</span>
          </div>
          <button class="submit" type="submit" [disabled]="form.invalid || pending()">
            {{ (pending() ? 'auth.shared.submitting' : 'auth.signup.submit') | t }}
          </button>
        </form>
        <div class="extra">
          {{ 'auth.signup.have_account' | t }}
          <a routerLink="/login">{{ 'auth.signup.login_link' | t }}</a>
        </div>
      }
    </app-auth-shell>
  `,
  styles: [authFormStyles],
})
export class SignupPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/),
      ],
    ],
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
    ],
  });

  readonly pending = signal(false);
  readonly success = signal(false);
  readonly formError = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();
    try {
      await this.auth.signup({
        email: value.email.trim().toLowerCase(),
        username: value.username.trim().toLowerCase(),
        fullName: value.fullName.trim(),
        password: value.password,
      });
      this.success.set(true);
    } catch (err) {
      this.formError.set(this.mapError(err));
    } finally {
      this.pending.set(false);
    }
  }

  private mapError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 409) {
        const message = String(err.error?.message ?? '');
        if (message.toLowerCase().includes('username')) {
          return this.i18n.t('auth.errors.username_taken');
        }
        return this.i18n.t('auth.errors.email_exists');
      }
      if (err.status === 429) return this.i18n.t('auth.errors.rate_limited');
    }
    return this.i18n.t('auth.shared.unexpected_error');
  }
}
