import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  STAGE_CANVAS_WIDTH,
  STAGE_COL_MAX,
  STAGE_COL_MIN,
  STAGE_COL_STEP,
  StageSettingsService,
} from '../../core/stage-settings.service';

/** Well padding and column gap, in canvas px (spec §3). */
const WELL_PADDING = 24;
const COL_GAP = 24;
const CANVAS_HEIGHT = 1080;

/**
 * Stage Mode settings dialog (spec §5.4). Opened with `k`, which works even
 * with Stage Mode off: this dialog is the inert entry point that §0 rule 1
 * allows, and its master toggle is how the feature gets turned on without a
 * URL.
 *
 * Rendered inside ws-slide-stage so it is visible in fullscreen, and fixed
 * so it does not disturb the column's flex layout. Every control writes
 * straight through to the settings service: there is no Save button, so the
 * tiles behind the dialog always show what the projector will show.
 */
@Component({
  selector: 'ws-stage-settings',
  imports: [TranslocoPipe],
  template: `
    <div class="ov">
      <div
        #panel
        class="panel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-label]="'stage.title' | transloco"
        (keydown)="onKey($event)"
      >
        <header class="panel__head">
          <h2 class="panel__title">{{ 'stage.title' | transloco }}</h2>
          <button
            type="button"
            class="panel__close"
            (click)="closed.emit()"
            [attr.aria-label]="'stage.close' | transloco"
          >
            ✕
          </button>
        </header>

        <section class="sec">
          <h3 class="sec__title">{{ 'stage.section_mode' | transloco }}</h3>
          <label class="row row--check">
            <input
              type="checkbox"
              [checked]="stage.enabled()"
              (change)="stage.toggleEnabled()"
            />
            <span>{{ 'stage.enable' | transloco }}</span>
          </label>
          <div class="row">
            <span class="row__label">{{
              'stage.column_width' | transloco
            }}</span>
            <div class="stepper">
              <button
                type="button"
                class="stepper__btn"
                (click)="stage.stepColumnWidth(-1)"
                [disabled]="stage.columnWidth() <= min"
                aria-label="-"
              >
                −
              </button>
              <span class="stepper__value">{{ stage.columnWidth() }} px</span>
              <button
                type="button"
                class="stepper__btn"
                (click)="stage.stepColumnWidth(1)"
                [disabled]="stage.columnWidth() >= max"
                aria-label="+"
              >
                +
              </button>
            </div>
            <span class="row__note">{{
              'stage.slide_scale' | transloco: { pct: slidePct() }
            }}</span>
          </div>
          <div class="row">
            <button type="button" class="btn" (click)="stage.reset()">
              {{ 'stage.reset' | transloco }}
            </button>
          </div>
        </section>

        <footer class="panel__foot">
          <p class="keys">{{ 'stage.keys' | transloco }}</p>
        </footer>
      </div>
    </div>
  `,
  styles: `
    .ov {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.6);
    }
    .panel {
      width: 640px;
      max-width: 100%;
      max-height: 100%;
      overflow: auto;
      background: var(--ws-stage-tile);
      border: 1px solid var(--ws-stage-tile-border);
      border-radius: 16px;
      color: var(--ws-text);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
    }
    .panel:focus {
      outline: none;
    }
    .panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px 12px;
      border-bottom: 1px solid var(--ws-stage-tile-border);
    }
    .panel__title {
      margin: 0;
      font-family: var(--ws-font-mono);
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-stage-tile-label);
    }
    .panel__close {
      min-height: 0;
      width: 30px;
      height: 30px;
      border: 1px solid var(--ws-stage-tile-border);
      border-radius: 50%;
      background: none;
      color: var(--ws-stage-tile-label);
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
    }
    .panel__close:hover {
      color: var(--ws-accent-bright);
      border-color: var(--ws-accent-bright);
    }
    .sec {
      padding: 16px 20px;
      border-bottom: 1px solid var(--ws-stage-tile-border);
    }
    .sec__title {
      margin: 0 0 12px;
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-stage-tile-faint);
    }
    .row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 10px;
    }
    .row:last-child {
      margin-bottom: 0;
    }
    .row--check {
      cursor: pointer;
    }
    .row__label {
      min-width: 150px;
      font-size: 13px;
      color: var(--ws-text-dim);
    }
    .row__note {
      font-family: var(--ws-font-mono);
      font-size: 11px;
      color: var(--ws-stage-tile-faint);
    }
    .stepper {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .stepper__btn {
      min-height: 0;
      width: 28px;
      height: 28px;
      border: 1px solid var(--ws-stage-tile-border);
      border-radius: 50%;
      background: none;
      color: var(--ws-text-dim);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
    }
    .stepper__btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .stepper__btn:not(:disabled):hover {
      color: var(--ws-accent-bright);
      border-color: var(--ws-accent-bright);
    }
    .stepper__value {
      min-width: 66px;
      text-align: center;
      font-family: var(--ws-font-mono);
      font-size: 12px;
      color: var(--ws-text);
    }
    .btn {
      min-height: 0;
      padding: 7px 14px;
      border: 1px solid var(--ws-stage-tile-border);
      border-radius: 999px;
      background: none;
      font-family: var(--ws-font-mono);
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-text-dim);
      cursor: pointer;
    }
    .btn:hover {
      color: var(--ws-accent-bright);
      border-color: var(--ws-accent-bright);
    }
    input[type='checkbox'] {
      width: 15px;
      height: 15px;
      accent-color: var(--ws-accent);
    }
    .panel__foot {
      padding: 14px 20px 16px;
    }
    .keys {
      margin: 0;
      font-family: var(--ws-font-mono);
      font-size: 11px;
      line-height: 1.8;
      color: var(--ws-stage-tile-faint);
      white-space: pre-line;
    }
  `,
})
export class StageSettingsComponent {
  protected readonly stage = inject(StageSettingsService);

  readonly closed = output<void>();

  protected readonly min = STAGE_COL_MIN;
  protected readonly max = STAGE_COL_MAX;
  protected readonly step = STAGE_COL_STEP;

  private readonly panel =
    viewChild.required<ElementRef<HTMLDivElement>>('panel');

  /**
   * The scale the slide would get at the chosen width, on a 1920x1080
   * fullscreen canvas. That is the number that matters at the venue, so it
   * is projected rather than measured from the current window.
   */
  protected readonly slidePct = computed(() => {
    const fit =
      STAGE_CANVAS_WIDTH - 2 * WELL_PADDING - COL_GAP - this.stage.columnWidth();
    const height = CANVAS_HEIGHT - 2 * WELL_PADDING;
    const scale = Math.min(fit / STAGE_CANVAS_WIDTH, height / CANVAS_HEIGHT);
    return Math.round(scale * 100);
  });

  constructor() {
    afterNextRender(() => this.panel().nativeElement.focus());
  }

  /**
   * The deck listens on document, so every key that reaches the dialog is
   * stopped here; otherwise space would page the deck while the dialog is
   * open. Esc and k close, matching the keyboard map in the footer.
   */
  protected onKey(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Escape' || event.key === 'k') {
      event.preventDefault();
      this.closed.emit();
    }
  }
}
