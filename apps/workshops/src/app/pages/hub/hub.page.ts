import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService, type WorkshopInfo } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { LangToggleComponent } from '../../ui/lang-toggle.component';

interface HubCard {
  key: 'slides' | 'handbook' | 'script' | 'run-of-show';
  titleKey: string;
  hintKey: string;
  adminOnly: boolean;
  available: boolean;
  /** Router link once the deliverable exists; undefined = coming soon. */
  route?: string[];
}

@Component({
  selector: 'ws-hub-page',
  imports: [TranslocoPipe, LangToggleComponent, RouterLink],
  templateUrl: './hub.page.html',
  styleUrl: './hub.page.scss',
})
export class HubPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  protected readonly languageService = inject(LanguageService);

  protected readonly session = this.auth.session;

  /** Superadmin sessions carry no workshop — resolve it from the URL slug. */
  private readonly superadminWorkshop = signal<WorkshopInfo | null>(null);

  protected readonly workshop = computed(
    () => this.session()?.workshop ?? this.superadminWorkshop(),
  );
  protected readonly role = computed(() => this.session()?.role ?? 'guest');

  constructor() {
    void this.auth.resolve().then(async (session) => {
      if (session?.role !== 'superadmin') {
        return;
      }
      const slug = this.route.snapshot.paramMap.get('slug');
      const all = await firstValueFrom(
        this.http.get<(WorkshopInfo & { id: string })[]>(
          '/api/panel/workshops',
        ),
      );
      this.superadminWorkshop.set(all.find((w) => w.slug === slug) ?? null);
    });
  }

  protected readonly title = computed(() => {
    const w = this.workshop();
    if (!w) {
      return '';
    }
    return this.languageService.lang() === 'ro' ? w.titleRo : w.titleEn;
  });

  protected readonly subtitle = computed(() => {
    const w = this.workshop();
    if (!w) {
      return '';
    }
    return (
      (this.languageService.lang() === 'ro' ? w.subtitleRo : w.subtitleEn) ?? ''
    );
  });

  protected readonly meta = computed(() => {
    const w = this.workshop();
    if (!w) {
      return '';
    }
    const date = w.eventDate
      ? new Date(w.eventDate + 'T00:00:00').toLocaleDateString(
          this.languageService.lang() === 'ro' ? 'ro-RO' : 'en-GB',
          { day: 'numeric', month: 'long', year: 'numeric' },
        )
      : '';
    return [date, w.venue].filter(Boolean).join(' · ');
  });

  protected readonly cards = computed<HubCard[]>(() => {
    const role = this.role();
    const isStaff = role === 'admin' || role === 'superadmin';
    const guestSlides = this.workshop()?.guestSeesSlides ?? false;
    const slug = this.workshop()?.slug;
    const cards: HubCard[] = [
      {
        key: 'slides',
        titleKey: 'hub.slides',
        hintKey: 'hub.slides_hint',
        adminOnly: false,
        available: isStaff || guestSlides,
        route: slug ? ['/w', slug, 'slides'] : undefined,
      },
      {
        key: 'handbook',
        titleKey: 'hub.handbook',
        hintKey: 'hub.handbook_hint',
        adminOnly: false,
        available: true,
        route: slug ? ['/w', slug, 'handbook'] : undefined,
      },
      {
        key: 'script',
        titleKey: 'hub.script',
        hintKey: 'hub.script_hint',
        adminOnly: true,
        available: isStaff,
        route: slug ? ['/w', slug, 'script'] : undefined,
      },
      {
        key: 'run-of-show',
        titleKey: 'hub.run_of_show',
        hintKey: 'hub.run_of_show_hint',
        adminOnly: true,
        available: isStaff,
        route: slug ? ['/w', slug, 'run-of-show'] : undefined,
      },
    ];
    return cards.filter((c) => c.available);
  });

  protected readonly isSuperadmin = computed(() => this.role() === 'superadmin');

  protected async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
