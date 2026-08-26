import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { TrackService } from '../../core/track.service';
import { SLIDES_LOADERS } from '../../content/registry';
import type { SlideDef } from '../../content/types';
import { SlideStageComponent } from '../../ui/slide-stage.component';
import { LangToggleComponent } from '../../ui/lang-toggle.component';
import { ViewerBarComponent } from '../../ui/viewer-bar.component';

/**
 * Slides viewer (2026-08-26-v02 "Workshop Portal" 3a): slim breadcrumb bar
 * with EN|RO, ↓ PDF and ⛶ PRESENT, the named slide list + framed stage in
 * ws-slide-stage underneath.
 */
@Component({
  selector: 'ws-deck-page',
  imports: [
    SlideStageComponent,
    LangToggleComponent,
    ViewerBarComponent,
    TranslocoPipe,
  ],
  template: `
    @if (printMode) {
      <!-- ?print=1 — every slide stacked unscaled; the PDF renderer prints
           this with an exact 1920×1080 page box. -->
      <div class="deck-print">
        @for (slide of slides(); track slide.id) {
          <div class="deck-print__page" [innerHTML]="printHtml(slide)"></div>
        }
      </div>
    } @else {
      <div class="deck">
        <ws-viewer-bar
          [backLink]="['/w', slug]"
          [crumb]="crumbTitle()"
          [title]="'viewer.slides' | transloco"
        >
          <ws-lang-toggle size="sm" />
          <div class="deck__sep"></div>
          <a class="deck__pdf" [href]="pdfUrl()"
            >↓ {{ 'viewer.pdf' | transloco }}</a
          >
          <button type="button" class="deck__present" (click)="present()">
            ⛶ {{ 'viewer.present' | transloco }}
          </button>
        </ws-viewer-bar>
        @if (slides().length > 0) {
          <ws-slide-stage
            class="deck__stage"
            [slides]="slides()"
            [lang]="languageService.lang()"
            [index]="index()"
            [railHeading]="railHeading()"
            [collapseLabel]="'viewer.collapse' | transloco"
            [expandLabel]="'viewer.expand' | transloco"
            (indexChange)="onIndex($event)"
          />
        } @else {
          <p class="deck__loading">{{ 'common.loading' | transloco }}</p>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .deck {
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: var(--ws-bg);
    }
    .deck__sep {
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.12);
    }
    .deck__pdf {
      min-height: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid var(--ws-border-strong);
      border-radius: 999px;
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-text-faint);

      &:hover {
        color: var(--ws-text);
        border-color: rgba(255, 255, 255, 0.4);
      }
    }
    .deck__present {
      min-height: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border: none;
      border-radius: 999px;
      background: var(--ws-accent);
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 500;
      color: var(--ws-bg);
      cursor: pointer;

      &:hover {
        background: var(--ws-accent-bright);
      }
    }
    .deck__stage {
      flex: 1;
      min-height: 0;
    }
    .deck__loading {
      margin: auto;
      color: var(--ws-text-faint);
    }
    .deck-print__page {
      position: relative;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      break-after: page;
    }
    .deck-print__page ::ng-deep section {
      position: absolute;
      inset: 0;
      width: 1920px;
      height: 1080px;
    }
    @media (max-width: 640px) {
      .deck__present {
        display: none;
      }
    }
  `,
})
export class DeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly track = inject(TrackService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly transloco = inject(TranslocoService);
  protected readonly languageService = inject(LanguageService);

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly slides = signal<SlideDef[]>([]);
  private readonly queryIndex = signal(0);
  protected readonly printMode =
    this.route.snapshot.queryParamMap.get('print') === '1';

  private readonly stage = viewChild(SlideStageComponent);

  /** Query-param index, clamped to the loaded deck. */
  protected readonly index = computed(() =>
    Math.max(
      0,
      Math.min(this.queryIndex(), Math.max(this.slides().length - 1, 0)),
    ),
  );

  protected readonly crumbTitle = computed(() => {
    const w = this.auth.session()?.workshop;
    if (w) {
      return (
        this.languageService.lang() === 'ro' ? w.titleRo : w.titleEn
      ).toUpperCase();
    }
    return this.slug.replace(/-/g, ' ').toUpperCase();
  });

  protected readonly railHeading = computed(() => {
    this.languageService.lang();
    return `${this.transloco.translate('viewer.slides')} · ${this.slides().length}`;
  });

  constructor() {
    // Guests reach this page only when the panel toggle allows slides.
    void this.auth.resolve().then((session) => {
      if (!session) {
        return;
      }
      if (
        session.role === 'guest' &&
        !(session.workshop?.guestSeesSlides ?? false)
      ) {
        void this.router.navigateByUrl(`/w/${this.slug}`);
        return;
      }
      this.track.view('slides', this.languageService.lang());
    });

    const loader = SLIDES_LOADERS[this.slug];
    if (loader) {
      void loader().then((m) => this.slides.set(m.SLIDES));
    }

    this.route.queryParamMap.subscribe((params) => {
      const raw = Number.parseInt(params.get('s') ?? '0', 10);
      this.queryIndex.set(Number.isFinite(raw) && raw >= 0 ? raw : 0);
    });
  }

  protected printHtml(slide: SlideDef) {
    return this.sanitizer.bypassSecurityTrustHtml(
      this.languageService.lang() === 'ro' ? slide.ro : slide.en,
    );
  }

  /** PDF in the CURRENTLY SELECTED language (round 2 rule). */
  protected pdfUrl(): string {
    return `/api/pdf/${this.slug}/slides?lang=${this.languageService.lang()}`;
  }

  protected present() {
    this.stage()?.toggleFullscreen();
  }

  protected onIndex(idx: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { s: idx || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
