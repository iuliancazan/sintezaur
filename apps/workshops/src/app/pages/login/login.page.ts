import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import {
  brandFromSlug,
  PublicWorkshop,
  PublicWorkshopsService,
} from '../../core/public-workshops.service';
import { ToastService } from '../../core/toast.service';
import { LangToggleComponent } from '../../ui/lang-toggle.component';

/**
 * Per-workshop gate, in the workshop's own visual identity. Username +
 * password (workshops-spec.md §4.1); the reserved `superadmin` username
 * grants the panel — no separate login surface exists for it.
 */
@Component({
  selector: 'ws-login-page',
  imports: [FormsModule, TranslocoPipe, LangToggleComponent, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly publicWorkshops = inject(PublicWorkshopsService);
  protected readonly languageService = inject(LanguageService);

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly brand = brandFromSlug(this.slug);
  protected readonly workshop = signal<PublicWorkshop | null>(null);
  protected readonly busy = signal(false);

  protected username = '';
  protected password = '';

  protected readonly subtitle = computed(() => {
    const w = this.workshop();
    if (!w) {
      return '';
    }
    return (
      (this.languageService.lang() === 'ro' ? w.subtitleRo : w.subtitleEn) ??
      ''
    );
  });

  constructor() {
    // Already unlocked (or superadmin)? Straight into the hub.
    void this.auth.resolve().then((session) => {
      if (
        session &&
        (session.role === 'superadmin' || session.workshop?.slug === this.slug)
      ) {
        void this.router.navigateByUrl(`/w/${this.slug}`);
      }
    });
    void this.publicWorkshops
      .bySlug(this.slug)
      .then((w) => this.workshop.set(w));
  }

  protected async submit() {
    if (this.busy()) {
      return;
    }
    // No silent submits: name exactly what's missing (house rule).
    const missing: string[] = [];
    if (!this.username.trim()) {
      missing.push(this.transloco.translate('login.username'));
    }
    if (!this.password) {
      missing.push(this.transloco.translate('login.password'));
    }
    if (missing.length > 0) {
      this.toast.error(
        this.transloco.translate('login.missing_fields', {
          fields: missing.join(', '),
        }),
      );
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.login(this.slug, this.username, this.password);
      await this.router.navigateByUrl(`/w/${this.slug}`);
    } catch (err) {
      this.toast.error(this.loginErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  private loginErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 429) {
        return this.transloco.translate('login.throttled');
      }
      if (err.error?.message === 'unknown_workshop') {
        return this.transloco.translate('login.unknown_workshop');
      }
      if (err.status === 401) {
        return this.transloco.translate('login.bad_credentials');
      }
    }
    return this.transloco.translate('common.error_generic');
  }
}
