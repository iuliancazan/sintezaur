import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { TPipe } from '../../i18n/t.pipe';
import { AuthService } from '../auth.service';
import { AuthShellComponent } from '../auth-shell.component';
import { authFormStyles } from '../auth-form.styles';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-shell
      [title]="'auth.reset.title' | t"
      [subtitle]="'auth.reset.subtitle' | t"
    >
      @if (!token()) {
        <div class="form-error">{{ 'auth.reset.invalid_token_body' | t }}</div>
        <div class="extra">
          <a routerLink="/forgot-password">{{ 'auth.reset.request_again' | t }}</a>
        </div>
      } @else if (success()) {
        <div class="form-success">
          <strong>{{ 'auth.reset.success_title' | t }}.</strong>
          {{ 'auth.reset.success_body' | t }}
        </div>
        <div class="extra">
          <a routerLink="/login">{{ 'auth.reset.login_link' | t }}</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError()) {
            <div class="form-error">{{ formError() }}</div>
          }
          <div class="field">
            <label class="field__label" for="password">{{ 'auth.reset.fields.password' | t }}</label>
            <input
              id="password"
              name="password"
              class="field__input"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            />
            <span class="field__help">{{ 'auth.reset.fields.password_help' | t }}</span>
          </div>
          <button class="submit" type="submit" [disabled]="form.invalid || pending()">
            {{ (pending() ? 'auth.shared.submitting' : 'auth.reset.submit') | t }}
          </button>
        </form>
      }
    </app-auth-shell>
  `,
  styles: [authFormStyles],
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);

  readonly token = signal<string | null>(
    this.route.snapshot.queryParamMap.get('token'),
  );

  readonly form = this.fb.nonNullable.group({
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
    ],
  });

  readonly pending = signal(false);
  readonly success = signal(false);
  readonly formError = signal<string | null>(null);

  async submit(): Promise<void> {
    const t = this.token();
    if (!t || this.form.invalid || this.pending()) return;
    this.pending.set(true);
    this.formError.set(null);
    try {
      await this.auth.resetPassword(t, this.form.value.password!);
      this.success.set(true);
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 400) {
          this.formError.set(this.i18n.t('auth.errors.invalid_token'));
        } else if (err.status === 429) {
          this.formError.set(this.i18n.t('auth.errors.rate_limited'));
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
