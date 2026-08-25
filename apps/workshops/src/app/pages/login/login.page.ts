import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { ToastService } from '../../core/toast.service';
import { LangToggleComponent } from '../../ui/lang-toggle.component';

interface PublicWorkshop {
  slug: string;
  titleEn: string;
  titleRo: string;
}

/** The workshop gate: one password per workshop; a discreet superadmin mode. */
@Component({
  selector: 'ws-login-page',
  imports: [FormsModule, TranslocoPipe, LangToggleComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly languageService = inject(LanguageService);

  protected readonly workshops = signal<PublicWorkshop[]>([]);
  protected readonly mode = signal<'workshop' | 'superadmin'>('workshop');
  protected readonly busy = signal(false);

  protected slug = '';
  protected password = '';

  protected readonly singleWorkshop = computed(
    () => this.workshops().length === 1,
  );

  constructor() {
    // Already logged in? Straight to the right place.
    void this.auth.resolve().then((session) => {
      if (session?.role === 'superadmin') {
        void this.router.navigateByUrl('/panel');
      } else if (session?.workshop) {
        void this.router.navigateByUrl(`/w/${session.workshop.slug}`);
      }
    });
    void firstValueFrom(this.http.get<PublicWorkshop[]>('/api/workshops'))
      .then((list) => {
        this.workshops.set(list);
        if (list.length >= 1 && !this.slug) {
          this.slug = list[0].slug;
        }
      })
      .catch(() => this.workshops.set([]));
  }

  protected workshopTitle(w: PublicWorkshop): string {
    return this.languageService.lang() === 'ro' ? w.titleRo : w.titleEn;
  }

  protected async submit() {
    if (this.busy()) {
      return;
    }
    // No silent submits: name exactly what's missing (house rule).
    if (this.mode() === 'workshop' && !this.slug) {
      this.toast.error(this.transloco.translate('login.missing_workshop'));
      return;
    }
    if (!this.password) {
      this.toast.error(this.transloco.translate('login.missing_password'));
      return;
    }
    this.busy.set(true);
    try {
      if (this.mode() === 'superadmin') {
        await this.auth.loginSuperadmin(this.password);
        await this.router.navigateByUrl('/panel');
      } else {
        const session = await this.auth.login(this.slug, this.password);
        await this.router.navigateByUrl(
          `/w/${session.workshop?.slug ?? this.slug}`,
        );
      }
    } catch (err) {
      this.toast.error(this.loginErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected switchMode(mode: 'workshop' | 'superadmin') {
    this.mode.set(mode);
    this.password = '';
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
        return this.transloco.translate('login.bad_password');
      }
    }
    return this.transloco.translate('common.error_generic');
  }
}
