import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '../../core/language.service';
import { ThemeService } from '../../core/theme.service';
import {
  brandFromSlug,
  PublicWorkshop,
  PublicWorkshopsService,
} from '../../core/public-workshops.service';
import { LangToggleComponent } from '../../ui/lang-toggle.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle.component';

/**
 * The neutral front door — Sintezaur platform branding (V05 tokens: Big
 * Shoulders Stencil display, IBM Plex, gold accent, dot grid). Each
 * workshop keeps its own visual identity behind its login.
 */
@Component({
  selector: 'ws-selection-page',
  imports: [RouterLink, TranslocoPipe, LangToggleComponent, ThemeToggleComponent],
  templateUrl: './selection.page.html',
  styleUrl: './selection.page.scss',
})
export class SelectionPage {
  private readonly publicWorkshops = inject(PublicWorkshopsService);
  protected readonly languageService = inject(LanguageService);
  protected readonly themeService = inject(ThemeService);

  protected readonly workshops = signal<PublicWorkshop[]>([]);
  protected readonly loaded = signal(false);

  protected readonly lang = computed(() => this.languageService.lang());

  constructor() {
    void this.publicWorkshops.list().then((list) => {
      this.workshops.set(list);
      this.loaded.set(true);
    });
  }

  protected brand(w: PublicWorkshop): string {
    return brandFromSlug(w.slug);
  }

  protected title(w: PublicWorkshop): string {
    return this.lang() === 'ro' ? w.titleRo : w.titleEn;
  }

  protected subtitle(w: PublicWorkshop): string {
    return (this.lang() === 'ro' ? w.subtitleRo : w.subtitleEn) ?? '';
  }

  protected meta(w: PublicWorkshop): string {
    const date = w.eventDate
      ? new Date(w.eventDate + 'T00:00:00').toLocaleDateString(
          this.lang() === 'ro' ? 'ro-RO' : 'en-GB',
          { day: 'numeric', month: 'long', year: 'numeric' },
        )
      : '';
    return [date, w.venue].filter(Boolean).join(' · ');
  }
}
