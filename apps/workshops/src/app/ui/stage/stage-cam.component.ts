import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  StageMediaService,
  resolveDevice,
} from '../../core/stage-media.service';
import { StageSettingsService } from '../../core/stage-settings.service';

/** Frames must advance within this long or the feed counts as frozen. */
const STALL_MS = 2500;

/**
 * Camera tile (spec §5.2): a 9:16 box showing a landscape feed rotated so
 * the synth stands vertical.
 *
 * Geometry: for 90 and 270 the video element is sized to the box's
 * transposed dimensions and rotated about its centre, so a 16:9 feed lands
 * exactly on a 16:9 element and object-fit crops nothing. A feed that is not
 * 16:9 (a 4:3 webcam) does get cropped at the two ends, which is worth
 * knowing before pointing it at a keyboard.
 *
 * Mirror comes BEFORE the rotation in the transform list. CSS composes right
 * to left, so appending scaleX(-1) after rotate(90deg) would flip the
 * already-rotated image along the wrong axis.
 *
 * Only the instance in the column owns the stream. The dialog preview sets
 * owner to false and just displays what the service already has: a second
 * getUserMedia on the same device can renegotiate the capture and kill the
 * feed on the projector.
 */
@Component({
  selector: 'ws-stage-cam',
  imports: [TranslocoPipe],
  template: `
    <video
      #video
      class="v"
      autoplay
      muted
      playsinline
      [style.width.px]="videoWidth()"
      [style.height.px]="videoHeight()"
      [style.transform]="videoTransform()"
    ></video>
    @if (message(); as key) {
      <p class="msg">{{ key | transloco }}</p>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .v {
      position: absolute;
      top: 50%;
      left: 50%;
      display: block;
      object-fit: cover;
      transform-origin: 50% 50%;
      background: #000;
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
      background: var(--ws-stage-tile);
    }
  `,
})
export class StageCamComponent implements OnDestroy {
  private readonly stage = inject(StageSettingsService);
  private readonly media = inject(StageMediaService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly videoRef =
    viewChild.required<ElementRef<HTMLVideoElement>>('video');

  /** False for the dialog preview, which must not touch the capture. */
  readonly owner = input(true);

  private readonly boxWidth = signal(0);
  private readonly boxHeight = signal(0);
  private readonly stalled = signal(false);

  private readonly rotation = computed(() => this.stage.cam().rotation);
  private readonly deviceId = computed(() => this.stage.cam().deviceId);
  private readonly quarterTurn = computed(
    () => this.rotation() === 90 || this.rotation() === 270,
  );

  protected readonly videoWidth = computed(() =>
    this.quarterTurn() ? this.boxHeight() : this.boxWidth(),
  );
  protected readonly videoHeight = computed(() =>
    this.quarterTurn() ? this.boxWidth() : this.boxHeight(),
  );
  protected readonly videoTransform = computed(() => {
    const mirror = this.stage.cam().mirror ? ' scaleX(-1)' : '';
    return `translate(-50%, -50%)${mirror} rotate(${this.rotation()}deg)`;
  });

  protected readonly message = computed(() => {
    if (this.stalled() && this.media.camState() === 'live') {
      return 'stage.no_signal';
    }
    switch (this.media.camState()) {
      case 'live':
        return null;
      case 'idle':
        return 'stage.pick_camera';
      case 'starting':
        return 'stage.starting';
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

  private syncToken = 0;
  private destroyed = false;
  private lastTime = -1;

  constructor() {
    effect(() => {
      const el = this.videoRef().nativeElement;
      const stream = this.media.camStream();
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        this.lastTime = -1;
        this.stalled.set(false);
      }
    });

    effect((onCleanup) => {
      const el = this.host.nativeElement as HTMLElement;
      const observer = new ResizeObserver(() => {
        this.boxWidth.set(el.clientWidth);
        this.boxHeight.set(el.clientHeight);
      });
      observer.observe(el);
      this.boxWidth.set(el.clientWidth);
      this.boxHeight.set(el.clientHeight);
      onCleanup(() => observer.disconnect());
    });

    // Track the device id and nothing else, for the same reason as the scope
    // tile: an async function's prefix runs inside the reactive context, so
    // reading the settings object there would make `r` restart the capture.
    effect(() => {
      const id = this.deviceId();
      const label = untracked(() => this.stage.cam().deviceLabel);
      if (this.owner()) {
        void this.syncDevice(id, label);
      }
    });

    // Everything owner-gated lives in an effect, not the constructor: a
    // signal input still holds its declared default while the constructor
    // runs, so the dialog preview would claim ownership of the capture and
    // then never release it.
    effect((onCleanup) => {
      if (!this.owner()) {
        return;
      }
      const detach = this.media.onDeviceChange(() => {
        const cfg = untracked(() => this.stage.cam());
        void this.syncDevice(cfg.deviceId, cfg.deviceLabel);
      });
      // A device that stops delivering frames leaves the last one on screen,
      // which looks live and is the worst failure mode on a projector.
      const watchdog = setInterval(() => {
        const el = this.videoRef().nativeElement;
        if (this.media.camState() !== 'live') {
          return;
        }
        const now = el.currentTime;
        this.stalled.set(this.lastTime >= 0 && now === this.lastTime);
        this.lastTime = now;
      }, STALL_MS);
      onCleanup(() => {
        detach();
        clearInterval(watchdog);
        this.media.stopCam();
      });
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.syncToken++;
    this.videoRef().nativeElement.srcObject = null;
  }

  private async syncDevice(deviceId: string | null, deviceLabel: string | null) {
    const token = ++this.syncToken;
    if (!deviceId && !deviceLabel) {
      this.media.stopCam();
      return;
    }
    const device = await resolveDevice('videoinput', deviceId, deviceLabel);
    // The tile may have been torn down while enumerateDevices was in flight.
    if (token !== this.syncToken || this.destroyed) {
      return;
    }
    if (!device) {
      this.media.stopCam(true);
      this.media.camState.set('not-found');
      return;
    }
    if (device.deviceId !== deviceId || device.label !== deviceLabel) {
      this.stage.patchCam({
        deviceId: device.deviceId,
        deviceLabel: device.label,
      });
    }
    await this.media.startCam(device.deviceId);
  }
}
