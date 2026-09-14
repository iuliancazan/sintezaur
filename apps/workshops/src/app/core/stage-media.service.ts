import { Injectable, signal } from '@angular/core';
import type { ScopeChannel } from './stage-settings.service';

/**
 * Capture for Stage Mode (spec §5.2 and §5.3): the audio graph feeding the
 * oscilloscope, and later the camera stream.
 *
 * This is a service rather than component state on purpose:
 *
 * - Chrome allows only six AudioContexts per page and throws on the seventh,
 *   so the context is created once and reused for the page lifetime. Only
 *   the source, splitter and gain are rebuilt when the device changes.
 * - A MediaStreamAudioSourceNode whose only reference is a local variable
 *   can be garbage collected, and the scope then goes flat for no visible
 *   reason. Every node is held as a field until teardown.
 * - The settings dialog shows a live preview and a level meter off the same
 *   capture, so one stream feeds several views.
 *
 * Only the deferred Stage Mode tiles inject this, so none of it reaches the
 * deck chunk that a normal visitor downloads.
 */

export type StageTileState =
  | 'idle'
  | 'starting'
  | 'live'
  | 'suspended'
  | 'no-permission'
  | 'not-found'
  | 'in-use'
  | 'error';

/** Waveform needs 100 ms at up to 96 kHz; 32768 is the Web Audio maximum. */
const FFT_WAVE = 32768;
const FFT_SPECTRUM = 8192;
const LEVEL_INTERVAL_MS = 100;
const DEVICE_CHANGE_DEBOUNCE_MS = 500;

/**
 * Map a getUserMedia rejection onto a tile state. A stale exact deviceId
 * rejects with OverconstrainedError, NOT NotFoundError, which is the case
 * that actually happens when the interface is unplugged.
 */
export function mediaErrorState(err: unknown): StageTileState {
  const name = (err as { name?: string } | null)?.name ?? '';
  switch (name) {
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'not-found';
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'no-permission';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'in-use';
    default:
      return 'error';
  }
}

/**
 * Prefer the exact id, fall back to the label: Chrome regenerates device ids
 * when site data is cleared, but labels survive. Returns null rather than
 * silently falling back to the default device, because on stage the laptop
 * microphone is worse than an honest placeholder.
 */
export async function resolveDevice(
  kind: MediaDeviceKind,
  deviceId: string | null,
  label: string | null,
): Promise<MediaDeviceInfo | null> {
  if (!deviceId && !label) {
    return null;
  }
  let devices: MediaDeviceInfo[] = [];
  try {
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch {
    return null;
  }
  const ofKind = devices.filter((d) => d.kind === kind);
  return (
    ofKind.find((d) => d.deviceId === deviceId) ??
    (label ? ofKind.find((d) => d.label === label) : undefined) ??
    null
  );
}

export async function listDevices(
  kind: MediaDeviceKind,
): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === kind);
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class StageMediaService {
  readonly audioState = signal<StageTileState>('idle');
  /** Peak of the last frame, throttled: a 60 Hz signal would drive 60 change
   * detection passes per second in this zoneless app. */
  readonly audioLevel = signal(0);
  readonly sampleRate = signal(0);
  /** 1 means a mono device, so channel 2 and the mix are dead. */
  readonly audioChannels = signal(0);

  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private gain: GainNode | null = null;
  private sink: MediaStreamAudioDestinationNode | null = null;
  private waveNode: AnalyserNode | null = null;
  private specNode: AnalyserNode | null = null;

  private channel: ScopeChannel = 'left';
  private startToken = 0;
  private levelAt = 0;
  private resumeBound: (() => void) | null = null;
  private stateBound: (() => void) | null = null;
  private deviceChangeBound: (() => void) | null = null;
  private deviceChangeTimer: ReturnType<typeof setTimeout> | null = null;
  private deviceChangeHandlers = new Set<() => void>();

  get waveAnalyser(): AnalyserNode | null {
    return this.waveNode;
  }

  get specAnalyser(): AnalyserNode | null {
    return this.specNode;
  }

  /** Feed from the draw loop; throttled before it reaches a signal. */
  reportLevel(peak: number) {
    const now = performance.now();
    if (now - this.levelAt < LEVEL_INTERVAL_MS) {
      return;
    }
    this.levelAt = now;
    this.audioLevel.set(peak);
  }

  /**
   * Start (or restart) audio capture. The three processing flags must be
   * off: with Chrome's defaults noise suppression gates a synth, automatic
   * gain pumps the amplitude and echo cancellation smears the waveform.
   */
  async startAudio(
    deviceId: string,
    channel: ScopeChannel,
  ): Promise<StageTileState> {
    // stopAudio bumps the token to cancel any in-flight start, so this
    // start's own token has to be taken AFTER it, or it cancels itself.
    this.stopAudio(true);
    const token = ++this.startToken;
    this.channel = channel;
    this.audioState.set('starting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
        },
        video: false,
      });
    } catch (err) {
      if (token !== this.startToken) {
        return this.audioState();
      }
      const state = mediaErrorState(err);
      this.audioState.set(state);
      return state;
    }

    // A disable that landed while getUserMedia was in flight must not leave
    // a live microphone behind.
    if (token !== this.startToken) {
      stream.getTracks().forEach((t) => t.stop());
      return this.audioState();
    }

    this.stream = stream;
    const track = stream.getAudioTracks()[0];
    const settings = track?.getSettings() ?? {};
    this.audioChannels.set(settings.channelCount ?? 0);
    console.info('[stage] audio input', {
      label: track?.label,
      sampleRate: settings.sampleRate,
      channelCount: settings.channelCount,
      autoGainControl: settings.autoGainControl,
      noiseSuppression: settings.noiseSuppression,
      echoCancellation: settings.echoCancellation,
    });

    if (track) {
      track.addEventListener('ended', () => this.onTrackLost());
      // A device that is present but delivering nothing (interface asleep,
      // grabbed by another app) mutes rather than ending.
      track.addEventListener('mute', () => this.audioState.set('in-use'));
      track.addEventListener('unmute', () => this.audioState.set('live'));
    }

    const ctx = this.ensureContext();
    this.sampleRate.set(ctx.sampleRate);

    this.source = ctx.createMediaStreamSource(stream);
    this.splitter = ctx.createChannelSplitter(2);
    this.gain = ctx.createGain();
    this.waveNode = ctx.createAnalyser();
    this.specNode = ctx.createAnalyser();
    this.sink = ctx.createMediaStreamDestination();

    this.waveNode.fftSize = FFT_WAVE;
    this.waveNode.smoothingTimeConstant = 0;
    this.specNode.fftSize = FFT_SPECTRUM;
    this.specNode.smoothingTimeConstant = 0.6;

    this.source.connect(this.splitter);
    this.applyChannel();
    this.gain.connect(this.waveNode);
    this.gain.connect(this.specNode);
    // A MediaStreamAudioDestinationNode is a real destination that makes no
    // sound, so the graph is guaranteed to be pulled with zero feedback risk.
    // Never connect to ctx.destination: that would put the synth through the
    // laptop speakers, into the room, and back into the interface.
    this.waveNode.connect(this.sink);
    this.specNode.connect(this.sink);

    this.attachContextState();
    this.audioState.set(ctx.state === 'running' ? 'live' : 'suspended');
    void this.resume();
    return this.audioState();
  }

  setChannel(channel: ScopeChannel) {
    this.channel = channel;
    this.applyChannel();
  }

  private applyChannel() {
    const { splitter, gain } = this;
    if (!splitter || !gain) {
      return;
    }
    splitter.disconnect();
    if (this.channel === 'mix') {
      splitter.connect(gain, 0);
      splitter.connect(gain, 1);
      gain.gain.value = 0.5;
    } else {
      splitter.connect(gain, this.channel === 'right' ? 1 : 0);
      gain.gain.value = 1;
    }
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
    }
    return this.ctx;
  }

  /** Autoplay policy: the context can start suspended, and macOS can also
   * suspend it when the output device disappears (which is the same box). */
  private attachContextState() {
    const ctx = this.ctx;
    if (!ctx || this.stateBound) {
      return;
    }
    this.stateBound = () => {
      if (this.audioState() === 'idle') {
        return;
      }
      this.audioState.set(ctx.state === 'running' ? 'live' : 'suspended');
    };
    ctx.addEventListener('statechange', this.stateBound);

    this.resumeBound = () => void this.resume();
    document.addEventListener('keydown', this.resumeBound);
    document.addEventListener('click', this.resumeBound);
  }

  private async resume() {
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') {
      return;
    }
    try {
      await ctx.resume();
    } catch {
      // Still waiting for a user gesture; the tile says so.
    }
  }

  private onTrackLost() {
    this.stopAudio(true);
    this.audioState.set('not-found');
  }

  /**
   * Tear the graph down. The context itself is kept (Chrome's six-context
   * limit), suspended so it costs nothing.
   */
  stopAudio(keepState = false) {
    this.startToken++;
    for (const node of [
      this.source,
      this.splitter,
      this.gain,
      this.waveNode,
      this.specNode,
      this.sink,
    ]) {
      try {
        node?.disconnect();
      } catch {
        // Already disconnected.
      }
    }
    this.source = null;
    this.splitter = null;
    this.gain = null;
    this.waveNode = null;
    this.specNode = null;
    this.sink = null;

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioLevel.set(0);
    this.audioChannels.set(0);

    if (this.resumeBound) {
      document.removeEventListener('keydown', this.resumeBound);
      document.removeEventListener('click', this.resumeBound);
      this.resumeBound = null;
    }
    if (this.stateBound && this.ctx) {
      this.ctx.removeEventListener('statechange', this.stateBound);
      this.stateBound = null;
    }
    void this.ctx?.suspend().catch(() => undefined);

    if (!keepState) {
      this.audioState.set('idle');
    }
  }

  /**
   * Debounced devicechange. macOS fires bursts of these whenever a nearby
   * iPhone offers itself as a Continuity Camera, and an undebounced handler
   * would restart the feed mid-demo because a phone woke up in a pocket.
   */
  onDeviceChange(handler: () => void): () => void {
    this.deviceChangeHandlers.add(handler);
    if (!this.deviceChangeBound) {
      this.deviceChangeBound = () => {
        if (this.deviceChangeTimer) {
          clearTimeout(this.deviceChangeTimer);
        }
        this.deviceChangeTimer = setTimeout(() => {
          this.deviceChangeHandlers.forEach((fn) => fn());
        }, DEVICE_CHANGE_DEBOUNCE_MS);
      };
      navigator.mediaDevices?.addEventListener(
        'devicechange',
        this.deviceChangeBound,
      );
    }
    return () => {
      this.deviceChangeHandlers.delete(handler);
      if (this.deviceChangeHandlers.size === 0 && this.deviceChangeBound) {
        navigator.mediaDevices?.removeEventListener(
          'devicechange',
          this.deviceChangeBound,
        );
        this.deviceChangeBound = null;
        if (this.deviceChangeTimer) {
          clearTimeout(this.deviceChangeTimer);
          this.deviceChangeTimer = null;
        }
      }
    };
  }

  /**
   * enumerateDevices returns blank labels until the page has been granted
   * access once. Ask for both, then drop the tracks immediately.
   */
  async grantAccess(): Promise<boolean> {
    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      probe.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }
}
