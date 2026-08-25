import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { TrackService } from '../../core/track.service';
import { SLIDES_LOADERS } from '../../content/registry';
import type { SlideDef } from '../../content/types';
import { SlideStageComponent } from '../../ui/slide-stage.component';
import { LangToggleComponent } from '../../ui/lang-toggle.component';

@Component({
  selector: 'ws-deck-page',
  imports: [SlideStageComponent, LangToggleComponent, RouterLink, TranslocoPipe],
  template: `
    @if (printMode) {
      <!-- ?print=1 — every slide stacked unscaled; the PDF renderer prints
           this with an exact 1920×1080 page box. -->
      <div class="deck-print">
        @for (slide of slides(); track slide.id) {
          <div
            class="deck-print__page"
            [innerHTML]="printHtml(slide)"
          ></div>
        }
      </div>
    } @else {
      <div class="deck">
        <header class="deck__bar">
          <a class="deck__back" [routerLink]="['/w', slug]"
            >← {{ 'common.back' | transloco }}</a
          >
          <ws-lang-toggle />
        </header>
        @if (slides().length > 0) {
          <ws-slide-stage
            class="deck__stage"
            [slides]="slides()"
            [lang]="languageService.lang()"
            [index]="index()"
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
      background: #000;
    }
    .deck__bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      opacity: 0.25;
      transition: opacity 0.25s ease;
    }
    .deck__bar:hover {
      opacity: 1;
    }
    .deck__back {
      font-family: 'Lato', sans-serif;
      font-size: 13px;
      letter-spacing: 2px;
      display: inline-flex;
      align-items: center;
    }
    .deck__stage {
      flex: 1;
      min-height: 0;
    }
    .deck__loading {
      margin: auto;
      color: #8f8f8f;
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
  `,
})
export class DeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly track = inject(TrackService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly languageService = inject(LanguageService);

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly slides = signal<SlideDef[]>([]);
  private readonly queryIndex = signal(0);
  protected readonly printMode =
    this.route.snapshot.queryParamMap.get('print') === '1';

  /** Query-param index, clamped to the loaded deck. */
  protected readonly index = computed(() =>
    Math.max(
      0,
      Math.min(this.queryIndex(), Math.max(this.slides().length - 1, 0)),
    ),
  );

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

  protected onIndex(idx: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { s: idx || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
