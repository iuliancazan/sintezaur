import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  StageMediaService,
  resolveDevice,
} from '../../core/stage-media.service';
import { StageSettingsService } from '../../core/stage-settings.service';

/** Below this peak the input counts as silent (about -60 dBFS). */
const SIGNAL_FLOOR = 0.001;
/** Auto gain puts the peak at this fraction of the half height. */
const TARGET = 0.8;
const MAX_GAIN = 20;
/** Release coefficient per frame: about one second at 60 fps. */
const RELEASE = 0.98;

const GRID = '#2a2a2a';
const GRID_MID = '#464646';
const TRACE = '#ff8a48';
const DIVS_X = 10;
const DIVS_Y = 8;

const SPECTRUM_MIN_HZ = 20;
const SPECTRUM_MAX_HZ = 20000;
const SPECTRUM_MIN_DB = -90;
const SPECTRUM_GUIDES = [50, 100, 1000, 10000];

/**
 * Oscilloscope tile (spec §5.3): time-domain trace with a spectrum mode,
 * fed from one channel of an audio input.
 *
 * Two departures from the letter of the spec, both to make it hold up live:
 *
 * - The trigger uses the midpoint between the window's min and max with
 *   amplitude-proportional hysteresis, not a fixed crossing of zero at
 *   -0.02. A fixed zero crossing only catches hard edges, so a sine, a
 *   filtered sound or anything with a DC offset would swim across the tile.
 * - The trace is drawn as a min/max envelope per pixel column whenever a
 *   column covers more than one sample, which is the normal case at the
 *   slower time bases. Drawing every sample as a line segment both costs
 *   more and hides the real peak-to-peak.
 */
@Component({
  selector: 'ws-stage-scope',
  imports: [TranslocoPipe],
  template: `
    <canvas #cv class="cv" [class.cv--dim]="!live()"></canvas>
    @if (!live()) {
      <p class="msg">{{ message() | transloco }}</p>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
    }
    .cv {
      display: block;
      width: 100%;
      height: 100%;
    }
    .cv--dim {
      opacity: 0.25;
    }
    .msg {
      position: absolute;
      inset: 0;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 18px;
      font-family: var(--ws-font-mono);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
      color: var(--ws-stage-tile-faint);
    }
  `,
})
export class StageScopeComponent implements OnDestroy {
  private readonly stage = inject(StageSettingsService);
  private readonly media = inject(StageMediaService);
  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('cv');

  protected readonly state = this.media.audioState;
  protected readonly live = computed(() => this.state() === 'live');
  protected readonly message = computed(() => {
    switch (this.state()) {
      case 'idle':
        return 'stage.pick_audio';
      case 'starting':
        return 'stage.starting';
      case 'suspended':
        return 'stage.press_key_audio';
      case 'no-permission':
        return 'stage.no_permission';
      case 'not-found':
        return 'stage.not_found';
      case 'in-use':
        return 'stage.in_use';
      default:
        return 'stage.error';
    }
  });

  /** Only a real device change restarts capture; mode, time base and gain
   * changes must not drop the stream. */
  private readonly deviceId = computed(() => this.stage.scope().deviceId);
  private readonly channel = computed(() => this.stage.scope().channel);

  private frame = 0;
  // Inferred as Float32Array<ArrayBuffer>: the analyser methods refuse the
  // ArrayBufferLike default that an explicit annotation would give.
  private buf = new Float32Array(0);
  private env = 0;
  private lastTrigger = 0;
  private detachDeviceChange: (() => void) | null = null;
  private readonly onVisibility = () => {
    if (document.hidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  constructor() {
    effect(() => {
      this.deviceId();
      void this.syncDevice();
    });
    effect(() => this.media.setChannel(this.channel()));

    this.detachDeviceChange = this.media.onDeviceChange(() =>
      void this.syncDevice(),
    );
    document.addEventListener('visibilitychange', this.onVisibility);
    this.startLoop();
  }

  ngOnDestroy() {
    this.stopLoop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.detachDeviceChange?.();
    this.detachDeviceChange = null;
    this.media.stopAudio();
  }

  /**
   * Resolve the configured device and (re)start. Never falls back to the
   * default input: on stage the laptop microphone is worse than a
   * placeholder that says the device is gone.
   */
  private async syncDevice() {
    const cfg = this.stage.scope();
    if (!cfg.deviceId && !cfg.deviceLabel) {
      this.media.stopAudio();
      return;
    }
    const device = await resolveDevice(
      'audioinput',
      cfg.deviceId,
      cfg.deviceLabel,
    );
    if (!device) {
      this.media.stopAudio(true);
      this.media.audioState.set('not-found');
      return;
    }
    if (device.deviceId !== cfg.deviceId || device.label !== cfg.deviceLabel) {
      this.stage.patchScope({
        deviceId: device.deviceId,
        deviceLabel: device.label,
      });
    }
    await this.media.startAudio(device.deviceId, cfg.channel);
  }

  private startLoop() {
    if (this.frame) {
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  }

  private stopLoop() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private readonly tick = () => {
    this.frame = requestAnimationFrame(this.tick);
    this.render();
  };

  private render() {
    const canvas = this.canvasRef().nativeElement;
    // Re-read the ratio every frame: dragging the window from the laptop
    // panel to the projector changes it without changing the CSS size, so a
    // ResizeObserver would never fire.
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) {
      return;
    }
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const spectrum = this.stage.scope().mode === 'spectrum';
    if (spectrum) {
      this.drawSpectrumGrid(ctx, w, h);
      this.drawSpectrum(ctx, w, h);
    } else {
      this.drawGraticule(ctx, w, h);
      this.drawWave(ctx, w, h);
    }
  }

  private drawGraticule(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    for (let i = 1; i < DIVS_X; i++) {
      const x = Math.round((i * w) / DIVS_X) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let i = 1; i < DIVS_Y; i++) {
      const y = Math.round((i * h) / DIVS_Y) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.strokeStyle = GRID_MID;
    ctx.beginPath();
    const cx = Math.round(w / 2) + 0.5;
    const cy = Math.round(h / 2) + 0.5;
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
  }

  private drawWave(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const analyser = this.media.waveAnalyser;
    const half = h / 2;
    // Spec asks for 5 px at canvas scale; drawing happens in CSS px after
    // the ratio transform, so 3 CSS px is 6 device px on a Retina panel.
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = TRACE;

    if (!analyser) {
      this.flatLine(ctx, w, half);
      return;
    }
    if (this.buf.length !== analyser.fftSize) {
      this.buf = new Float32Array(analyser.fftSize);
    }
    const buf = this.buf;
    analyser.getFloatTimeDomainData(buf);

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i];
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
    }
    const peak = Math.max(Math.abs(min), Math.abs(max));
    this.media.reportLevel(peak);

    if (!(peak > SIGNAL_FLOOR)) {
      this.flatLine(ctx, w, half);
      this.stamp(ctx, w, 'NO SIGNAL');
      return;
    }

    // Auto gain: instant attack, about a second of release, clamped so
    // silence does not blow the noise floor up to full scale.
    this.env = peak > this.env ? peak : this.env * RELEASE + peak * (1 - RELEASE);
    const gain = this.stage.scope().autoGain
      ? Math.min(MAX_GAIN, TARGET / Math.max(this.env, 1e-6))
      : 1;

    const rate = this.media.sampleRate() || 48000;
    const n = Math.min(
      Math.max(2, Math.round((this.stage.scope().timeDiv * 10 * rate) / 1000)),
      buf.length,
    );
    const start = this.trigger(buf, Math.max(0, buf.length - n), min, max);
    const yOf = (v: number) => half - v * gain * half;

    ctx.beginPath();
    const perPixel = n / w;
    if (perPixel > 1) {
      // One vertical segment per pixel column, between the column's min and
      // max: cheaper than a segment per sample and it shows the real
      // peak-to-peak, which is what reads from five metres away.
      for (let px = 0; px < w; px++) {
        const from = start + Math.floor(px * perPixel);
        const to = Math.min(start + n, start + Math.floor((px + 1) * perPixel));
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = from; i < to; i++) {
          const v = buf[i];
          if (v < lo) {
            lo = v;
          }
          if (v > hi) {
            hi = v;
          }
        }
        if (lo === Infinity) {
          continue;
        }
        const x = px + 0.5;
        ctx.moveTo(x, yOf(hi));
        ctx.lineTo(x, yOf(lo));
      }
    } else {
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w;
        const y = yOf(buf[start + i]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }

  /**
   * Last rising crossing of the window's midpoint, so the freshest window
   * wins. The midpoint rather than zero makes it immune to a DC offset.
   *
   * Hysteresis has to ARM rather than test the preceding sample: on any
   * smooth waveform consecutive samples differ by a tiny amount, so a
   * condition like "previous sample below -0.02 and this one at or above 0"
   * can never be true and a sine would never trigger at all. Instead the
   * trace arms when the signal dips below mid - hyst and fires on the next
   * upward crossing of mid.
   *
   * On a miss the previous index is reused, so the trace holds still instead
   * of snapping back to the start of the buffer.
   */
  private trigger(
    buf: Float32Array,
    searchEnd: number,
    min: number,
    max: number,
  ): number {
    if (searchEnd <= 1) {
      return 0;
    }
    const mid = (min + max) / 2;
    const hyst = Math.max(0.05 * (max - min), 1e-3);
    let armed = false;
    let found = -1;
    for (let i = 1; i < searchEnd; i++) {
      const v = buf[i];
      if (v < mid - hyst) {
        armed = true;
      } else if (armed && v >= mid && buf[i - 1] < mid) {
        found = i;
        armed = false;
      }
    }
    if (found >= 0) {
      this.lastTrigger = found;
      return found;
    }
    return this.lastTrigger < searchEnd ? this.lastTrigger : 0;
  }

  private flatLine(ctx: CanvasRenderingContext2D, w: number, half: number) {
    ctx.beginPath();
    ctx.moveTo(0, half);
    ctx.lineTo(w, half);
    ctx.stroke();
  }

  private stamp(ctx: CanvasRenderingContext2D, w: number, text: string) {
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = GRID_MID;
    ctx.textAlign = 'right';
    ctx.fillText(text, w - 10, 18);
    ctx.textAlign = 'left';
  }

  private xOfHz(hz: number, w: number): number {
    const span = Math.log(SPECTRUM_MAX_HZ / SPECTRUM_MIN_HZ);
    return (Math.log(hz / SPECTRUM_MIN_HZ) / span) * w;
  }

  private drawSpectrumGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const y = Math.round((i * h) / 4) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.strokeStyle = GRID_MID;
    ctx.fillStyle = GRID_MID;
    ctx.font = '10px ui-monospace, Menlo, monospace';
    ctx.beginPath();
    for (const hz of SPECTRUM_GUIDES) {
      const x = Math.round(this.xOfHz(hz, w)) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h - 14);
    }
    ctx.stroke();
    for (const hz of SPECTRUM_GUIDES) {
      const x = this.xOfHz(hz, w);
      ctx.fillText(hz >= 1000 ? `${hz / 1000}k` : String(hz), x + 3, h - 4);
    }
  }

  private drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const analyser = this.media.specAnalyser;
    if (!analyser) {
      return;
    }
    if (this.buf.length !== analyser.frequencyBinCount) {
      this.buf = new Float32Array(analyser.frequencyBinCount);
    }
    const buf = this.buf;
    analyser.getFloatFrequencyData(buf);
    const rate = this.media.sampleRate() || 48000;
    const binHz = rate / analyser.fftSize;

    // One column per pixel, taking the loudest bin that lands in it, so the
    // top end does not alias away on a log axis.
    const tops = new Float32Array(w).fill(SPECTRUM_MIN_DB);
    for (let i = 1; i < buf.length; i++) {
      const hz = i * binHz;
      if (hz < SPECTRUM_MIN_HZ || hz > SPECTRUM_MAX_HZ) {
        continue;
      }
      const px = Math.min(w - 1, Math.max(0, Math.round(this.xOfHz(hz, w))));
      const db = Math.max(SPECTRUM_MIN_DB, Math.min(0, buf[i]));
      if (db > tops[px]) {
        tops[px] = db;
      }
    }
    // getFloatFrequencyData ignores min/maxDecibels, so the range is applied
    // here rather than on the analyser.
    const yOf = (db: number) => h - ((db - SPECTRUM_MIN_DB) / -SPECTRUM_MIN_DB) * h;

    ctx.beginPath();
    ctx.moveTo(0, h);
    let last = h;
    for (let px = 0; px < w; px++) {
      const y = tops[px] > SPECTRUM_MIN_DB ? yOf(tops[px]) : last;
      last = y;
      ctx.lineTo(px, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 138, 72, 0.35)';
    ctx.fill();

    ctx.beginPath();
    last = h;
    for (let px = 0; px < w; px++) {
      const y = tops[px] > SPECTRUM_MIN_DB ? yOf(tops[px]) : last;
      last = y;
      if (px === 0) {
        ctx.moveTo(px, y);
      } else {
        ctx.lineTo(px, y);
      }
    }
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = TRACE;
    ctx.stroke();

    let peak = 0;
    for (let px = 0; px < w; px++) {
      if (tops[px] > SPECTRUM_MIN_DB) {
        peak = Math.max(peak, Math.pow(10, tops[px] / 20));
      }
    }
    this.media.reportLevel(peak);
  }
}
