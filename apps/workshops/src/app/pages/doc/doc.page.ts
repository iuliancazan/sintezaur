import {
  afterRenderEffect,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { ThemeService } from '../../core/theme.service';
import { TrackService } from '../../core/track.service';
import {
  HANDBOOK_LOADERS,
  RUN_OF_SHOW_LOADERS,
  SCRIPT_LOADERS,
} from '../../content/registry';
import type { DocPageDef } from '../../content/types';
import { DocPageComponent } from '../../ui/doc-page.component';
import { LangToggleComponent } from '../../ui/lang-toggle.component';
import { ViewerBarComponent } from '../../ui/viewer-bar.component';
import {
  ViewerRailComponent,
  type RailItem,
} from '../../ui/viewer-rail.component';

export type DocKind = 'handbook' | 'script' | 'run-of-show';

const TITLE_KEYS: Record<DocKind, string> = {
  handbook: 'hub.handbook',
  script: 'hub.script',
  'run-of-show': 'hub.run_of_show',
};

const RAIL_HEADING_KEYS: Record<DocKind, string> = {
  handbook: 'viewer.contents',
  script: 'viewer.modules',
  'run-of-show': 'viewer.sections',
};

/** Adobe-style zoom stops for the document sheets. */
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const ZOOM_KEY = 'ws_doc_zoom';

function initialZoom(): number {
  try {
    const stored = Number.parseFloat(localStorage.getItem(ZOOM_KEY) ?? '1');
    if (ZOOM_STEPS.includes(stored)) {
      return stored;
    }
  } catch {
    // storage unavailable — start at 100%
  }
  return 1;
}

/**
 * Document viewer (2026-08-26-v02 "Workshop Portal" 4a–4c): slim breadcrumb
 * bar with per-document controls, contents rail on the left, and the pages
 * floating over the dot grid. The handbook gets a SCREEN|PRINT theme
 * toggle; script + run of show render as light paper on screen, matching
 * their print look.
 */
@Component({
  selector: 'ws-doc-view-page',
  imports: [
    DocPageComponent,
    LangToggleComponent,
    ViewerBarComponent,
    ViewerRailComponent,
    TranslocoPipe,
  ],
  template: `
    <div class="docview">
      <ws-viewer-bar
        [backLink]="['/w', slug]"
        [crumb]="crumbTitle()"
        [title]="titleKey | transloco"
      >
        <ws-lang-toggle size="sm" />
        @if (kind === 'handbook') {
          <div class="docview__seg">
            <button
              type="button"
              class="docview__seg-half"
              [class.docview__seg-half--active]="!lightPreview()"
              (click)="lightPreview.set(false)"
            >
              {{ 'viewer.screen' | transloco }}
            </button>
            <button
              type="button"
              class="docview__seg-half"
              [class.docview__seg-half--active]="lightPreview()"
              (click)="lightPreview.set(true)"
            >
              {{ 'viewer.print' | transloco }}
            </button>
          </div>
        } @else {
          <span class="docview__chip">
            <span class="docview__chip-dot"></span>
            {{ 'hub.admin_only' | transloco }}
          </span>
        }
        <div class="docview__sep"></div>
        <div class="docview__zoomctl">
          <button
            type="button"
            class="docview__zoombtn"
            (click)="zoomOut()"
            [disabled]="zoom() <= minZoom"
            [attr.aria-label]="'viewer.zoom_out' | transloco"
          >
            −
          </button>
          <button
            type="button"
            class="docview__zoompct"
            (click)="zoomReset()"
            [attr.aria-label]="'viewer.zoom_reset' | transloco"
            [title]="'viewer.zoom_reset' | transloco"
          >
            {{ zoomPercent() }}
          </button>
          <button
            type="button"
            class="docview__zoombtn"
            (click)="zoomIn()"
            [disabled]="zoom() >= maxZoom"
            [attr.aria-label]="'viewer.zoom_in' | transloco"
          >
            +
          </button>
        </div>
        <div class="docview__sep"></div>
        <button type="button" class="docview__ghost" (click)="print()">
          {{ 'viewer.print' | transloco }}
        </button>
        <a class="docview__pdf" [href]="pdfUrl()"
          >↓ {{ 'viewer.pdf' | transloco }}</a
        >
      </ws-viewer-bar>

      <div class="docview__body">
        @if (railItems().length > 1) {
          <ws-viewer-rail
            class="docview__rail"
            [heading]="railHeadingKey | transloco"
            [items]="railItems()"
            [activeIndex]="activeToc()"
            (rowSelect)="scrollToToc($event)"
          />
        }
        <div class="docview__well" #wellEl (scroll)="onWellScroll()">
          @if (loaded()) {
            <div class="docview__zoom" [style.zoom]="effectiveZoom()">
              <ws-doc-page
                [pages]="pages()"
                [flowing]="flowingHtml()"
                [lightPreview]="lightPreview()"
              />
            </div>
          } @else {
            <p class="docview__loading">{{ 'common.loading' | transloco }}</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--ws-bg);
    }
    .docview {
      height: 100dvh;
      display: flex;
      flex-direction: column;
    }
    .docview__body {
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .docview__rail {
      flex: none;
    }
    .docview__well {
      flex: 1;
      min-width: 0;
      overflow: auto;
      padding: 36px 40px 60px;
      background-image: var(--ws-dotgrid-well);
      background-size: var(--ws-dotgrid-size);
      scroll-behavior: smooth;
    }
    /* Zoomed sheets: size to content and center; wider than the well =
     * horizontal scroll from the left edge (no clipped content). */
    .docview__zoom {
      width: max-content;
      margin: 0 auto;
    }
    /* Anchors for the contents rail (inside trusted course HTML). */
    .docview__well ::ng-deep h2 {
      scroll-margin-top: 24px;
    }
    /* ---- bar controls ---- */
    .docview__seg {
      display: flex;
      border: 1px solid var(--ws-border-strong);
      border-radius: 999px;
      overflow: hidden;
    }
    .docview__seg-half {
      min-height: 0;
      padding: 5px 14px;
      border: none;
      background: none;
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-text-faint);
      cursor: pointer;
    }
    .docview__seg-half--active {
      background: var(--ws-seg-active-bg);
      color: var(--ws-text);
    }
    .docview__chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--ws-accent-border);
      border-radius: 999px;
      padding: 5px 12px;
      font-family: var(--ws-font-mono);
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-accent-bright);
      white-space: nowrap;
    }
    .docview__chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ws-accent-bright);
    }
    .docview__sep {
      width: 1px;
      height: 20px;
      background: var(--ws-hairline);
    }
    .docview__zoomctl {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .docview__zoombtn {
      min-height: 0;
      width: 26px;
      height: 26px;
      border: 1px solid var(--ws-border-strong);
      border-radius: 50%;
      background: none;
      color: var(--ws-text-faint);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;

      &:hover:not(:disabled) {
        color: var(--ws-text);
        border-color: var(--ws-pager-hover-border);
      }

      &:disabled {
        opacity: 0.35;
        cursor: default;
      }
    }
    .docview__zoompct {
      min-height: 0;
      min-width: 46px;
      padding: 4px 6px;
      border: none;
      background: none;
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 1px;
      color: var(--ws-text-label);
      cursor: pointer;

      &:hover {
        color: var(--ws-text);
      }
    }
    .docview__ghost {
      min-height: 0;
      padding: 6px 14px;
      border: 1px solid var(--ws-border-strong);
      border-radius: 999px;
      background: none;
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-text-faint);
      cursor: pointer;

      &:hover {
        color: var(--ws-text);
        border-color: var(--ws-pager-hover-border);
      }
    }
    .docview__pdf {
      min-height: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 999px;
      background: var(--ws-accent);
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 500;
      color: var(--ws-bg);

      &:hover {
        background: var(--ws-accent-bright);
        color: var(--ws-bg);
      }
    }
    .docview__loading {
      padding: 60px;
      text-align: center;
      color: var(--ws-text-faint);
    }
    @media (max-width: 860px) {
      .docview__rail {
        display: none;
      }
      .docview__well {
        padding: 20px 12px 40px;
      }
      .docview__chip {
        display: none;
      }
    }
    @media (max-width: 640px) {
      .docview__ghost {
        display: none; /* printing from a phone: use the PDF */
      }
      .docview__sep {
        display: none;
      }
    }
    @media print {
      :host,
      .docview {
        height: auto;
        background: #fff;
      }
      .docview__body {
        display: block;
      }
      .docview__well {
        overflow: visible;
        padding: 0;
        background-image: none;
      }
      .docview__zoom {
        zoom: 1 !important;
        width: auto;
        margin: 0;
      }
    }
  `,
})
export class DocViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly track = inject(TrackService);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  private readonly languageService = inject(LanguageService);

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly kind = (this.route.snapshot.data['doc'] ??
    'handbook') as DocKind;
  protected readonly titleKey = TITLE_KEYS[this.kind];
  protected readonly railHeadingKey = RAIL_HEADING_KEYS[this.kind];

  private readonly wellEl =
    viewChild.required<ElementRef<HTMLDivElement>>('wellEl');

  private readonly handbookPages = signal<DocPageDef[] | null>(null);
  private readonly flowingDoc = signal<{ en: string; ro: string } | null>(
    null,
  );
  /** Handbook opens in the theme's face; the SCREEN|PRINT toggle overrides. */
  protected readonly lightPreview = signal(
    this.kind === 'handbook' && inject(ThemeService).theme() === 'light',
  );
  protected readonly activeToc = signal(0);

  protected readonly zoom = signal(initialZoom());
  protected readonly minZoom = ZOOM_STEPS[0];
  protected readonly maxZoom = ZOOM_STEPS[ZOOM_STEPS.length - 1];
  protected readonly zoomPercent = computed(
    () => `${Math.round(this.zoom() * 100)}%`,
  );

  /** Fit-to-width on narrow screens: 100% = the sheet fills the well; the
   * user zoom multiplies on top (Adobe-style "fit width" semantics). */
  private readonly fitScale = signal(1);
  protected readonly effectiveZoom = computed(() =>
    Number((this.fitScale() * this.zoom()).toFixed(4)),
  );

  /** Flowing docs: rail rows derived from the rendered section headers. */
  private readonly flowingToc = signal<RailItem[]>([]);
  private tocTargets: HTMLElement[] = [];

  protected readonly loaded = computed(
    () => this.handbookPages() !== null || this.flowingDoc() !== null,
  );

  protected readonly pages = computed<string[] | null>(() => {
    const pages = this.handbookPages();
    if (!pages) {
      return null;
    }
    const lang = this.languageService.lang();
    return pages.map((p) => (lang === 'ro' ? p.ro : p.en));
  });

  protected readonly flowingHtml = computed<string | null>(() => {
    const doc = this.flowingDoc();
    if (!doc) {
      return null;
    }
    return this.languageService.lang() === 'ro' ? doc.ro : doc.en;
  });

  protected readonly crumbTitle = computed(() => {
    const w = this.auth.session()?.workshop;
    if (w) {
      return (
        this.languageService.lang() === 'ro' ? w.titleRo : w.titleEn
      ).toUpperCase();
    }
    return this.slug.replace(/-/g, ' ').toUpperCase();
  });

  protected readonly railItems = computed<RailItem[]>(() => {
    const pages = this.handbookPages();
    if (pages) {
      return pages.map((p, i) => ({
        label: p.label ?? p.id,
        meta: String(i + 1),
      }));
    }
    return this.flowingToc();
  });

  constructor() {
    this.track.view(this.kind, this.languageService.lang());
    void this.auth.resolve();
    if (this.kind === 'handbook') {
      void HANDBOOK_LOADERS[this.slug]?.().then((m) =>
        this.handbookPages.set(m.HANDBOOK_PAGES),
      );
    } else if (this.kind === 'script') {
      void SCRIPT_LOADERS[this.slug]?.().then((m) =>
        this.flowingDoc.set(m.PRESENTER_SCRIPT),
      );
    } else {
      void RUN_OF_SHOW_LOADERS[this.slug]?.().then((m) =>
        this.flowingDoc.set(m.RUN_OF_SHOW),
      );
    }

    // Re-derive the contents rail whenever the rendered document changes
    // (load + language switches). Reads the DOM, so afterRenderEffect.
    afterRenderEffect(() => {
      this.pages();
      this.flowingHtml();
      if (!this.loaded()) {
        return;
      }
      this.collectTocTargets();
    });

    // Fit-to-width: track the well's inner width against the A4 sheet.
    effect((onCleanup) => {
      const well = this.wellEl().nativeElement;
      const measure = () => {
        const styles = getComputedStyle(well);
        const avail =
          well.clientWidth -
          Number.parseFloat(styles.paddingLeft) -
          Number.parseFloat(styles.paddingRight);
        this.fitScale.set(avail > 0 ? Math.min(1, avail / 794) : 1);
      };
      const observer = new ResizeObserver(measure);
      observer.observe(well);
      measure();
      onCleanup(() => observer.disconnect());
    });
  }

  private collectTocTargets() {
    const well = this.wellEl().nativeElement;
    if (this.kind === 'handbook') {
      this.tocTargets = Array.from(
        well.querySelectorAll<HTMLElement>('.doc__sheet'),
      );
    } else {
      const headers = Array.from(well.querySelectorAll<HTMLElement>('h2'));
      this.tocTargets = headers;
      this.flowingToc.set(
        headers.map((h) => ({
          label: (h.textContent ?? '').replace(/\s+/g, ' ').trim(),
          meta: this.headerTime(h),
        })),
      );
    }
    this.onWellScroll();
  }

  /** Module headers carry a "0:05–0:12" pill right before the h2 — show its start. */
  private headerTime(header: HTMLElement): string {
    const pill = header.previousElementSibling?.textContent ?? '';
    const match = pill.match(/^\s*(\d{1,2}:\d{2})/);
    return match?.[1] ?? '';
  }

  protected onWellScroll() {
    if (this.tocTargets.length === 0) {
      return;
    }
    const well = this.wellEl().nativeElement;
    const marker = well.getBoundingClientRect().top + 120;
    let active = 0;
    for (let i = 0; i < this.tocTargets.length; i++) {
      if (this.tocTargets[i].getBoundingClientRect().top <= marker) {
        active = i;
      }
    }
    this.activeToc.set(active);
  }

  protected scrollToToc(index: number) {
    this.tocTargets[index]?.scrollIntoView({ block: 'start' });
  }

  protected zoomIn() {
    this.setZoom(ZOOM_STEPS.find((s) => s > this.zoom()) ?? this.maxZoom);
  }

  protected zoomOut() {
    this.setZoom(
      [...ZOOM_STEPS].reverse().find((s) => s < this.zoom()) ?? this.minZoom,
    );
  }

  protected zoomReset() {
    this.setZoom(1);
  }

  private setZoom(zoom: number) {
    this.zoom.set(zoom);
    try {
      localStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {
      // storage unavailable — the zoom still works for this visit
    }
  }

  /** PDF in the CURRENTLY SELECTED language (round 2 rule). */
  protected pdfUrl(): string {
    return `/api/pdf/${this.slug}/${this.kind}?lang=${this.languageService.lang()}`;
  }

  protected print() {
    window.print();
  }
}
