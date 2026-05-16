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
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      [title]="'auth.forgot.title' | t"
      [subtitle]="'auth.forgot.subtitle' | t"
    >
      @if (sent()) {
        <div class="form-success">
          <strong>{{ 'auth.forgot.success_title' | t }}.</strong>
          {{ 'auth.forgot.success_body' | t: { email: form.value.email! } }}
        </div>
        <div class="extra">
          <a routerLink="/login">{{ 'auth.forgot.back_login' | t }}</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }
          <div class="field">
            <label class="field__label" for="email">{{ 'auth.forgot.fields.email' | t }}</label>
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
          <button class="submit" type="submit" [disabled]="form.invalid || pending()">
            {{ (pending() ? 'auth.shared.submitting' : 'auth.forgot.submit') | t }}
          </button>
        </form>
        <div class="extra">
          <a routerLink="/login">{{ 'auth.forgot.back_login' | t }}</a>
        </div>
      }
    </app-auth-shell>
  `,
  styles: [authFormStyles],
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly pending = signal(false);
  readonly sent = signal(false);
  readonly formError = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);
    try {
      await this.auth.forgotPassword(this.form.value.email!.trim().toLowerCase());
      this.sent.set(true);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 429) {
        this.formError.set(this.i18n.t('auth.errors.rate_limited'));
      } else {
        this.formError.set(this.i18n.t('auth.shared.unexpected_error'));
      }
    } finally {
      this.pending.set(false);
    }
  }
}
