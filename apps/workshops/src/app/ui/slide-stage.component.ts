import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { SlideDef } from '../content/types';
import { ViewerRailComponent, type RailItem } from './viewer-rail.component';

const RAIL_KEY = 'ws_deck_rail';

/**
 * Deck runtime (2026-08-26-v02 "Workshop Portal" 3a): named slide list on
 * the left (collapsible, persisted), the 1920×1080 canvas scaled inside a
 * framed shell over the dot grid, and a control bar underneath. Keyboard +
 * tap navigation, fullscreen (with the auto-hiding HUD) and in-slide
 * `data-go` jumps carry over from the first build.
 *
 * Slides are trusted course HTML authored in this repo — [innerHTML] with
 * bypassSecurityTrustHtml is the porting contract (workshops-spec.md §5).
 */
@Component({
  selector: 'ws-slide-stage',
  imports: [ViewerRailComponent],
  template: `
    @if (!fullscreen() && !railCollapsed()) {
      <div class="railwrap">
        <ws-viewer-rail
          [heading]="railHeading()"
          [items]="railItems()"
          [activeIndex]="index()"
          (rowSelect)="go($event)"
        />
        <button
          type="button"
          class="railwrap__collapse"
          (click)="setRail(true)"
          [attr.aria-label]="collapseLabel()"
        >
          ‹
        </button>
      </div>
    } @else if (!fullscreen()) {
      <button
        type="button"
        class="rail-expand"
        (click)="setRail(false)"
        [attr.aria-label]="expandLabel()"
      >
        ›
      </button>
    }
    <div class="stage" [class.stage--fullscreen]="fullscreen()">
      <div class="stage__well">
        <div class="stage__fit" #fitEl>
          <div
            class="stage__shell"
            [style.width.px]="shellWidth()"
            [style.height.px]="shellHeight()"
          >
            <div
              class="stage__canvas"
              [style.transform]="'scale(' + scale() + ')'"
              [innerHTML]="currentHtml()"
            ></div>
          </div>
        </div>
      </div>
      @if (!fullscreen()) {
        <div class="stage__controls">
          <span class="stage__slide-label">{{ currentLabel() }}</span>
          <div class="stage__pager">
            <button
              type="button"
              class="stage__pager-btn"
              (click)="prev()"
              aria-label="Previous slide"
            >
              ←
            </button>
            <span class="stage__count"
              >{{ index() + 1 }} / {{ slides().length }}</span
            >
            <button
              type="button"
              class="stage__pager-btn"
              (click)="next()"
              aria-label="Next slide"
            >
              →
            </button>
          </div>
          <span class="stage__credit">SINTEZAUR × ZEEDO · POWERED BY SEQUENTIAL</span>
        </div>
      } @else {
        <div class="stage__hud" [class.stage__hud--hidden]="hudHidden()">
          <button type="button" class="stage__hud-btn" (click)="prev()">
            ‹
          </button>
          <span class="stage__hud-count"
            >{{ index() + 1 }} / {{ slides().length }}</span
          >
          <button type="button" class="stage__hud-btn" (click)="next()">
            ›
          </button>
          <button
            type="button"
            class="stage__hud-btn"
            (click)="toggleFullscreen()"
          >
            ⛶
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      height: 100%;
      min-height: 0;
      background: var(--ws-bg);
    }
    /* ---- slide list rail ---- */
    .railwrap {
      position: relative;
      flex: none;
      height: 100%;
      min-height: 0;
    }
    .railwrap__collapse,
    .rail-expand {
      min-height: 0;
      width: 26px;
      height: 26px;
      border-radius: 8px;
      border: 1px solid var(--ws-border-strong);
      background: var(--ws-bg);
      color: var(--ws-text-faint);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
    }
    .railwrap__collapse {
      position: absolute;
      top: 18px;
      right: 10px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .railwrap:hover .railwrap__collapse {
      opacity: 1;
    }
    .railwrap__collapse:hover,
    .rail-expand:hover {
      color: var(--ws-accent-bright);
      border-color: var(--ws-accent-bright);
    }
    .rail-expand {
      position: absolute;
      left: 10px;
      top: 14px;
      z-index: 20;
    }
    /* ---- stage ---- */
    .stage {
      position: relative;
      flex: 1;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .stage__well {
      flex: 1;
      min-height: 0;
      display: flex;
      padding: 32px 40px 20px;
      background-image: var(--ws-dotgrid-well);
      background-size: var(--ws-dotgrid-size);
    }
    .stage--fullscreen .stage__well {
      padding: 0;
      background-image: none;
      background-color: #000;
    }
    .stage__fit {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stage__shell {
      position: relative;
      flex: none;
      overflow: hidden;
      background: #000;
      border: 1px solid var(--ws-shell-border);
      border-radius: 6px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }
    .stage--fullscreen .stage__shell {
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
    .stage__canvas {
      width: 1920px;
      height: 1080px;
      position: relative;
      transform-origin: top left;
    }
    /* Slides are absolutely-positioned <section>s in the 1920×1080 space. */
    .stage__canvas ::ng-deep section {
      position: absolute;
      inset: 0;
      width: 1920px;
      height: 1080px;
    }
    .stage__canvas ::ng-deep [data-go] {
      cursor: pointer;
    }
    .stage__canvas ::ng-deep .ws-hover-accent:hover {
      color: var(--ws-accent-bright) !important;
    }
    /* ---- control bar (windowed) ---- */
    .stage__controls {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 40px 20px;
    }
    .stage__slide-label,
    .stage__credit {
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stage__slide-label {
      flex: 1;
      min-width: 0;
    }
    .stage__credit {
      flex: 1;
      min-width: 0;
      text-align: right;
    }
    .stage__pager {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: none;
    }
    .stage__pager-btn {
      min-height: 0;
      width: 36px;
      height: 36px;
      border: 1px solid var(--ws-border-strong);
      border-radius: 50%;
      background: none;
      color: var(--ws-text-faint);
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
    }
    .stage__pager-btn:hover {
      color: var(--ws-text);
      border-color: var(--ws-pager-hover-border);
    }
    .stage__count {
      font-family: var(--ws-font-mono);
      font-size: 12px;
      letter-spacing: 2px;
      color: var(--ws-label-strong);
    }
    /* ---- fullscreen HUD ---- */
    .stage__hud {
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(20, 20, 20, 0.85);
      border: 1px solid #333;
      opacity: 1;
      transition: opacity 0.4s ease;
    }
    .stage__hud--hidden {
      opacity: 0;
      pointer-events: none;
    }
    .stage__hud-btn {
      min-height: 0;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: none;
      color: #c6c6c6;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
    }
    .stage__hud-btn:hover {
      color: var(--ws-accent-bright);
    }
    .stage__hud-count {
      font-family: var(--ws-font-mono);
      font-size: 13px;
      letter-spacing: 2px;
      color: var(--ws-text-faint);
    }
    @media (max-width: 900px) {
      .stage__credit {
        display: none;
      }
    }
    @media (max-width: 720px) {
      .railwrap,
      .rail-expand {
        display: none;
      }
      .stage__well {
        padding: 16px 16px 8px;
      }
      .stage__controls {
        padding: 10px 16px 14px;
      }
    }
  `,
})
export class SlideStageComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly slides = input.required<SlideDef[]>();
  readonly lang = input.required<'en' | 'ro'>();
  readonly index = input.required<number>();
  readonly railHeading = input('');
  readonly collapseLabel = input('Collapse');
  readonly expandLabel = input('Expand');
  readonly indexChange = output<number>();

  private readonly fitEl =
    viewChild.required<ElementRef<HTMLDivElement>>('fitEl');

  protected readonly scale = signal(1);
  protected readonly hudHidden = signal(false);
  protected readonly fullscreen = signal(false);
  protected readonly railCollapsed = signal(this.initialRail());
  private hudTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly shellWidth = computed(() => 1920 * this.scale());
  protected readonly shellHeight = computed(() => 1080 * this.scale());

  protected readonly currentHtml = computed<SafeHtml>(() => {
    const slide = this.slides()[this.index()];
    const html = slide ? (this.lang() === 'ro' ? slide.ro : slide.en) : '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  protected readonly railItems = computed<RailItem[]>(() =>
    this.slides().map((slide, i) => ({
      label: slide.label,
      meta: String(i + 1),
    })),
  );

  protected readonly currentLabel = computed(() => {
    const slide = this.slides()[this.index()];
    if (!slide) {
      return '';
    }
    return `${String(this.index() + 1).padStart(2, '0')} · ${slide.label}`;
  });

  constructor() {
    effect((onCleanup) => {
      this.railCollapsed(); // rail width changes resize the fit box
      const el = this.fitEl().nativeElement;
      const observer = new ResizeObserver(() => this.rescale());
      observer.observe(el);
      this.rescale();
      onCleanup(() => observer.disconnect());
    });
    this.scheduleHudHide();
  }

  private initialRail(): boolean {
    try {
      return localStorage.getItem(RAIL_KEY) === 'collapsed';
    } catch {
      return false;
    }
  }

  protected setRail(collapsed: boolean) {
    this.railCollapsed.set(collapsed);
    try {
      localStorage.setItem(RAIL_KEY, collapsed ? 'collapsed' : 'open');
    } catch {
      // storage unavailable — the toggle still works for this visit
    }
  }

  private rescale() {
    const el = this.fitEl().nativeElement;
    const scale = Math.min(el.clientWidth / 1920, el.clientHeight / 1080);
    this.scale.set(scale > 0 ? scale : 1);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    this.fullscreen.set(!!document.fullscreenElement);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        this.prev();
        break;
      case 'Home':
        this.go(0);
        break;
      case 'End':
        this.go(this.slides().length - 1);
        break;
      case 'f':
        this.toggleFullscreen();
        break;
    }
  }

  @HostListener('document:mousemove')
  onMove() {
    this.hudHidden.set(false);
    this.scheduleHudHide();
  }

  // Host-level click: tap navigation + in-slide data-go jumps — but only
  // for clicks that land on the slide shell, not on the rail or controls.
  @HostListener('click', ['$event'])
  protected onStageClick(event: MouseEvent) {
    const fit = this.fitEl().nativeElement;
    if (!fit.contains(event.target as Node)) {
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-go]',
    );
    if (target?.dataset['go']) {
      const id = target.dataset['go'];
      const idx = this.slides().findIndex((s) => s.id === id);
      if (idx >= 0) {
        this.go(idx);
        return;
      }
    }
    // Tap navigation over empty slide areas: left third = prev, right
    // third = next. Interactive slide content is left alone.
    if (target) {
      return;
    }
    const rect = fit.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    if (x > 0.66) {
      this.next();
    } else if (x < 0.33) {
      this.prev();
    }
  }

  protected next() {
    this.go(Math.min(this.index() + 1, this.slides().length - 1));
  }

  protected prev() {
    this.go(Math.max(this.index() - 1, 0));
  }

  protected go(idx: number) {
    if (idx !== this.index()) {
      this.indexChange.emit(idx);
    }
  }

  /** Public: the deck bar's PRESENT button calls this too. iPhone Safari
   * has no requestFullscreen — swallow the rejection, nothing to present. */
  toggleFullscreen() {
    const el = this.host.nativeElement as HTMLElement;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => undefined);
    }
  }

  private scheduleHudHide() {
    if (this.hudTimer) {
      clearTimeout(this.hudTimer);
    }
    this.hudTimer = setTimeout(() => this.hudHidden.set(true), 2500);
  }
}
