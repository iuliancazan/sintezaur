import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { ToastService } from '../../core/toast.service';
import { LangToggleComponent } from '../../ui/lang-toggle.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle.component';

export interface PanelWorkshop {
  id: string;
  slug: string;
  titleEn: string;
  titleRo: string;
  subtitleEn: string | null;
  subtitleRo: string | null;
  eventDate: string | null;
  venue: string | null;
  published: boolean;
  guestSeesSlides: boolean;
}

interface PanelAccount {
  id: string;
  username: string;
  role: 'guest' | 'admin';
  updatedAt: string;
}

interface WorkshopStats {
  logins: { role: string; total: number }[];
  views: { document: string | null; event: string; total: number }[];
  uniqueVisitors: number;
  recent: {
    role: string;
    event: string;
    document: string | null;
    lang: string | null;
    createdAt: string;
  }[];
}

interface NewWorkshopForm {
  slug: string;
  titleEn: string;
  titleRo: string;
  subtitleEn: string;
  subtitleRo: string;
  eventDate: string;
  venue: string;
}

const EMPTY_NEW: NewWorkshopForm = {
  slug: '',
  titleEn: '',
  titleRo: '',
  subtitleEn: '',
  subtitleRo: '',
  eventDate: '',
  venue: '',
};

@Component({
  selector: 'ws-panel-page',
  imports: [FormsModule, TranslocoPipe, LangToggleComponent, ThemeToggleComponent, RouterLink],
  templateUrl: './panel.page.html',
  styleUrl: './panel.page.scss',
})
export class PanelPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly languageService = inject(LanguageService);

  protected readonly workshops = signal<PanelWorkshop[]>([]);
  protected readonly stats = signal<Record<string, WorkshopStats>>({});
  protected readonly openStats = signal<Record<string, boolean>>({});
  protected readonly showNewForm = signal(false);

  protected newForm: NewWorkshopForm = { ...EMPTY_NEW };
  /** Accounts per workshop id, loaded when the section opens. */
  protected readonly accounts = signal<Record<string, PanelAccount[]>>({});
  /** New-account form inputs per workshop. */
  protected newAccounts: Record<
    string,
    { username: string; role: 'guest' | 'admin'; password: string }
  > = {};
  /** Password-reset inputs per account id. */
  protected resetInputs: Record<string, string> = {};

  constructor() {
    void this.reload();
  }

  protected async reload() {
    const list = await firstValueFrom(
      this.http.get<PanelWorkshop[]>('/api/panel/workshops'),
    );
    this.workshops.set(list);
    for (const w of list) {
      this.newAccounts[w.id] ??= { username: '', role: 'guest', password: '' };
    }
  }

  protected async loadAccounts(w: PanelWorkshop) {
    const list = await firstValueFrom(
      this.http.get<PanelAccount[]>(`/api/panel/workshops/${w.id}/accounts`),
    );
    this.accounts.update((a) => ({ ...a, [w.id]: list }));
  }

  protected async addAccount(w: PanelWorkshop) {
    const form = this.newAccounts[w.id];
    const missing: string[] = [];
    if (!form.username.trim()) {
      missing.push(this.transloco.translate('panel.account_username'));
    }
    if (!form.password) {
      missing.push(this.transloco.translate('panel.account_password'));
    }
    if (missing.length > 0) {
      this.toast.error(
        this.transloco.translate('panel.missing_fields', {
          fields: missing.join(', '),
        }),
      );
      return;
    }
    if (form.password.length < 8) {
      this.toast.error(this.transloco.translate('panel.password_too_short'));
      return;
    }
    try {
      const list = await firstValueFrom(
        this.http.post<PanelAccount[]>(
          `/api/panel/workshops/${w.id}/accounts`,
          {
            username: form.username.trim().toLowerCase(),
            role: form.role,
            password: form.password,
          },
        ),
      );
      this.accounts.update((a) => ({ ...a, [w.id]: list }));
      this.newAccounts[w.id] = { username: '', role: 'guest', password: '' };
      this.toast.success(this.transloco.translate('panel.account_created'));
    } catch (err) {
      this.toast.error(this.accountErrorMessage(err));
    }
  }

  protected async setAccountPassword(w: PanelWorkshop, account: PanelAccount) {
    const password = this.resetInputs[account.id] ?? '';
    if (!password) {
      this.toast.error(
        this.transloco.translate('panel.missing_fields', {
          fields: this.transloco.translate('panel.new_password'),
        }),
      );
      return;
    }
    if (password.length < 8) {
      this.toast.error(this.transloco.translate('panel.password_too_short'));
      return;
    }
    const list = await firstValueFrom(
      this.http.put<PanelAccount[]>(
        `/api/panel/workshops/${w.id}/accounts/${account.id}/password`,
        { password },
      ),
    );
    this.accounts.update((a) => ({ ...a, [w.id]: list }));
    this.resetInputs[account.id] = '';
    this.toast.success(this.transloco.translate('panel.password_saved'));
  }

  protected async deleteAccount(w: PanelWorkshop, account: PanelAccount) {
    const list = await firstValueFrom(
      this.http.delete<PanelAccount[]>(
        `/api/panel/workshops/${w.id}/accounts/${account.id}`,
      ),
    );
    this.accounts.update((a) => ({ ...a, [w.id]: list }));
    this.toast.success(this.transloco.translate('panel.account_deleted'));
  }

  private accountErrorMessage(err: unknown): string {
    const message =
      err instanceof HttpErrorResponse ? err.error?.message : undefined;
    if (message === 'username_taken') {
      return this.transloco.translate('panel.username_taken');
    }
    if (message === 'reserved_username') {
      return this.transloco.translate('panel.reserved_username');
    }
    if (Array.isArray(message) && String(message[0]).includes('username')) {
      return this.transloco.translate('panel.username_format');
    }
    return this.transloco.translate('common.error_generic');
  }

  protected async save(w: PanelWorkshop) {
    const missing = this.missingFields({
      titleEn: w.titleEn,
      titleRo: w.titleRo,
    });
    if (missing.length > 0) {
      this.toast.error(
        this.transloco.translate('panel.missing_fields', {
          fields: missing.join(', '),
        }),
      );
      return;
    }
    await firstValueFrom(
      this.http.patch(`/api/panel/workshops/${w.id}`, {
        titleEn: w.titleEn,
        titleRo: w.titleRo,
        subtitleEn: w.subtitleEn ?? '',
        subtitleRo: w.subtitleRo ?? '',
        eventDate: w.eventDate ?? undefined,
        venue: w.venue ?? '',
        published: w.published,
        guestSeesSlides: w.guestSeesSlides,
      }),
    );
    this.toast.success(this.transloco.translate('panel.saved'));
    await this.reload();
  }

  protected async togglePublished(w: PanelWorkshop) {
    await firstValueFrom(
      this.http.patch(`/api/panel/workshops/${w.id}`, {
        published: !w.published,
      }),
    );
    await this.reload();
  }

  protected async toggleGuestSlides(w: PanelWorkshop) {
    await firstValueFrom(
      this.http.patch(`/api/panel/workshops/${w.id}`, {
        guestSeesSlides: !w.guestSeesSlides,
      }),
    );
    await this.reload();
  }

  protected async create() {
    const missing = this.missingFields({
      slug: this.newForm.slug,
      titleEn: this.newForm.titleEn,
      titleRo: this.newForm.titleRo,
    });
    if (missing.length > 0) {
      this.toast.error(
        this.transloco.translate('panel.missing_fields', {
          fields: missing.join(', '),
        }),
      );
      return;
    }
    await firstValueFrom(
      this.http.post('/api/panel/workshops', {
        slug: this.newForm.slug,
        titleEn: this.newForm.titleEn,
        titleRo: this.newForm.titleRo,
        subtitleEn: this.newForm.subtitleEn || undefined,
        subtitleRo: this.newForm.subtitleRo || undefined,
        eventDate: this.newForm.eventDate || undefined,
        venue: this.newForm.venue || undefined,
      }),
    );
    this.newForm = { ...EMPTY_NEW };
    this.showNewForm.set(false);
    this.toast.success(this.transloco.translate('panel.created'));
    await this.reload();
  }

  protected async toggleStats(w: PanelWorkshop) {
    const open = { ...this.openStats() };
    open[w.id] = !open[w.id];
    this.openStats.set(open);
    if (open[w.id]) {
      const stats = await firstValueFrom(
        this.http.get<WorkshopStats>(`/api/panel/workshops/${w.id}/stats`),
      );
      this.stats.update((s) => ({ ...s, [w.id]: stats }));
    }
  }

  protected loginsFor(id: string, role: string): number {
    return (
      this.stats()[id]?.logins.find((l) => l.role === role)?.total ?? 0
    );
  }

  protected formatWhen(iso: string): string {
    return new Date(iso).toLocaleString(
      this.languageService.lang() === 'ro' ? 'ro-RO' : 'en-GB',
      { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
    );
  }

  protected async logout() {
    await this.auth.logout();
    // Full reload on purpose: without a session the server gates every
    // asset (lazy chunks, images), so the running SPA would strand — the
    // reload lands on the self-contained gate.
    window.location.assign('/');
  }

  private missingFields(fields: Record<string, string | null>): string[] {
    return Object.entries(fields)
      .filter(([, value]) => !value || value.trim().length === 0)
      .map(([key]) => this.transloco.translate(`panel.${labelKey(key)}`));
  }
}

function labelKey(field: string): string {
  switch (field) {
    case 'slug':
      return 'slug';
    case 'titleEn':
      return 'title_en';
    case 'titleRo':
      return 'title_ro';
    default:
      return field;
  }
}
