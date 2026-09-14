import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StageSettingsService } from '../../core/stage-settings.service';
import { StageCamComponent } from './stage-cam.component';
import { StageScopeComponent } from './stage-scope.component';

/**
 * Stage Mode column (spec §3 and §5.1): the fixed-width strip to the right
 * of the slide, holding a 9:16 camera tile above an oscilloscope tile.
 *
 * Pure layout. It reads the settings service and renders whichever tiles are
 * on; the tiles themselves own their capture. Rendered only from inside the
 * Stage Mode @if in ws-slide-stage, so none of this exists with the flag off.
 *
 * The camera tile may shrink below 9:16 at the widest column settings (above
 * about 455 px the 9:16 box plus the scope minimum no longer fit in 1032 px).
 * That is deliberate: flex shrinks the tile and object-fit crops a little
 * more of the feed, which beats overflowing the column.
 */
@Component({
  selector: 'ws-stage-column',
  imports: [TranslocoPipe, StageCamComponent, StageScopeComponent],
  template: `
    <div class="col">
      @if (!camOn() && !scopeOn()) {
        <div class="tile tile--empty">
          <p class="tile__placeholder">{{ 'stage.both_off' | transloco }}</p>
        </div>
      } @else {
        @if (camOn()) {
          <div class="tile tile--cam">
            <span class="tile__head">{{ 'stage.cam' | transloco }}</span>
            <div class="tile__body">
              <ws-stage-cam />
            </div>
          </div>
        }
        @if (scopeOn()) {
          <div class="tile tile--scope">
            <span class="tile__head">
              @if (scopeMode() === 'spectrum') {
                {{ 'stage.spectrum' | transloco }}
              } @else {
                {{ 'stage.scope_header' | transloco: { ms: timeDiv() } }}
              }
            </span>
            <div class="tile__body">
              <ws-stage-scope />
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    :host {
      flex: none;
      width: var(--stage-col, 360px);
      /* Never let the column starve the slide in a small window. */
      max-width: 40%;
      min-width: 0;
      height: 100%;
    }
    .col {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow: hidden;
    }
    .tile {
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--ws-stage-tile);
      border: 2px solid var(--ws-stage-tile-border);
      border-radius: 24px;
    }
    /* 9:16, but allowed to shrink when the column is wide (see the note
       above); the scope keeps a usable floor and takes the rest. */
    .tile--cam {
      flex: 0 1 auto;
      min-height: 0;
      width: 100%;
      aspect-ratio: 9 / 16;
    }
    .tile--scope,
    .tile--empty {
      flex: 1 1 auto;
      min-height: 200px;
    }
    .tile__head {
      flex: none;
      padding: 14px 18px 0;
      font-family: var(--ws-font-mono);
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--ws-stage-tile-label);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tile__body {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tile__placeholder {
      margin: 0;
      padding: 0 18px;
      font-family: var(--ws-font-mono);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
      color: var(--ws-stage-tile-faint);
    }
    .tile--empty {
      align-items: center;
      justify-content: center;
    }
  `,
})
export class StageColumnComponent {
  protected readonly stage = inject(StageSettingsService);

  protected readonly camOn = computed(() => this.stage.cam().enabled);
  protected readonly scopeOn = computed(() => this.stage.scope().enabled);
  protected readonly scopeMode = computed(() => this.stage.scope().mode);
  protected readonly timeDiv = computed(() => this.stage.scope().timeDiv);
}
