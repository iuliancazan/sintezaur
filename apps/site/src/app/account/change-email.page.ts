import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { AuthService } from '../auth/auth.service';
import { AuthShellComponent } from '../auth/auth-shell.component';
import { authFormStyles } from '../auth/auth-form.styles';

@Component({
  selector: 'app-change-email-page',
  standalone: true,
  imports: [ReactiveFormsModule, AuthShellComponent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      [title]="'auth.change_email.title' | t"
      [subtitle]="'auth.change_email.subtitle' | t"
    >
      @if (sent()) {
        <div class="form-success">
          <strong>{{ 'auth.change_email.success_title' | t }}.</strong>
          {{ 'auth.change_email.success_body' | t: { email: form.value.newEmail! } }}
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }
          <div class="field">
            <label class="field__label" for="newEmail">{{ 'auth.change_email.fields.new_email' | t }}</label>
            <input
              id="newEmail"
              class="field__input"
              type="email"
              autocomplete="email"
              inputmode="email"
              formControlName="newEmail"
            />
          </div>
          <div class="field">
            <label class="field__label" for="currentPassword">{{ 'auth.change_email.fields.current_password' | t }}</label>
            <input
              id="currentPassword"
              class="field__input"
              type="password"
              autocomplete="current-password"
              formControlName="currentPassword"
            />
          </div>
          <button class="submit" type="submit" [disabled]="form.invalid || pending()">
            {{ (pending() ? 'auth.shared.submitting' : 'auth.change_email.submit') | t }}
          </button>
        </form>
      }
    </app-auth-shell>
  `,
  styles: [authFormStyles],
})
export class ChangeEmailPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  readonly form = this.fb.nonNullable.group({
    newEmail: ['', [Validators.required, Validators.email]],
    currentPassword: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly pending = signal(false);
  readonly sent = signal(false);
  readonly formError = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();
    try {
      await this.auth.changeEmail(
        value.currentPassword,
        value.newEmail.trim().toLowerCase(),
      );
      this.sent.set(true);
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          this.formError.set(this.i18n.t('auth.errors.current_password_wrong'));
        } else if (err.status === 409) {
          this.formError.set(this.i18n.t('auth.errors.email_exists'));
        } else if (err.status === 400) {
          this.formError.set(this.i18n.t('auth.errors.same_email'));
        } else {
          this.formError.set(this.i18n.t('auth.shared.unexpected_error'));
        }
      } else {
        this.formError.set(this.i18n.t('auth.shared.unexpected_error'));
      }
    } finally {
      this.pending.set(false);
    }
  }
}
