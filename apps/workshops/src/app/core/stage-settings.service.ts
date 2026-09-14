import { Injectable, computed, signal } from '@angular/core';

/**
 * Stage Mode settings (planning/docs/spec/stage-mode-spec.md §4).
 *
 * Presenter-only tool: a right-hand column next to the deck with a live
 * camera tile and an oscilloscope. Everything lives in one persisted JSON
 * blob and the master flag is OFF by default, so a deck that never turns it
 * on behaves exactly as it did before this feature existed.
 *
 * This service holds STATE ONLY. It touches no media API, so it stays cheap
 * enough to live in the eager deck chunk; the capture code sits in
 * stage-media.service.ts, which only the deferred tiles import.
 */

export type StageRotation = 0 | 90 | 180 | 270;
export type ScopeMode = 'wave' | 'spectrum';
/** Channel 1, channel 2, or (1+2)/2. */
export type ScopeChannel = 'left' | 'right' | 'mix';
/** Milliseconds per division, 10 divisions across the tile. */
export type ScopeTimeDiv = 1 | 2 | 5 | 10;

export interface StageCamSettings {
  enabled: boolean;
  deviceId: string | null;
  /** Fallback matcher: Chrome regenerates ids when site data is cleared. */
  deviceLabel: string | null;
  rotation: StageRotation;
  mirror: boolean;
}

export interface StageScopeSettings {
  enabled: boolean;
  deviceId: string | null;
  deviceLabel: string | null;
  channel: ScopeChannel;
  mode: ScopeMode;
  timeDiv: ScopeTimeDiv;
  autoGain: boolean;
}

export interface StageSettings {
  version: 1;
  /** The master flag. False = the deck of before this feature. */
  enabled: boolean;
  /** Column width in px on the 1920 canvas. */
  columnWidth: number;
  cam: StageCamSettings;
  scope: StageScopeSettings;
}

const KEY = 'ws_stage_settings';

export const STAGE_COL_MIN = 280;
export const STAGE_COL_MAX = 480;
export const STAGE_COL_STEP = 20;
export const STAGE_COL_DEFAULT = 360;
/** The canvas the column width is expressed against. */
export const STAGE_CANVAS_WIDTH = 1920;

export const SCOPE_TIME_DIVS: readonly ScopeTimeDiv[] = [1, 2, 5, 10];
export const STAGE_ROTATIONS: readonly StageRotation[] = [0, 90, 180, 270];

function defaults(): StageSettings {
  return {
    version: 1,
    enabled: false,
    columnWidth: STAGE_COL_DEFAULT,
    cam: {
      enabled: true,
      deviceId: null,
      deviceLabel: null,
      rotation: 90,
      mirror: false,
    },
    scope: {
      enabled: true,
      deviceId: null,
      deviceLabel: null,
      channel: 'left',
      mode: 'wave',
      timeDiv: 2,
      autoGain: true,
    },
  };
}

function clampWidth(px: number): number {
  if (!Number.isFinite(px)) {
    return STAGE_COL_DEFAULT;
  }
  return Math.min(STAGE_COL_MAX, Math.max(STAGE_COL_MIN, Math.round(px)));
}

/** Parse defensively: anything unexpected falls back to a disabled default. */
function parse(raw: string | null): StageSettings {
  if (!raw) {
    return defaults();
  }
  try {
    const data = JSON.parse(raw) as Partial<StageSettings>;
    if (!data || data.version !== 1) {
      return defaults();
    }
    const base = defaults();
    const cam = { ...base.cam, ...(data.cam ?? {}) };
    const scope = { ...base.scope, ...(data.scope ?? {}) };
    return {
      version: 1,
      enabled: data.enabled === true,
      columnWidth: clampWidth(data.columnWidth ?? STAGE_COL_DEFAULT),
      cam: {
        enabled: cam.enabled !== false,
        deviceId: cam.deviceId ?? null,
        deviceLabel: cam.deviceLabel ?? null,
        rotation: STAGE_ROTATIONS.includes(cam.rotation) ? cam.rotation : 90,
        mirror: cam.mirror === true,
      },
      scope: {
        enabled: scope.enabled !== false,
        deviceId: scope.deviceId ?? null,
        deviceLabel: scope.deviceLabel ?? null,
        channel: (['left', 'right', 'mix'] as const).includes(scope.channel)
          ? scope.channel
          : 'left',
        mode: scope.mode === 'spectrum' ? 'spectrum' : 'wave',
        timeDiv: SCOPE_TIME_DIVS.includes(scope.timeDiv) ? scope.timeDiv : 2,
        autoGain: scope.autoGain !== false,
      },
    };
  } catch {
    return defaults();
  }
}

@Injectable({ providedIn: 'root' })
export class StageSettingsService {
  private readonly state = signal<StageSettings>(this.load());

  readonly settings = this.state.asReadonly();

  /** The master flag, read on every render of the deck. */
  readonly enabled = computed(() => this.state().enabled);
  readonly columnWidth = computed(() => this.state().columnWidth);
  readonly cam = computed(() => this.state().cam);
  readonly scope = computed(() => this.state().scope);

  private load(): StageSettings {
    try {
      return parse(localStorage.getItem(KEY));
    } catch {
      // Storage unavailable (private mode, blocked cookies): run on defaults.
      return defaults();
    }
  }

  private commit(next: StageSettings) {
    this.state.set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: the change still applies for this visit.
    }
  }

  setEnabled(enabled: boolean) {
    if (this.state().enabled === enabled) {
      return;
    }
    this.commit({ ...this.state(), enabled });
  }

  toggleEnabled() {
    this.setEnabled(!this.state().enabled);
  }

  setColumnWidth(px: number) {
    this.commit({ ...this.state(), columnWidth: clampWidth(px) });
  }

  stepColumnWidth(delta: number) {
    this.setColumnWidth(this.state().columnWidth + delta * STAGE_COL_STEP);
  }

  patchCam(patch: Partial<StageCamSettings>) {
    this.commit({ ...this.state(), cam: { ...this.state().cam, ...patch } });
  }

  patchScope(patch: Partial<StageScopeSettings>) {
    this.commit({
      ...this.state(),
      scope: { ...this.state().scope, ...patch },
    });
  }

  toggleCam() {
    this.patchCam({ enabled: !this.state().cam.enabled });
  }

  toggleScope() {
    this.patchScope({ enabled: !this.state().scope.enabled });
  }

  cycleRotation() {
    const at = STAGE_ROTATIONS.indexOf(this.state().cam.rotation);
    this.patchCam({
      rotation: STAGE_ROTATIONS[(at + 1) % STAGE_ROTATIONS.length],
    });
  }

  toggleScopeMode() {
    this.patchScope({
      mode: this.state().scope.mode === 'wave' ? 'spectrum' : 'wave',
    });
  }

  /** Step the time base along SCOPE_TIME_DIVS; +1 is a slower sweep. */
  stepTimeDiv(delta: number) {
    const at = SCOPE_TIME_DIVS.indexOf(this.state().scope.timeDiv);
    const next = Math.min(
      SCOPE_TIME_DIVS.length - 1,
      Math.max(0, at + Math.sign(delta)),
    );
    this.patchScope({ timeDiv: SCOPE_TIME_DIVS[next] });
  }

  reset() {
    this.commit(defaults());
  }
}
