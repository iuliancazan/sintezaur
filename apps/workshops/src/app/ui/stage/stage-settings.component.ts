import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  StageMediaService,
  listDevices,
} from '../../core/stage-media.service';
import {
  SCOPE_TIME_DIVS,
  STAGE_CANVAS_WIDTH,
  STAGE_COL_MAX,
  STAGE_COL_MIN,
  STAGE_ROTATIONS,
  StageSettingsService,
  type ScopeChannel,
  type ScopeMode,
  type ScopeTimeDiv,
  type StageRotation,
} from '../../core/stage-settings.service';
import { StageCamComponent } from './stage-cam.component';

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
  imports: [TranslocoPipe, StageCamComponent],
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

        @if (needsGrant()) {
          <section class="sec">
            <p class="hint">{{ 'stage.grant_hint' | transloco }}</p>
            <button type="button" class="btn" (click)="grant()">
              {{ 'stage.grant' | transloco }}
            </button>
          </section>
        }

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

        <section class="sec">
          <h3 class="sec__title">{{ 'stage.section_cam' | transloco }}</h3>
          <div class="split">
            <div class="split__main">
              <label class="row row--check">
                <input
                  type="checkbox"
                  [checked]="stage.cam().enabled"
                  (change)="stage.toggleCam()"
                />
                <span>{{ 'stage.enable_cam' | transloco }}</span>
              </label>
              <div class="row">
                <span class="row__label">{{ 'stage.device' | transloco }}</span>
                <select class="sel" (change)="pickCam($event)">
                  <option value="" [selected]="!stage.cam().deviceId">—</option>
                  @for (d of cameras(); track d.deviceId) {
                    <option
                      [value]="d.deviceId"
                      [selected]="d.deviceId === stage.cam().deviceId"
                    >
                      {{ d.label || d.deviceId }}
                    </option>
                  }
                </select>
              </div>
              <div class="row">
                <span class="row__label">{{
                  'stage.rotation' | transloco
                }}</span>
                <select class="sel sel--sm" (change)="pickRotation($event)">
                  @for (r of rotations; track r) {
                    <option [value]="r" [selected]="r === stage.cam().rotation">
                      {{ r }}°
                    </option>
                  }
                </select>
                <label class="row--check">
                  <input
                    type="checkbox"
                    [checked]="stage.cam().mirror"
                    (change)="stage.patchCam({ mirror: !stage.cam().mirror })"
                  />
                  <span>{{ 'stage.mirror' | transloco }}</span>
                </label>
              </div>
              <p class="hint">{{ 'stage.rotation_hint' | transloco }}</p>
            </div>
            <div class="preview">
              <ws-stage-cam [owner]="false" />
            </div>
          </div>
        </section>

        <section class="sec">
          <h3 class="sec__title">{{ 'stage.section_scope' | transloco }}</h3>
          <label class="row row--check">
            <input
              type="checkbox"
              [checked]="stage.scope().enabled"
              (change)="stage.toggleScope()"
            />
            <span>{{ 'stage.enable_scope' | transloco }}</span>
          </label>
          <div class="row">
            <span class="row__label">{{ 'stage.device' | transloco }}</span>
            <select class="sel" (change)="pickAudio($event)">
              <option value="" [selected]="!stage.scope().deviceId">—</option>
              @for (d of inputs(); track d.deviceId) {
                <option
                  [value]="d.deviceId"
                  [selected]="d.deviceId === stage.scope().deviceId"
                >
                  {{ d.label || d.deviceId }}
                </option>
              }
            </select>
          </div>
          <div class="row">
            <span class="row__label">{{ 'stage.channel' | transloco }}</span>
            <select class="sel sel--sm" (change)="pickChannel($event)">
              <option value="left" [selected]="stage.scope().channel === 'left'">
                1
              </option>
              <option
                value="right"
                [disabled]="mono()"
                [selected]="stage.scope().channel === 'right'"
              >
                2
              </option>
              <option
                value="mix"
                [disabled]="mono()"
                [selected]="stage.scope().channel === 'mix'"
              >
                1+2
              </option>
            </select>
            <span class="row__note">{{ 'stage.level' | transloco }}</span>
            <span class="meter"
              ><span class="meter__fill" [style.width.%]="levelPct()"></span
            ></span>
          </div>
          <p class="hint">{{ 'stage.channel_hint' | transloco }}</p>
          @if (mono()) {
            <p class="hint hint--warn">{{ 'stage.mono_hint' | transloco }}</p>
          }
          <div class="row">
            <span class="row__label">{{ 'stage.mode' | transloco }}</span>
            <select class="sel sel--sm" (change)="pickMode($event)">
              <option value="wave" [selected]="stage.scope().mode === 'wave'">
                {{ 'stage.mode_wave' | transloco }}
              </option>
              <option
                value="spectrum"
                [selected]="stage.scope().mode === 'spectrum'"
              >
                {{ 'stage.mode_spectrum' | transloco }}
              </option>
            </select>
          </div>
          <div class="row">
            <span class="row__label">{{ 'stage.time_div' | transloco }}</span>
            <select class="sel sel--sm" (change)="pickTimeDiv($event)">
              @for (d of timeDivs; track d) {
                <option [value]="d" [selected]="d === stage.scope().timeDiv">
                  {{ d }} ms/div
                </option>
              }
            </select>
            <label class="row--check">
              <input
                type="checkbox"
                [checked]="stage.scope().autoGain"
                (change)="
                  stage.patchScope({ autoGain: !stage.scope().autoGain })
                "
              />
              <span>{{ 'stage.auto_gain' | transloco }}</span>
            </label>
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
    .split {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .split__main {
      flex: 1;
      min-width: 0;
    }
    .preview {
      flex: none;
      width: 84px;
      aspect-ratio: 9 / 16;
      overflow: hidden;
      border: 1px solid var(--ws-stage-tile-border);
      border-radius: 10px;
      background: #000;
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
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--ws-text-dim);
      cursor: pointer;
    }
    .row__label {
      min-width: 110px;
      font-size: 13px;
      color: var(--ws-text-dim);
    }
    .row__note {
      font-family: var(--ws-font-mono);
      font-size: 11px;
      color: var(--ws-stage-tile-faint);
    }
    .hint {
      margin: 0 0 10px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--ws-stage-tile-faint);
    }
    .hint--warn {
      color: var(--ws-accent-bright);
    }
    .sel {
      flex: 1;
      min-width: 0;
      max-width: 320px;
      min-height: 0;
      padding: 6px 8px;
      border: 1px solid var(--ws-stage-tile-border);
      border-radius: 8px;
      background: var(--ws-input-bg);
      color: var(--ws-text);
      font-family: inherit;
      font-size: 13px;
    }
    .sel--sm {
      flex: none;
      width: auto;
      min-width: 96px;
    }
    .meter {
      flex: 1;
      min-width: 60px;
      max-width: 160px;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.12);
      overflow: hidden;
    }
    .meter__fill {
      display: block;
      height: 100%;
      background: var(--ws-accent);
      transition: width 0.1s linear;
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
export class StageSettingsComponent implements OnDestroy {
  protected readonly stage = inject(StageSettingsService);
  private readonly media = inject(StageMediaService);

  readonly closed = output<void>();

  protected readonly min = STAGE_COL_MIN;
  protected readonly max = STAGE_COL_MAX;
  protected readonly rotations = STAGE_ROTATIONS;
  protected readonly timeDivs = SCOPE_TIME_DIVS;

  protected readonly cameras = signal<MediaDeviceInfo[]>([]);
  protected readonly inputs = signal<MediaDeviceInfo[]>([]);
  /** enumerateDevices returns blank labels until access is granted once. */
  protected readonly needsGrant = computed(
    () =>
      [...this.cameras(), ...this.inputs()].some((d) => !d.label) ||
      (this.cameras().length === 0 && this.inputs().length === 0),
  );
  protected readonly mono = computed(() => this.media.audioChannels() === 1);
  protected readonly levelPct = computed(() =>
    Math.min(100, Math.round(this.media.audioLevel() * 100)),
  );

  private readonly panel =
    viewChild.required<ElementRef<HTMLDivElement>>('panel');
  private detachDeviceChange: (() => void) | null = null;

  /**
   * The scale the slide would get at the chosen width, on a 1920x1080
   * fullscreen canvas. That is the number that matters at the venue, so it
   * is projected rather than measured from the current window.
   */
  protected readonly slidePct = computed(() => {
    const fit =
      STAGE_CANVAS_WIDTH -
      2 * WELL_PADDING -
      COL_GAP -
      this.stage.columnWidth();
    const height = CANVAS_HEIGHT - 2 * WELL_PADDING;
    const scale = Math.min(fit / STAGE_CANVAS_WIDTH, height / CANVAS_HEIGHT);
    return Math.round(scale * 100);
  });

  constructor() {
    afterNextRender(() => this.panel().nativeElement.focus());
    void this.refreshDevices();
    this.detachDeviceChange = this.media.onDeviceChange(() =>
      void this.refreshDevices(),
    );
  }

  ngOnDestroy() {
    this.detachDeviceChange?.();
    this.detachDeviceChange = null;
  }

  private async refreshDevices() {
    this.cameras.set(await listDevices('videoinput'));
    this.inputs.set(await listDevices('audioinput'));
  }

  protected async grant() {
    await this.media.grantAccess();
    await this.refreshDevices();
  }

  private pick(
    event: Event,
    list: MediaDeviceInfo[],
  ): { deviceId: string | null; deviceLabel: string | null } {
    const id = (event.target as HTMLSelectElement).value;
    if (!id) {
      return { deviceId: null, deviceLabel: null };
    }
    const found = list.find((d) => d.deviceId === id);
    return { deviceId: id, deviceLabel: found?.label ?? null };
  }

  protected pickCam(event: Event) {
    this.stage.patchCam(this.pick(event, this.cameras()));
  }

  protected pickAudio(event: Event) {
    this.stage.patchScope(this.pick(event, this.inputs()));
  }

  protected pickRotation(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    this.stage.patchCam({ rotation: value as StageRotation });
  }

  protected pickChannel(event: Event) {
    const value = (event.target as HTMLSelectElement).value as ScopeChannel;
    this.stage.patchScope({ channel: value });
  }

  protected pickMode(event: Event) {
    const value = (event.target as HTMLSelectElement).value as ScopeMode;
    this.stage.patchScope({ mode: value });
  }

  protected pickTimeDiv(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    this.stage.patchScope({ timeDiv: value as ScopeTimeDiv });
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
