import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Document runtime — Angular counterpart of the prototype's doc-page.js.
 * Two modes:
 *  - paged: explicit A4 pages (handbook) — one sheet per page, exact A4 at
 *    print (794×1123 CSS px = 210×297 mm in Chromium);
 *  - flowing: one continuous body (script, run of show) — the print engine
 *    paginates naturally.
 * Content is trusted course HTML from this repo (workshops-spec.md §5).
 */
@Component({
  selector: 'ws-doc-page',
  template: `
    @if (pages(); as pageList) {
      <div class="doc doc--paged hb-theme-print" [class.hb-theme-light]="lightPreview()">
        @for (page of safePages(); track $index) {
          <div class="doc__sheet" [innerHTML]="page"></div>
        }
      </div>
    } @else {
      <div class="doc doc--flowing hb-theme-print" [class.hb-theme-light]="lightPreview()">
        <div class="doc__sheet doc__sheet--flow" [innerHTML]="safeFlowing()"></div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .doc {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 26px;
    }
    .doc__sheet {
      width: 794px;
      max-width: 100%;
      min-height: 1122px;
      background: #050505;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 6px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      overflow: hidden;
    }
    /* Script + run of show read as light paper on screen — same face as
     * their print/PDF output (2026-08-26-v02 turn 4). */
    .doc__sheet--flow {
      min-height: 0;
      background: #fdfcfa;
      border: none;
      color: #111;
      padding: 52px 64px;
    }
    /* The prototype's running footer used a shadow-DOM slot; without that
     * host it would render inline at the top — hide it. */
    .doc ::ng-deep [slot='footer'] {
      display: none;
    }
    /* Handbook pages are explicit flex columns sized for A4. */
    .doc__sheet ::ng-deep section.page {
      width: 794px;
      height: 1122px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    @media print {
      .doc {
        padding: 0;
        gap: 0;
        display: block;
      }
      .doc__sheet {
        box-shadow: none;
        border: none;
        border-radius: 0;
        max-width: none;
        overflow: visible;
        break-after: page;
      }
      .doc__sheet:last-child {
        break-after: auto;
      }
      .doc__sheet--flow {
        break-after: auto;
        background: #fff;
      }
    }
  `,
})
export class DocPageComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** Paged mode: array of full page HTML strings. */
  readonly pages = input<string[] | null>(null);
  /** Flowing mode: one body HTML string. */
  readonly flowing = input<string | null>(null);
  /** Preview the light (print) theme on screen. */
  readonly lightPreview = input(false);

  protected readonly safePages = computed<SafeHtml[]>(() =>
    (this.pages() ?? []).map((p) =>
      this.sanitizer.bypassSecurityTrustHtml(p),
    ),
  );

  protected readonly safeFlowing = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.flowing() ?? ''),
  );
}
