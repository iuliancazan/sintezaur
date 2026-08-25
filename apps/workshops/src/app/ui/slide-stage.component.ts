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

/**
 * Deck runtime — the Angular equivalent of the prototype's deck-stage.js,
 * deliberately slimmer: fixed 1920×1080 canvas scaled to the viewport,
 * keyboard + tap navigation, fullscreen, and in-slide `data-go` jumps
 * (course-map circles, "← COURSE MAP" links).
 *
 * Slides are trusted course HTML authored in this repo — [innerHTML] with
 * bypassSecurityTrustHtml is the porting contract (workshops-spec.md §5).
 */
@Component({
  selector: 'ws-slide-stage',
  template: `
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
      display: block;
      height: 100%;
    }
    .stage {
      position: relative;
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

  protected readonly scale = signal(1);
  protected readonly hudHidden = signal(false);
  private hudTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly currentHtml = computed<SafeHtml>(() => {
    const slide = this.slides()[this.index()];
    const html = slide ? (this.lang() === 'ro' ? slide.ro : slide.en) : '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  constructor() {
    effect((onCleanup) => {
      const el = this.stageEl().nativeElement;
      const observer = new ResizeObserver(() => this.rescale());
      observer.observe(el);
      this.rescale();
      onCleanup(() => observer.disconnect());
    });
    this.scheduleHudHide();
  }

  private rescale() {
    const el = this.stageEl().nativeElement;
    const scale = Math.min(
      el.clientWidth / 1920,
      el.clientHeight / 1080,
    );
    this.scale.set(scale > 0 ? scale : 1);
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

  // Host-level click: tap navigation + in-slide data-go jumps. Keyboard
  // navigation is the document-level keydown listener above.
  @HostListener('click', ['$event'])
  protected onStageClick(event: MouseEvent) {
    // In-slide navigation: course-map circles and "← COURSE MAP" carry
    // data-go="<slide id>" (set by the port).
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
    // Tap navigation on touch-ish clicks over empty slide areas: left third
    // = prev, right third = next. Ignore interactive content.
    if (target) {
      return;
    }
    const rect = this.stageEl().nativeElement.getBoundingClientRect();
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

  private go(idx: number) {
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
