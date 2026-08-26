import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService, type WorkshopInfo } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import {
  PortalNavComponent,
  type PortalCrumb,
} from '../../ui/portal-nav.component';

interface HubCard {
  key: 'slides' | 'handbook' | 'script' | 'run-of-show' | 'panel';
  titleKey: string;
  hintKey: string;
  kickerKey: string;
  route: string[];
}

/**
 * Workshop landing (2026-08-26-v02 "Workshop Portal" 1a/1b/2a): breadcrumb
 * nav with role pill, centered hero, MATERIALS grid, the orange PRESENTER
 * TOOLS group for staff (superadmin also gets the Control panel card) and
 * the dashed note for guests.
 */
@Component({
  selector: 'ws-hub-page',
  imports: [TranslocoPipe, RouterLink, PortalNavComponent],
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

  protected readonly slug = computed(() => this.workshop()?.slug ?? '');

  protected readonly brand = computed(() =>
    this.slug().replace(/-/g, ' ').toUpperCase(),
  );

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

  /** Chrome crumbs — "WORKSHOPS" is identical in both dictionaries. */
  protected readonly crumbs = computed<PortalCrumb[]>(() => [
    { label: 'SINTEZAUR', href: 'https://sintezaur.ro' },
    { label: 'WORKSHOPS', link: '/' },
    { label: this.title().toUpperCase() },
  ]);

  protected readonly isStaff = computed(
    () => this.role() === 'admin' || this.role() === 'superadmin',
  );
  protected readonly isSuperadmin = computed(
    () => this.role() === 'superadmin',
  );

  protected readonly materialCards = computed<HubCard[]>(() => {
    const guestSlides = this.workshop()?.guestSeesSlides ?? false;
    const slug = this.slug();
    if (!slug) {
      return [];
    }
    const cards: HubCard[] = [];
    if (this.isStaff() || guestSlides) {
      cards.push({
        key: 'slides',
        titleKey: 'hub.slides',
        hintKey: 'hub.slides_hint',
        kickerKey: 'hub.kicker_slides',
        route: ['/w', slug, 'slides'],
      });
    }
    cards.push({
      key: 'handbook',
      titleKey: 'hub.handbook',
      hintKey: 'hub.handbook_hint',
      kickerKey: 'hub.kicker_handbook',
      route: ['/w', slug, 'handbook'],
    });
    return cards;
  });

  protected readonly adminCards = computed<HubCard[]>(() => {
    const slug = this.slug();
    if (!slug || !this.isStaff()) {
      return [];
    }
    const cards: HubCard[] = [
      {
        key: 'script',
        titleKey: 'hub.script',
        hintKey: 'hub.script_hint',
        kickerKey: 'hub.kicker_script',
        route: ['/w', slug, 'script'],
      },
      {
        key: 'run-of-show',
        titleKey: 'hub.run_of_show',
        hintKey: 'hub.run_of_show_hint',
        kickerKey: 'hub.kicker_run_of_show',
        route: ['/w', slug, 'run-of-show'],
      },
    ];
    if (this.isSuperadmin()) {
      cards.push({
        key: 'panel',
        titleKey: 'hub.open_panel',
        hintKey: 'hub.panel_hint',
        kickerKey: 'hub.kicker_panel',
        route: ['/panel'],
      });
    }
    return cards;
  });

  protected async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
