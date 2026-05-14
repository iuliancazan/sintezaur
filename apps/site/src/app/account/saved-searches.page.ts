import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SzIconComponent } from '@sintezaur/ui';
import {
  BazarService,
  type SavedSearchRow,
} from '../bazar/bazar.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

type NotifyMode = SavedSearchRow['notifyMode'];

const MODES: NotifyMode[] = ['instant', 'daily_digest', 'off'];

@Component({
  selector: 'app-saved-searches-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, SzIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="ss">
      <header class="ss__head">
        <a routerLink="/cont" class="ss__back">
          <sz-icon name="back" [size]="14" />
          {{ 'account.back_to_account' | t }}
        </a>
        <h1>{{ 'saved_searches.title' | t }}</h1>
        <p class="ss__lede">{{ 'saved_searches.lede' | t }}</p>
      </header>

      @if (loading()) {
        <p class="ss__empty">{{ 'app.loading' | t }}</p>
      } @else if (rows().length === 0) {
        <p class="ss__empty">{{ 'saved_searches.empty' | t }}</p>
      } @else {
        <ul class="ss__list">
          @for (s of rows(); track s.id) {
            <li class="ss__row">
              <div class="ss__main">
                @if (editingId() === s.id) {
                  <input
                    class="ss__name-input"
                    [(ngModel)]="editingName"
                    (keydown.enter)="saveName(s.id)"
                    (blur)="saveName(s.id)"
                    autofocus
                  />
                } @else {
                  <button
                    type="button"
                    class="ss__name"
                    (click)="startEdit(s)"
                    [attr.aria-label]="i18n.t('saved_searches.rename')"
                  >
                    {{ s.name }}
                  </button>
                }
                <div class="ss__chips">
                  @for (chip of summarize(s); track chip) {
                    <span class="ss__chip">{{ chip }}</span>
                  }
                  @if (summarize(s).length === 0) {
                    <span class="ss__chip is-muted">
                      {{ 'saved_searches.no_filters' | t }}
                    </span>
                  }
                </div>
                <div class="ss__meta">
                  {{
                    'saved_searches.created'
                      | t: { date: formatDate(s.createdAt) }
                  }}
                  @if (s.lastNotifiedAt) {
                    <span class="sep">·</span>
                    {{
                      'saved_searches.last_notified'
                        | t: { date: formatDate(s.lastNotifiedAt) }
                    }}
                  }
                </div>
              </div>
              <div class="ss__actions">
                <a
                  class="ss__act"
                  [routerLink]="['/bazar']"
                  [queryParams]="s.query"
                >
                  {{ 'saved_searches.run' | t }}
                </a>
                <select
                  class="ss__mode"
                  [value]="s.notifyMode"
                  (change)="changeMode(s.id, $any($event.target).value)"
                  [attr.aria-label]="i18n.t('saved_searches.notify_label')"
                >
                  @for (m of modes; track m) {
                    <option [value]="m">
                      {{ 'saved_searches.mode.' + m | t }}
                    </option>
                  }
                </select>
                <button
                  type="button"
                  class="ss__del"
                  [disabled]="deletingId() === s.id"
                  (click)="confirmDelete(s.id)"
                  [attr.aria-label]="i18n.t('saved_searches.delete')"
                >
                  <sz-icon name="x" [size]="14" />
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .ss { max-width: 960px; margin: 0 auto; padding: 32px var(--gutter-x) 64px; }
      .ss__back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        text-decoration: none;
        margin-bottom: 14px;
      }
      h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 4vw, 38px);
        line-height: 1.1;
        margin: 0 0 8px;
      }
      .ss__lede { color: var(--fg-muted); font-size: 14px; margin: 0 0 22px; max-width: 60ch; }
      .ss__empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        border: 1px dashed var(--line);
      }
      .ss__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .ss__row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        padding: 14px 16px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        align-items: center;
      }
      .ss__name {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 17px;
        background: none;
        border: 0;
        text-align: left;
        color: var(--fg);
        cursor: pointer;
        padding: 0;
      }
      .ss__name:hover { color: var(--accent); }
      .ss__name-input {
        padding: 4px 8px;
        background: var(--bg);
        border: 1px solid var(--accent);
        font-family: var(--font-display);
        font-size: 17px;
        color: var(--fg);
        width: 100%;
        max-width: 380px;
      }
      .ss__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin: 6px 0;
      }
      .ss__chip {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 2px 8px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
      }
      .ss__chip.is-muted { color: var(--fg-subtle); border-style: dashed; }
      .ss__meta {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .ss__meta .sep { margin: 0 4px; color: var(--fg-subtle); }

      .ss__actions { display: inline-flex; gap: 8px; align-items: center; }
      .ss__act {
        padding: 8px 12px;
        background: var(--accent);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        text-decoration: none;
      }
      .ss__mode {
        padding: 8px 10px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg);
        cursor: pointer;
      }
      .ss__del {
        width: 36px;
        height: 36px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg-muted);
        cursor: pointer;
        display: grid;
        place-items: center;
      }
      .ss__del:hover:not(:disabled) { color: #c0392b; border-color: #c0392b; }
      .ss__del:disabled { opacity: 0.5; cursor: not-allowed; }

      @media (max-width: 720px) {
        .ss__row { grid-template-columns: 1fr; }
        .ss__actions { justify-content: flex-end; }
      }
    `,
  ],
})
export class SavedSearchesPage {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);
  private readonly router = inject(Router);

  readonly modes = MODES;

  readonly rows = signal<SavedSearchRow[]>([]);
  readonly loading = signal(true);
  readonly editingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  editingName = '';

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.bazar.listSavedSearches();
      this.rows.set(rows);
    } catch (err) {
      console.error('[bazar] saved searches load failed', err);
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(s: SavedSearchRow): void {
    this.editingId.set(s.id);
    this.editingName = s.name;
  }

  async saveName(id: string): Promise<void> {
    if (this.editingId() !== id) return;
    const name = this.editingName.trim();
    if (!name) {
      this.editingId.set(null);
      return;
    }
    try {
      const updated = await this.bazar.updateSavedSearch(id, { name });
      this.rows.update((rows) =>
        rows.map((r) => (r.id === id ? updated : r)),
      );
    } catch (err) {
      console.error('[bazar] rename saved search failed', err);
    } finally {
      this.editingId.set(null);
    }
  }

  async changeMode(id: string, mode: string): Promise<void> {
    if (!MODES.includes(mode as NotifyMode)) return;
    try {
      const updated = await this.bazar.updateSavedSearch(id, {
        notifyMode: mode as NotifyMode,
      });
      this.rows.update((rows) =>
        rows.map((r) => (r.id === id ? updated : r)),
      );
    } catch (err) {
      console.error('[bazar] mode change failed', err);
    }
  }

  async confirmDelete(id: string): Promise<void> {
    const ok = window.confirm(this.i18n.t('saved_searches.delete_confirm'));
    if (!ok) return;
    this.deletingId.set(id);
    try {
      await this.bazar.deleteSavedSearch(id);
      this.rows.update((rows) => rows.filter((r) => r.id !== id));
    } catch (err) {
      console.error('[bazar] delete saved search failed', err);
    } finally {
      this.deletingId.set(null);
    }
  }

  summarize(s: SavedSearchRow): string[] {
    const q = s.query as Record<string, unknown>;
    const chips: string[] = [];
    if (q['q']) chips.push(`"${q['q']}"`);
    if (q['category'])
      chips.push(this.humanize(String(q['category'])));
    const conds = q['conditions'] as string[] | undefined;
    if (conds?.length)
      for (const c of conds)
        chips.push(this.i18n.t('bazar.condition.' + c));
    const kinds = q['kinds'] as string[] | undefined;
    if (kinds?.length)
      for (const k of kinds)
        chips.push(this.i18n.t('bazar.kind.' + k));
    if (q['priceMin'] !== undefined || q['priceMax'] !== undefined) {
      const lo = q['priceMin'] ?? 0;
      const hi = q['priceMax'] ?? '∞';
      const cur = String(q['currency'] ?? 'ron').toUpperCase();
      chips.push(`${lo} — ${hi} ${cur}`);
    }
    if (q['location']) chips.push(String(q['location']));
    return chips;
  }

  private humanize(s: string): string {
    return s
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
