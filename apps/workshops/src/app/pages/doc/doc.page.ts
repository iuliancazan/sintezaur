import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
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

export type DocKind = 'handbook' | 'script' | 'run-of-show';

const TITLE_KEYS: Record<DocKind, string> = {
  handbook: 'hub.handbook',
  script: 'hub.script',
  'run-of-show': 'hub.run_of_show',
};

@Component({
  selector: 'ws-doc-view-page',
  imports: [DocPageComponent, LangToggleComponent, RouterLink, TranslocoPipe],
  template: `
    <div class="docview">
      <header class="docview__bar">
        <a class="docview__back" [routerLink]="['/w', slug]"
          >← {{ 'common.back' | transloco }}</a
        >
        <span class="docview__title">{{ titleKey | transloco }}</span>
        <div class="docview__actions">
          <ws-lang-toggle />
          <button
            type="button"
            class="docview__action"
            (click)="print()"
          >
            {{ 'common.print' | transloco }}
          </button>
        </div>
      </header>
      @if (loaded()) {
        <ws-doc-page [pages]="pages()" [flowing]="flowingHtml()" />
      } @else {
        <p class="docview__loading">{{ 'common.loading' | transloco }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: #151515;
    }
    .docview__bar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 20px;
      background: rgba(10, 10, 10, 0.92);
      border-bottom: 1px solid #2a2a2a;
      backdrop-filter: blur(6px);
    }
    .docview__back {
      font-family: 'Lato', sans-serif;
      font-size: 13px;
      letter-spacing: 2px;
      display: inline-flex;
      align-items: center;
    }
    .docview__title {
      font-family: 'Lato', sans-serif;
      font-size: 13px;
      letter-spacing: 3px;
      color: #a7a7a7;
      text-transform: uppercase;
    }
    .docview__actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .docview__action {
      min-height: 0;
      padding: 8px 18px;
      border-radius: 999px;
      border: 2px solid #454545;
      background: none;
      color: #c6c6c6;
      font-family: 'Lato', sans-serif;
      font-size: 13px;
      letter-spacing: 2px;
      cursor: pointer;
    }
    .docview__action:hover {
      border-color: #ff8a48;
      color: #ff8a48;
    }
    .docview__loading {
      padding: 60px;
      text-align: center;
      color: #8f8f8f;
    }
    @media print {
      :host {
        background: #fff;
      }
      .docview__bar {
        display: none;
      }
    }
  `,
})
export class DocViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly track = inject(TrackService);
  private readonly languageService = inject(LanguageService);

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly kind = (this.route.snapshot.data['doc'] ??
    'handbook') as DocKind;
  protected readonly titleKey = TITLE_KEYS[this.kind];

  private readonly handbookPages = signal<DocPageDef[] | null>(null);
  private readonly flowingDoc = signal<{ en: string; ro: string } | null>(
    null,
  );

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

  constructor() {
    this.track.view(this.kind, this.languageService.lang());
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
  }

  protected print() {
    window.print();
  }
}
