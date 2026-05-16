import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { TPipe } from '../i18n/t.pipe';
import type { ImageCropRect } from './tezaur.service';

const VIEWPORT_SIZE = 480;

/**
 * Modal pentru selectarea zonei pătrate vizibile din imaginea originală.
 * User-ul vede originalul cu un viewport pătrat fix peste, poate trage
 * imaginea pentru a alege portiunea și zooma cu slider sau scroll.
 *
 * Emite `save` cu `{ x, y, w, h }` în pixeli ai imaginii originale —
 * backend-ul aplică `sharp.extract` și regenerează variantele pătrate.
 */
@Component({
  selector: 'app-image-cropper-modal',
  standalone: true,
  imports: [CommonModule, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ic-backdrop" (click)="onBackdrop($event)">
      <div class="ic-modal" role="dialog" aria-modal="true">
        <header class="ic-modal__head">
          <h3>{{ 'cropper.title' | t }}</h3>
          <button
            class="ic-modal__close"
            type="button"
            (click)="onCancel()"
            [attr.aria-label]="'cropper.close' | t"
          >
            ×
          </button>
        </header>

        <div class="ic-modal__body">
          <p class="ic-hint">{{ 'cropper.hint' | t }}</p>

          <div
            #stage
            class="ic-stage"
            [style.width.px]="viewportSize"
            [style.height.px]="viewportSize"
            (mousedown)="onPointerDown($event)"
            (touchstart)="onTouchStart($event)"
            (wheel)="onWheel($event)"
          >
            @if (!loaded()) {
              <p class="ic-stage__loading">{{ 'cropper.loading' | t }}</p>
            }
            <img
              #img
              class="ic-stage__img"
              [class.is-loaded]="loaded()"
              [src]="src"
              [style.width.px]="naturalWidth() * scale()"
              [style.height.px]="naturalHeight() * scale()"
              [style.transform]="
                'translate3d(' + tx() + 'px, ' + ty() + 'px, 0)'
              "
              (load)="onImageLoad()"
              draggable="false"
              alt=""
            />
            <div class="ic-stage__frame"></div>
          </div>

          <div class="ic-controls">
            <label class="ic-zoom">
              <span class="ic-zoom__label">{{ 'cropper.zoom' | t }}</span>
              <input
                type="range"
                [min]="minScalePct()"
                [max]="maxScalePct"
                step="1"
                [value]="scalePct()"
                (input)="onZoomSlider($event)"
              />
            </label>
            <button class="ic-reset" type="button" (click)="resetView()">
              {{ 'cropper.reset' | t }}
            </button>
          </div>
        </div>

        <footer class="ic-modal__foot">
          <button class="ic-btn ic-btn--ghost" type="button" (click)="onCancel()">
            {{ 'cropper.cancel' | t }}
          </button>
          <button
            class="ic-btn ic-btn--primary"
            type="button"
            (click)="onSave()"
            [disabled]="!loaded() || saving()"
          >
            {{ saving() ? ('cropper.saving' | t) : ('cropper.save' | t) }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: block;
      }
      .ic-backdrop {
        position: fixed;
        inset: 0;
        background: oklch(0 0 0 / 0.6);
        display: grid;
        place-items: center;
        padding: 24px;
        animation: ic-fade 0.16s ease;
      }
      @keyframes ic-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .ic-modal {
        background: var(--bg);
        border: 1px solid var(--line);
        max-width: 600px;
        width: 100%;
        max-height: 96vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: ic-pop 0.18s ease;
      }
      @keyframes ic-pop {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      .ic-modal__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .ic-modal__head h3 {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg);
        font-weight: 600;
      }
      .ic-modal__head h3::before {
        content: '// ';
        color: var(--accent);
      }
      .ic-modal__close {
        background: transparent;
        border: 0;
        font-size: 24px;
        line-height: 1;
        color: var(--fg-muted);
        cursor: pointer;
        padding: 0;
        min-height: auto;
        min-width: auto;
      }
      .ic-modal__close:hover { color: var(--fg); }
      .ic-modal__body {
        padding: 18px;
        overflow-y: auto;
      }
      .ic-hint {
        margin: 0 0 14px;
        font-size: 12px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        letter-spacing: 0.04em;
        text-align: center;
      }
      .ic-stage {
        position: relative;
        margin: 0 auto;
        background: var(--bg-card);
        border: 1px solid var(--line);
        overflow: hidden;
        cursor: grab;
        user-select: none;
        touch-action: none;
      }
      .ic-stage:active { cursor: grabbing; }
      .ic-stage__loading {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        margin: 0;
      }
      .ic-stage__img {
        position: absolute;
        top: 0;
        left: 0;
        opacity: 0;
        max-width: none;
        max-height: none;
        pointer-events: none;
        will-change: transform;
      }
      .ic-stage__img.is-loaded {
        opacity: 1;
        transition: opacity 0.15s ease;
      }
      /* Square overlay frame showing the crop area. */
      .ic-stage__frame {
        position: absolute;
        inset: 0;
        pointer-events: none;
        box-shadow:
          0 0 0 1px var(--accent),
          0 0 0 9999px oklch(0 0 0 / 0.5);
      }
      .ic-stage__frame::before,
      .ic-stage__frame::after {
        content: '';
        position: absolute;
        background: var(--accent);
        opacity: 0.5;
      }
      .ic-stage__frame::before {
        left: 0; right: 0; top: 33%; height: 1px;
        box-shadow: 0 33.33% 0 var(--accent);
      }
      .ic-controls {
        margin-top: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ic-zoom {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
      }
      .ic-zoom__label {
        text-transform: uppercase;
      }
      .ic-zoom input[type='range'] {
        flex: 1;
        accent-color: var(--accent);
      }
      .ic-reset {
        background: transparent;
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 8px 12px;
        cursor: pointer;
        min-height: auto;
      }
      .ic-reset:hover { border-color: var(--accent); color: var(--accent); }
      .ic-modal__foot {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        padding: 14px 18px;
        border-top: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .ic-btn {
        padding: 10px 18px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        border: 1px solid var(--line-strong);
        min-height: auto;
      }
      .ic-btn--ghost {
        background: transparent;
        color: var(--fg-muted);
      }
      .ic-btn--ghost:hover {
        color: var(--fg);
        border-color: var(--fg-muted);
      }
      .ic-btn--primary {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
        font-weight: 600;
      }
      .ic-btn--primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ImageCropperModalComponent implements AfterViewInit {
  /** Full-res original image URL — must be CORS-safe so naturalWidth resolves. */
  @Input({ required: true }) src!: string;
  /** Initial crop in original image coords; falls back to centered cover view. */
  @Input() initialCrop: ImageCropRect | null = null;
  @Input() saving = signal(false);

  @Output() readonly save = new EventEmitter<ImageCropRect>();
  @Output() readonly cancel = new EventEmitter<void>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('img', { static: true }) imgRef!: ElementRef<HTMLImageElement>;

  readonly viewportSize = VIEWPORT_SIZE;
  readonly maxScalePct = 400;

  readonly loaded = signal(false);
  readonly naturalWidth = signal(0);
  readonly naturalHeight = signal(0);
  readonly scale = signal(1);
  readonly tx = signal(0);
  readonly ty = signal(0);

  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private txStart = 0;
  private tyStart = 0;

  readonly scalePct = (): number => Math.round(this.scale() * 100);
  readonly minScalePct = (): number =>
    Math.round(this.minScale() * 100);

  ngAfterViewInit(): void {
    // If the image is already cached and complete by the time the view
    // initializes, the (load) handler may not fire — bootstrap manually.
    const img = this.imgRef.nativeElement;
    if (img.complete && img.naturalWidth > 0) {
      this.onImageLoad();
    }
  }

  onImageLoad(): void {
    const img = this.imgRef.nativeElement;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return;
    this.naturalWidth.set(nw);
    this.naturalHeight.set(nh);

    if (this.initialCrop) {
      this.applyCrop(this.initialCrop);
    } else {
      this.resetView();
    }
    this.loaded.set(true);
  }

  private minScale(): number {
    const nw = this.naturalWidth();
    const nh = this.naturalHeight();
    if (!nw || !nh) return 1;
    return Math.max(VIEWPORT_SIZE / nw, VIEWPORT_SIZE / nh);
  }

  resetView(): void {
    const ms = this.minScale();
    this.scale.set(ms);
    this.centerImage();
  }

  private centerImage(): void {
    const s = this.scale();
    const w = this.naturalWidth() * s;
    const h = this.naturalHeight() * s;
    this.tx.set((VIEWPORT_SIZE - w) / 2);
    this.ty.set((VIEWPORT_SIZE - h) / 2);
    this.clampTranslate();
  }

  private clampTranslate(): void {
    const s = this.scale();
    const w = this.naturalWidth() * s;
    const h = this.naturalHeight() * s;
    const minTx = VIEWPORT_SIZE - w;
    const minTy = VIEWPORT_SIZE - h;
    this.tx.update((v) => Math.max(minTx, Math.min(0, v)));
    this.ty.update((v) => Math.max(minTy, Math.min(0, v)));
  }

  private applyCrop(c: ImageCropRect): void {
    const s = VIEWPORT_SIZE / c.w;
    const ms = this.minScale();
    const clamped = Math.max(ms, Math.min(this.maxScalePct / 100, s));
    this.scale.set(clamped);
    // Recompute tx/ty from crop in case scale was clamped.
    this.tx.set(-c.x * this.scale());
    this.ty.set(-c.y * this.scale());
    this.clampTranslate();
  }

  /* ---------- pointer ---------- */
  onPointerDown(event: MouseEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.txStart = this.tx();
    this.tyStart = this.ty();
  }

  @HostListener('window:mousemove', ['$event'])
  onPointerMove(event: MouseEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.tx.set(this.txStart + dx);
    this.ty.set(this.tyStart + dy);
    this.clampTranslate();
  }

  @HostListener('window:mouseup')
  onPointerUp(): void {
    this.dragging = false;
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    const t = event.touches[0];
    this.dragging = true;
    this.dragStartX = t.clientX;
    this.dragStartY = t.clientY;
    this.txStart = this.tx();
    this.tyStart = this.ty();
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.dragging || event.touches.length !== 1) return;
    const t = event.touches[0];
    const dx = t.clientX - this.dragStartX;
    const dy = t.clientY - this.dragStartY;
    this.tx.set(this.txStart + dx);
    this.ty.set(this.tyStart + dy);
    this.clampTranslate();
  }

  @HostListener('window:touchend')
  onTouchEnd(): void {
    this.dragging = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.06 : 0.06;
    this.zoomBy(delta);
  }

  onZoomSlider(event: Event): void {
    const pct = Number((event.target as HTMLInputElement).value);
    const targetScale = pct / 100;
    this.zoomTo(targetScale);
  }

  private zoomBy(delta: number): void {
    this.zoomTo(this.scale() + delta);
  }

  private zoomTo(targetScale: number): void {
    const ms = this.minScale();
    const max = this.maxScalePct / 100;
    const newScale = Math.max(ms, Math.min(max, targetScale));
    const oldScale = this.scale();
    if (newScale === oldScale) return;
    // Keep viewport center stable while zooming.
    const cx = VIEWPORT_SIZE / 2;
    const cy = VIEWPORT_SIZE / 2;
    const imgCx = (cx - this.tx()) / oldScale;
    const imgCy = (cy - this.ty()) / oldScale;
    this.scale.set(newScale);
    this.tx.set(cx - imgCx * newScale);
    this.ty.set(cy - imgCy * newScale);
    this.clampTranslate();
  }

  /* ---------- actions ---------- */
  onCancel(): void {
    this.cancel.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.saving()) this.onCancel();
  }

  onSave(): void {
    if (!this.loaded() || this.saving()) return;
    const s = this.scale();
    const cropX = Math.round(-this.tx() / s);
    const cropY = Math.round(-this.ty() / s);
    const cropW = Math.round(VIEWPORT_SIZE / s);
    const cropH = cropW;
    // Clamp to image bounds defensively.
    const nw = this.naturalWidth();
    const nh = this.naturalHeight();
    const x = Math.max(0, Math.min(cropX, nw - 1));
    const y = Math.max(0, Math.min(cropY, nh - 1));
    const w = Math.max(1, Math.min(cropW, nw - x));
    const h = Math.max(1, Math.min(cropH, nh - y));
    this.save.emit({ x, y, w, h });
  }
}
