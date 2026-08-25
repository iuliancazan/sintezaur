import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { ToastService } from '../../core/toast.service';
import { LangToggleComponent } from '../../ui/lang-toggle.component';

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
  hasGuestPassword: boolean;
  hasAdminPassword: boolean;
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
  imports: [FormsModule, TranslocoPipe, LangToggleComponent, RouterLink],
  templateUrl: './panel.page.html',
  styleUrl: './panel.page.scss',
})
export class PanelPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly languageService = inject(LanguageService);

  protected readonly workshops = signal<PanelWorkshop[]>([]);
  protected readonly stats = signal<Record<string, WorkshopStats>>({});
  protected readonly openStats = signal<Record<string, boolean>>({});
  protected readonly showNewForm = signal(false);

  protected newForm: NewWorkshopForm = { ...EMPTY_NEW };
  /** Per-workshop password inputs (cleared after set). */
  protected passwords: Record<string, { guest: string; admin: string }> = {};

  constructor() {
    void this.reload();
  }

  protected async reload() {
    const list = await firstValueFrom(
      this.http.get<PanelWorkshop[]>('/api/panel/workshops'),
    );
    this.workshops.set(list);
    for (const w of list) {
      this.passwords[w.id] ??= { guest: '', admin: '' };
    }
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

  protected async setPasswords(w: PanelWorkshop) {
    const input = this.passwords[w.id];
    const body: Record<string, string> = {};
    if (input.guest) {
      body['guestPassword'] = input.guest;
    }
    if (input.admin) {
      body['adminPassword'] = input.admin;
    }
    if (Object.keys(body).length === 0) {
      this.toast.error(
        this.transloco.translate('panel.missing_fields', {
          fields: this.transloco.translate('panel.passwords'),
        }),
      );
      return;
    }
    if (
      (body['guestPassword'] && body['guestPassword'].length < 8) ||
      (body['adminPassword'] && body['adminPassword'].length < 8)
    ) {
      this.toast.error(this.transloco.translate('panel.password_too_short'));
      return;
    }
    await firstValueFrom(
      this.http.put(`/api/panel/workshops/${w.id}/passwords`, body),
    );
    this.passwords[w.id] = { guest: '', admin: '' };
    this.toast.success(this.transloco.translate('panel.passwords_saved'));
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
    await this.router.navigateByUrl('/');
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
