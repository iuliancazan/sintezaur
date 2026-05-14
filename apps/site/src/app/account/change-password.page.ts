import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { AuthService } from '../auth/auth.service';
import { AuthShellComponent } from '../auth/auth-shell.component';
import { authFormStyles } from '../auth/auth-form.styles';

@Component({
  selector: 'app-change-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, AuthShellComponent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      [title]="'auth.change_password.title' | t"
      [subtitle]="'auth.change_password.subtitle' | t"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="form-error">{{ formError() }}</div>
        }
        <div class="field">
          <label class="field__label" for="current">{{ 'auth.change_password.fields.current' | t }}</label>
          <input
            id="current"
            class="field__input"
            type="password"
            autocomplete="current-password"
            formControlName="currentPassword"
          />
        </div>
        <div class="field">
          <label class="field__label" for="new">{{ 'auth.change_password.fields.new' | t }}</label>
          <input
            id="new"
            class="field__input"
            type="password"
            autocomplete="new-password"
            formControlName="newPassword"
          />
          <span class="field__help">{{ 'auth.change_password.fields.new_help' | t }}</span>
        </div>
        <button class="submit" type="submit" [disabled]="form.invalid || pending()">
          {{ (pending() ? 'auth.shared.submitting' : 'auth.change_password.submit') | t }}
        </button>
      </form>
    </app-auth-shell>
  `,
  styles: [authFormStyles],
})
export class ChangePasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.minLength(1)]],
    newPassword: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
    ],
  });

  readonly pending = signal(false);
  readonly formError = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();
    try {
      await this.auth.changePassword(value.currentPassword, value.newPassword);
      // Server revoked sessions — bounce to login with a confirmation
      // in the next page's redirect target. Cheapest UX without
      // splitting into yet another "success" component.
      await this.router.navigateByUrl(
        '/login?password_changed=1&redirect=/cont',
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.formError.set(this.i18n.t('auth.errors.current_password_wrong'));
      } else {
        this.formError.set(this.i18n.t('auth.shared.unexpected_error'));
      }
    } finally {
      this.pending.set(false);
    }
  }
}
