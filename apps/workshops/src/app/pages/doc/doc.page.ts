import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
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
            <ws-doc-page
              [pages]="pages()"
              [flowing]="flowingHtml()"
              [lightPreview]="lightPreview()"
            />
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
      overflow-y: auto;
      padding: 36px 40px 60px;
      background-image: var(--ws-dotgrid-well);
      background-size: var(--ws-dotgrid-size);
      scroll-behavior: smooth;
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
      background: rgba(255, 255, 255, 0.12);
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
      background: rgba(255, 255, 255, 0.12);
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
        border-color: rgba(255, 255, 255, 0.4);
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
  protected readonly lightPreview = signal(false);
  protected readonly activeToc = signal(0);

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

  /** PDF in the CURRENTLY SELECTED language (round 2 rule). */
  protected pdfUrl(): string {
    return `/api/pdf/${this.slug}/${this.kind}?lang=${this.languageService.lang()}`;
  }

  protected print() {
    window.print();
  }
}
