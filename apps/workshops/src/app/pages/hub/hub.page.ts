import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { VARIANT_MINUTES } from '../../content/types';
import { AuthService, type WorkshopInfo } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { VariantService } from '../../core/variant.service';
import {
  PortalNavComponent,
  type PortalCrumb,
} from '../../ui/portal-nav.component';

interface HubCard {
  key: 'slides' | 'handbook' | 'script' | 'panel';
  titleKey: string;
  hintKey: string;
  kickerKey: string;
  kickerParams?: Record<string, number>;
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
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly variantService = inject(VariantService);
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
        kickerParams: { min: VARIANT_MINUTES[this.variantService.variant()] },
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
        kickerParams: { min: VARIANT_MINUTES[this.variantService.variant()] },
        route: ['/w', slug, 'script'],
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
    // Full reload on purpose: without a session the server gates every
    // asset (lazy chunks, images), so the running SPA would strand — the
    // reload lands on the self-contained gate.
    window.location.assign('/');
  }
}
