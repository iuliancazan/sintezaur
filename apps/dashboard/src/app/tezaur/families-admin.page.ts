import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SzButtonComponent } from '@sintezaur/ui';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  TezaurAdminService,
  type GearFamilyAdminRow,
} from './tezaur-admin.service';

interface EditFamilyState {
  id: string;
  name: string;
  slug: string;
  summary: string;
}

interface MergeFamilyState {
  fromId: string;
  fromName: string;
  fromGearCount: number;
  intoId: string;
}

/**
 * M15-A — Familii Tezaur (admin management page).
 *
 * Listă cu toate familiile, count piese active per familie, edit inline,
 * delete (safe — gear.family_id e ON DELETE SET NULL), și merge ("mută
 * toate piesele din familia X în familia Y, șterge X"). Toate acțiunile
 * sunt audit-logate de service-ul backend.
 */
@Component({
  selector: 'app-families-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, SzButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="fa">
      <header class="fa__head">
        <div>
          <a routerLink="/tezaur" class="fa__back">
            ← {{ 'families.back_to_tezaur' | t }}
          </a>
          <h1>{{ 'families.title' | t }}</h1>
          <p class="fa__meta">
            {{ rows().length }} {{ 'families.total_suffix' | t }}
            @if (orphanCount() > 0) {
              · {{ orphanCount() }} {{ 'families.orphan_suffix' | t }}
            }
          </p>
        </div>
      </header>

      <div class="fa__filter">
        <input
          type="search"
          [placeholder]="i18n.t('families.filter_placeholder')"
          [(ngModel)]="filterText"
          (input)="onFilterChange()"
        />
      </div>

      <table class="fa__table">
        <thead>
          <tr>
            <th>{{ 'families.col_name' | t }}</th>
            <th>{{ 'families.col_slug' | t }}</th>
            <th class="num">{{ 'families.col_count' | t }}</th>
            <th>{{ 'families.col_summary' | t }}</th>
            <th class="actions">{{ 'families.col_actions' | t }}</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr><td colspan="5" class="fa__empty">{{ 'app.loading' | t }}</td></tr>
          } @else if (filtered().length === 0) {
            <tr><td colspan="5" class="fa__empty">{{ 'families.no_results' | t }}</td></tr>
          } @else {
            @for (f of filtered(); track f.id) {
              <tr [class.is-orphan]="f.gearCount === 0">
                <td class="name">{{ f.name }}</td>
                <td class="slug">{{ f.slug }}</td>
                <td class="num">{{ f.gearCount }}</td>
                <td class="summary">{{ f.summary || '—' }}</td>
                <td class="actions">
                  <button
                    sz-button
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="openEdit(f)"
                  >
                    {{ 'families.edit' | t }}
                  </button>
                  <button
                    sz-button
                    variant="ghost"
                    size="sm"
                    type="button"
                    [disabled]="rows().length < 2 || acting()"
                    (click)="openMerge(f)"
                  >
                    {{ 'families.merge' | t }}
                  </button>
                  <button
                    sz-button
                    variant="ghost"
                    size="sm"
                    type="button"
                    class="fa__danger"
                    [disabled]="acting()"
                    (click)="onDelete(f)"
                  >
                    {{ 'families.delete' | t }}
                  </button>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </main>

    @if (edit(); as e) {
      <div class="fa-modal" (click)="onBackdrop($event)">
        <div class="fa-modal__inner" role="dialog" aria-modal="true">
          <h3>{{ 'families.edit_title' | t }}</h3>
          <label class="fa-modal__field">
            <span>{{ 'families.col_name' | t }}</span>
            <input type="text" [(ngModel)]="e.name" />
          </label>
          <label class="fa-modal__field">
            <span>{{ 'families.col_slug' | t }}</span>
            <input type="text" [(ngModel)]="e.slug" />
          </label>
          <label class="fa-modal__field">
            <span>{{ 'families.col_summary' | t }}</span>
            <textarea rows="3" [(ngModel)]="e.summary"></textarea>
          </label>
          <div class="fa-modal__actions">
            <button sz-button variant="ghost" type="button" (click)="closeEdit()">
              {{ 'families.cancel' | t }}
            </button>
            <button
              sz-button
              variant="primary"
              type="button"
              [disabled]="acting()"
              (click)="saveEdit()"
            >
              {{ acting() ? ('families.saving' | t) : ('families.save' | t) }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (merge(); as m) {
      <div class="fa-modal" (click)="onBackdrop($event)">
        <div class="fa-modal__inner" role="dialog" aria-modal="true">
          <h3>{{ 'families.merge_title' | t }}</h3>
          <p class="fa-modal__body">
            {{ 'families.merge_from_label' | t }} <strong>{{ m.fromName }}</strong>
            ({{ m.fromGearCount }} {{ 'families.gear_pieces' | t }})
          </p>
          <label class="fa-modal__field">
            <span>{{ 'families.merge_into_label' | t }}</span>
            <select [(ngModel)]="m.intoId">
              <option value="" disabled>—</option>
              @for (other of mergeTargets(); track other.id) {
                <option [value]="other.id">
                  {{ other.name }} ({{ other.gearCount }})
                </option>
              }
            </select>
          </label>
          <p class="fa-modal__hint">{{ 'families.merge_hint' | t }}</p>
          <div class="fa-modal__actions">
            <button sz-button variant="ghost" type="button" (click)="closeMerge()">
              {{ 'families.cancel' | t }}
            </button>
            <button
              sz-button
              variant="primary"
              type="button"
              [disabled]="!m.intoId || acting()"
              (click)="confirmMerge()"
            >
              {{ acting() ? ('families.saving' | t) : ('families.merge_confirm' | t) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .fa {
        max-width: 1280px;
        margin: 0 auto;
        padding: 32px var(--gutter-x);
      }
      .fa__back {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg-muted);
        display: inline-block;
        margin-bottom: 12px;
      }
      .fa__back:hover { color: var(--accent); }
      .fa__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 48px);
        text-transform: uppercase;
        margin: 0;
        font-weight: 600;
      }
      .fa__meta {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg-muted);
        margin: 6px 0 0;
        letter-spacing: 0.06em;
      }
      .fa__filter { margin: 18px 0; }
      .fa__filter input {
        width: 100%;
        max-width: 480px;
        padding: 10px 14px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 13px;
      }
      .fa__filter input:focus { outline: none; border-color: var(--accent); }
      .fa__table {
        width: 100%;
        border-collapse: collapse;
        background: var(--bg-elev);
        border: 1px solid var(--line);
      }
      .fa__table thead th {
        background: var(--bg-elev);
        border-bottom: 1px solid var(--line);
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        text-align: left;
        padding: 12px 14px;
      }
      .fa__table thead th.num { text-align: right; }
      .fa__table thead th.actions { text-align: right; width: 280px; }
      .fa__table tbody tr {
        border-bottom: 1px solid var(--line);
        background: var(--bg-card);
      }
      .fa__table tbody tr:last-child { border-bottom: 0; }
      .fa__table tbody tr:hover { background: var(--bg-card-2, var(--bg-elev)); }
      .fa__table tbody tr.is-orphan .name { color: var(--fg-muted); font-style: italic; }
      .fa__table td { padding: 12px 14px; vertical-align: middle; }
      .fa__table td.name { font-weight: 600; }
      .fa__table td.slug { font-family: var(--font-mono); font-size: 12px; color: var(--fg-muted); }
      .fa__table td.num { text-align: right; font-variant-numeric: tabular-nums; }
      .fa__table td.summary { color: var(--fg-muted); font-size: 13px; max-width: 360px; }
      .fa__table td.actions { text-align: right; }
      .fa__table td.actions :is(button, a) { margin-left: 4px; }
      :host ::ng-deep .fa__danger button,
      :host ::ng-deep .fa__danger {
        color: oklch(0.55 0.16 28);
      }
      .fa__empty {
        padding: 48px;
        text-align: center;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
      }

      .fa-modal {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: oklch(0 0 0 / 0.55);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .fa-modal__inner {
        background: var(--bg);
        border: 1px solid var(--line);
        max-width: 520px;
        width: 100%;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .fa-modal__inner h3 {
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin: 0;
      }
      .fa-modal__inner h3::before { content: '// '; color: var(--accent); }
      .fa-modal__body { margin: 0; font-size: 13px; line-height: 1.5; }
      .fa-modal__field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        color: var(--fg-muted);
      }
      .fa-modal__field input,
      .fa-modal__field select,
      .fa-modal__field textarea {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: inherit;
        font-size: 13px;
      }
      .fa-modal__field textarea {
        resize: vertical;
        min-height: 64px;
      }
      .fa-modal__hint {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        line-height: 1.5;
        margin: 0;
      }
      .fa-modal__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 6px;
      }
    `,
  ],
})
export class FamiliesAdminPage {
  readonly i18n = inject(I18nService);
  private readonly tezaur = inject(TezaurAdminService);

  readonly rows = signal<GearFamilyAdminRow[]>([]);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly edit = signal<EditFamilyState | null>(null);
  readonly merge = signal<MergeFamilyState | null>(null);
  filterText = '';
  readonly filterSignal = signal('');

  readonly orphanCount = computed(
    () => this.rows().filter((r) => r.gearCount === 0).length,
  );

  readonly filtered = computed(() => {
    const q = this.filterSignal().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.summary ?? '').toLowerCase().includes(q),
    );
  });

  readonly mergeTargets = computed(() => {
    const m = this.merge();
    if (!m) return [];
    return this.rows().filter((r) => r.id !== m.fromId);
  });

  constructor() {
    void this.refresh();
  }

  onFilterChange(): void {
    this.filterSignal.set(this.filterText);
  }

  openEdit(f: GearFamilyAdminRow): void {
    this.edit.set({
      id: f.id,
      name: f.name,
      slug: f.slug,
      summary: f.summary ?? '',
    });
  }

  closeEdit(): void {
    this.edit.set(null);
  }

  openMerge(f: GearFamilyAdminRow): void {
    this.merge.set({
      fromId: f.id,
      fromName: f.name,
      fromGearCount: f.gearCount,
      intoId: '',
    });
  }

  closeMerge(): void {
    this.merge.set(null);
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.edit.set(null);
      this.merge.set(null);
    }
  }

  async saveEdit(): Promise<void> {
    const e = this.edit();
    if (!e || this.acting()) return;
    this.acting.set(true);
    try {
      await this.tezaur.updateFamily(e.id, {
        name: e.name.trim(),
        slug: e.slug.trim(),
        summary: e.summary.trim(),
      });
      await this.refresh();
      this.edit.set(null);
    } catch (err) {
      console.error('[families-admin] edit failed', err);
      alert(this.i18n.t('families.error_generic'));
    } finally {
      this.acting.set(false);
    }
  }

  async confirmMerge(): Promise<void> {
    const m = this.merge();
    if (!m || !m.intoId || this.acting()) return;
    const target = this.rows().find((r) => r.id === m.intoId);
    if (!target) return;
    const ok = confirm(
      this.i18n.t('families.merge_confirm_prompt', {
        from: m.fromName,
        into: target.name,
        count: String(m.fromGearCount),
      }),
    );
    if (!ok) return;
    this.acting.set(true);
    try {
      await this.tezaur.mergeFamily(m.fromId, m.intoId);
      await this.refresh();
      this.merge.set(null);
    } catch (err) {
      console.error('[families-admin] merge failed', err);
      alert(this.i18n.t('families.error_generic'));
    } finally {
      this.acting.set(false);
    }
  }

  async onDelete(f: GearFamilyAdminRow): Promise<void> {
    if (this.acting()) return;
    const ok = confirm(
      this.i18n.t(
        f.gearCount > 0 ? 'families.delete_confirm_with_gear' : 'families.delete_confirm_empty',
        { name: f.name, count: String(f.gearCount) },
      ),
    );
    if (!ok) return;
    this.acting.set(true);
    try {
      await this.tezaur.deleteFamily(f.id);
      this.rows.update((rs) => rs.filter((r) => r.id !== f.id));
    } catch (err) {
      console.error('[families-admin] delete failed', err);
      alert(this.i18n.t('families.error_generic'));
    } finally {
      this.acting.set(false);
    }
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.tezaur.listFamiliesAdmin();
      this.rows.set(rows);
    } catch (err) {
      console.error('[families-admin] load failed', err);
    } finally {
      this.loading.set(false);
    }
  }
}
