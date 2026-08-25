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

const RAIL_KEY = 'ws_deck_rail';

/**
 * Deck runtime — the Angular counterpart of the prototype's deck-stage.js:
 * fixed 1920×1080 canvas scaled to the viewport, keyboard + tap navigation,
 * fullscreen, in-slide `data-go` jumps, and a collapsible thumbnail rail
 * (Claude-Design-style) with live mini renders of every slide.
 *
 * Slides are trusted course HTML authored in this repo — [innerHTML] with
 * bypassSecurityTrustHtml is the porting contract (workshops-spec.md §5).
 */
@Component({
  selector: 'ws-slide-stage',
  template: `
    @if (!fullscreen() && !railCollapsed()) {
      <aside class="rail">
        <div class="rail__head">
          <button
            type="button"
            class="rail__toggle"
            (click)="setRail(true)"
            aria-label="Collapse thumbnails"
          >
            ‹
          </button>
        </div>
        <div class="rail__scroll" #railScroll>
          @for (thumb of thumbs(); track $index) {
            <button
              type="button"
              class="rail__item"
              [class.rail__item--active]="$index === index()"
              [attr.data-thumb-index]="$index"
              (click)="go($index)"
            >
              <span class="rail__num">{{ $index + 1 }}</span>
              <span class="rail__frame">
                <span class="rail__canvas" [innerHTML]="thumb"></span>
              </span>
            </button>
          }
        </div>
      </aside>
    } @else if (!fullscreen()) {
      <button
        type="button"
        class="rail-expand"
        (click)="setRail(false)"
        aria-label="Expand thumbnails"
      >
        ›
      </button>
    }
    <div class="stage" #stageEl>
      <div
        class="stage__canvas"
        [style.transform]="'scale(' + scale() + ')'"
        [innerHTML]="currentHtml()"
      ></div>
      <div class="stage__hud" [class.stage__hud--hidden]="hudHidden()">
        <button type="button" class="stage__hud-btn" (click)="prev()">‹</button>
        <span class="stage__hud-count"
          >{{ index() + 1 }} / {{ slides().length }}</span
        >
        <button type="button" class="stage__hud-btn" (click)="next()">›</button>
        <button
          type="button"
          class="stage__hud-btn stage__hud-btn--wide"
          (click)="toggleFullscreen()"
        >
          ⛶
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      height: 100%;
      background: #000;
    }
    /* ---- thumbnail rail ---- */
    .rail {
      flex: 0 0 196px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #222;
      background: #0a0a0a;
      min-height: 0;
    }
    .rail__head {
      display: flex;
      justify-content: flex-end;
      padding: 46px 8px 4px;
    }
    .rail__toggle,
    .rail-expand {
      min-height: 0;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #141414;
      color: #8f8f8f;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }
    .rail__toggle:hover,
    .rail-expand:hover {
      color: #ff8a48;
      border-color: #ff8a48;
    }
    .rail-expand {
      position: absolute;
      left: 10px;
      top: 52px;
      z-index: 20;
    }
    .rail__scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 6px 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: #333 transparent;
    }
    .rail__item {
      position: relative;
      min-height: 0;
      padding: 0 0 0 20px;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
    }
    .rail__num {
      position: absolute;
      left: 0;
      top: 2px;
      font-family: 'Lato', sans-serif;
      font-size: 11px;
      color: #6e6e6e;
    }
    .rail__item--active .rail__num {
      color: #ff8a48;
    }
    .rail__frame {
      display: block;
      width: 156px;
      height: 88px;
      overflow: hidden;
      border-radius: 6px;
      border: 2px solid #2a2a2a;
      background: #000;
    }
    .rail__item:hover .rail__frame {
      border-color: #555;
    }
    .rail__item--active .rail__frame {
      border-color: #ff8a48;
    }
    .rail__canvas {
      display: block;
      position: relative;
      width: 1920px;
      height: 1080px;
      transform: scale(0.08125);
      transform-origin: top left;
      pointer-events: none;
    }
    .rail__canvas ::ng-deep section {
      position: absolute;
      inset: 0;
      width: 1920px;
      height: 1080px;
    }
    /* ---- stage ---- */
    .stage {
      position: relative;
      flex: 1;
      min-width: 0;
      height: 100%;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stage__canvas {
      flex: 0 0 auto;
      width: 1920px;
      height: 1080px;
      position: relative;
      transform-origin: center center;
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
      color: #ff8a48 !important;
    }
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
      color: #ff8a48;
    }
    .stage__hud-count {
      font-family: 'Lato', sans-serif;
      font-size: 13px;
      letter-spacing: 2px;
      color: #8f8f8f;
    }
    @media (max-width: 720px) {
      .rail,
      .rail-expand {
        display: none;
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
  readonly indexChange = output<number>();

  private readonly stageEl =
    viewChild.required<ElementRef<HTMLDivElement>>('stageEl');
  private readonly railScroll =
    viewChild<ElementRef<HTMLDivElement>>('railScroll');

  protected readonly scale = signal(1);
  protected readonly hudHidden = signal(false);
  protected readonly fullscreen = signal(false);
  protected readonly railCollapsed = signal(this.initialRail());
  private hudTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly currentHtml = computed<SafeHtml>(() => {
    const slide = this.slides()[this.index()];
    const html = slide ? (this.lang() === 'ro' ? slide.ro : slide.en) : '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  /** Mini renders for the rail — same trusted HTML, scaled down by CSS. */
  protected readonly thumbs = computed<SafeHtml[]>(() => {
    const lang = this.lang();
    return this.slides().map((slide) =>
      this.sanitizer.bypassSecurityTrustHtml(
        lang === 'ro' ? slide.ro : slide.en,
      ),
    );
  });

  constructor() {
    effect((onCleanup) => {
      const el = this.stageEl().nativeElement;
      const observer = new ResizeObserver(() => this.rescale());
      observer.observe(el);
      this.rescale();
      onCleanup(() => observer.disconnect());
    });
    // Keep the active thumbnail in view.
    effect(() => {
      const idx = this.index();
      const rail = this.railScroll()?.nativeElement;
      if (!rail) {
        return;
      }
      rail
        .querySelector(`[data-thumb-index="${idx}"]`)
        ?.scrollIntoView({ block: 'nearest' });
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
    const el = this.stageEl().nativeElement;
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
  // for clicks that land on the stage, not on the rail.
  @HostListener('click', ['$event'])
  protected onStageClick(event: MouseEvent) {
    const stage = this.stageEl().nativeElement;
    if (!stage.contains(event.target as Node)) {
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
    const rect = stage.getBoundingClientRect();
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

  protected toggleFullscreen() {
    const el = this.host.nativeElement as HTMLElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }

  private scheduleHudHide() {
    if (this.hudTimer) {
      clearTimeout(this.hudTimer);
    }
    this.hudTimer = setTimeout(() => this.hudHidden.set(true), 2500);
  }
}
