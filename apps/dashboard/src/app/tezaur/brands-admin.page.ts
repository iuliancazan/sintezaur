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
  type BrandAdminRow,
} from './tezaur-admin.service';

interface RenameState {
  from: string;
  fromCount: number;
  to: string;
  caseInsensitive: boolean;
}

/**
 * M15-B — Branduri Tezaur (admin management page).
 *
 * Listă cu toate brandurile distincte din gear (non-deleted), count piese
 * per brand. Acțiunea principală: rename / merge — UPDATE gear SET brand=to
 * WHERE brand=from (case-sensitive default; opțional case-insensitive ca
 * să colapsezi KORG / Korg / korg într-o singură valoare canonică).
 */
@Component({
  selector: 'app-brands-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TPipe, SzButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="ba">
      <header class="ba__head">
        <div>
          <a routerLink="/tezaur" class="ba__back">
            ← {{ 'brands.back_to_tezaur' | t }}
          </a>
          <h1>{{ 'brands.title' | t }}</h1>
          <p class="ba__meta">
            {{ rows().length }} {{ 'brands.total_suffix' | t }}
            @if (caseDuplicates() > 0) {
              · {{ caseDuplicates() }} {{ 'brands.case_duplicates' | t }}
            }
          </p>
        </div>
      </header>

      <div class="ba__filter">
        <input
          type="search"
          [placeholder]="i18n.t('brands.filter_placeholder')"
          [(ngModel)]="filterText"
          (input)="onFilterChange()"
        />
      </div>

      <table class="ba__table">
        <thead>
          <tr>
            <th>{{ 'brands.col_name' | t }}</th>
            <th class="num">{{ 'brands.col_count' | t }}</th>
            <th>{{ 'brands.col_case_variants' | t }}</th>
            <th class="actions">{{ 'brands.col_actions' | t }}</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr><td colspan="4" class="ba__empty">{{ 'app.loading' | t }}</td></tr>
          } @else if (filtered().length === 0) {
            <tr><td colspan="4" class="ba__empty">{{ 'brands.no_results' | t }}</td></tr>
          } @else {
            @for (b of filtered(); track b.name) {
              <tr [class.is-duplicate]="duplicateGroups().get(b.name.toLowerCase()) ?? 0 > 1">
                <td class="name">{{ b.name }}</td>
                <td class="num">{{ b.count }}</td>
                <td class="variants">
                  @if ((duplicateGroups().get(b.name.toLowerCase()) ?? 0) > 1) {
                    <span class="ba__warn">
                      {{ duplicateGroups().get(b.name.toLowerCase()) }}
                      {{ 'brands.variants_suffix' | t }}
                    </span>
                  } @else {
                    —
                  }
                </td>
                <td class="actions">
                  <button
                    sz-button
                    variant="ghost"
                    size="sm"
                    type="button"
                    [disabled]="acting()"
                    (click)="openRename(b, false)"
                  >
                    {{ 'brands.rename' | t }}
                  </button>
                  @if ((duplicateGroups().get(b.name.toLowerCase()) ?? 0) > 1) {
                    <button
                      sz-button
                      variant="ghost"
                      size="sm"
                      type="button"
                      [disabled]="acting()"
                      (click)="openRename(b, true)"
                    >
                      {{ 'brands.consolidate' | t }}
                    </button>
                  }
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </main>

    @if (rename(); as r) {
      <div class="ba-modal" (click)="onBackdrop($event)">
        <div class="ba-modal__inner" role="dialog" aria-modal="true">
          <h3>
            {{ r.caseInsensitive ? ('brands.consolidate_title' | t) : ('brands.rename_title' | t) }}
          </h3>
          <p class="ba-modal__body">
            @if (r.caseInsensitive) {
              {{ 'brands.consolidate_body' | t: { from: r.from, count: r.fromCount.toString() } }}
            } @else {
              {{ 'brands.rename_body' | t: { from: r.from, count: r.fromCount.toString() } }}
            }
          </p>
          <label class="ba-modal__field">
            <span>{{ 'brands.target_label' | t }}</span>
            <input type="text" [(ngModel)]="r.to" placeholder="e.g. Korg" />
          </label>
          <p class="ba-modal__hint">
            @if (r.caseInsensitive) {
              {{ 'brands.consolidate_hint' | t }}
            } @else {
              {{ 'brands.rename_hint' | t }}
            }
          </p>
          <div class="ba-modal__actions">
            <button sz-button variant="ghost" type="button" (click)="closeRename()">
              {{ 'brands.cancel' | t }}
            </button>
            <button
              sz-button
              variant="primary"
              type="button"
              [disabled]="!r.to.trim() || r.to.trim() === r.from || acting()"
              (click)="confirmRename()"
            >
              {{ acting() ? ('brands.saving' | t) : ('brands.apply' | t) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .ba {
        max-width: 1280px;
        margin: 0 auto;
        padding: 32px var(--gutter-x);
      }
      .ba__back {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg-muted);
        display: inline-block;
        margin-bottom: 12px;
      }
      .ba__back:hover { color: var(--accent); }
      .ba__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 48px);
        text-transform: uppercase;
        margin: 0;
        font-weight: 600;
      }
      .ba__meta {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg-muted);
        margin: 6px 0 0;
        letter-spacing: 0.06em;
      }
      .ba__filter { margin: 18px 0; }
      .ba__filter input {
        width: 100%;
        max-width: 480px;
        padding: 10px 14px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 13px;
      }
      .ba__filter input:focus { outline: none; border-color: var(--accent); }
      .ba__table {
        width: 100%;
        border-collapse: collapse;
        background: var(--bg-elev);
        border: 1px solid var(--line);
      }
      .ba__table thead th {
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
      .ba__table thead th.num { text-align: right; }
      .ba__table thead th.actions { text-align: right; width: 280px; }
      .ba__table tbody tr {
        border-bottom: 1px solid var(--line);
        background: var(--bg-card);
      }
      .ba__table tbody tr:last-child { border-bottom: 0; }
      .ba__table tbody tr:hover { background: var(--bg-card-2, var(--bg-elev)); }
      .ba__table tbody tr.is-duplicate .name {
        color: oklch(0.55 0.14 60);
        font-weight: 700;
      }
      .ba__table td { padding: 12px 14px; vertical-align: middle; }
      .ba__table td.name { font-weight: 600; }
      .ba__table td.num { text-align: right; font-variant-numeric: tabular-nums; }
      .ba__table td.actions { text-align: right; }
      .ba__table td.actions :is(button, a) { margin-left: 4px; }
      .ba__warn {
        display: inline-block;
        padding: 2px 8px;
        background: oklch(0.92 0.06 60);
        color: oklch(0.45 0.16 60);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        border: 1px solid oklch(0.78 0.10 60);
      }
      [data-theme='dark'] .ba__warn {
        background: oklch(0.30 0.10 60 / 0.20);
        color: oklch(0.82 0.14 60);
      }
      .ba__empty {
        padding: 48px;
        text-align: center;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
      }

      .ba-modal {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: oklch(0 0 0 / 0.55);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .ba-modal__inner {
        background: var(--bg);
        border: 1px solid var(--line);
        max-width: 520px;
        width: 100%;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .ba-modal__inner h3 {
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin: 0;
      }
      .ba-modal__inner h3::before { content: '// '; color: var(--accent); }
      .ba-modal__body { margin: 0; font-size: 13px; line-height: 1.5; }
      .ba-modal__field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        color: var(--fg-muted);
      }
      .ba-modal__field input {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: inherit;
        font-size: 13px;
      }
      .ba-modal__hint {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        line-height: 1.5;
        margin: 0;
      }
      .ba-modal__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 6px;
      }
    `,
  ],
})
export class BrandsAdminPage {
  readonly i18n = inject(I18nService);
  private readonly tezaur = inject(TezaurAdminService);

  readonly rows = signal<BrandAdminRow[]>([]);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly rename = signal<RenameState | null>(null);
  filterText = '';
  readonly filterSignal = signal('');

  /** Map of lowercased brand → number of distinct cased variants. */
  readonly duplicateGroups = computed(() => {
    const groups = new Map<string, number>();
    for (const r of this.rows()) {
      const key = r.name.toLowerCase();
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    return groups;
  });

  readonly caseDuplicates = computed(() => {
    let total = 0;
    for (const count of this.duplicateGroups().values()) {
      if (count > 1) total += count;
    }
    return total;
  });

  readonly filtered = computed(() => {
    const q = this.filterSignal().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) => r.name.toLowerCase().includes(q));
  });

  constructor() {
    void this.refresh();
  }

  onFilterChange(): void {
    this.filterSignal.set(this.filterText);
  }

  openRename(b: BrandAdminRow, caseInsensitive: boolean): void {
    // Suggest the most-used cased variant in the duplicate group as `to`.
    let suggested = b.name;
    if (caseInsensitive) {
      const key = b.name.toLowerCase();
      const variants = this.rows().filter(
        (r) => r.name.toLowerCase() === key,
      );
      suggested = variants.reduce(
        (best, cur) => (cur.count > best.count ? cur : best),
        variants[0],
      ).name;
    }
    this.rename.set({
      from: b.name,
      fromCount: b.count,
      to: suggested,
      caseInsensitive,
    });
  }

  closeRename(): void {
    this.rename.set(null);
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.rename.set(null);
    }
  }

  async confirmRename(): Promise<void> {
    const r = this.rename();
    if (!r || this.acting()) return;
    const to = r.to.trim();
    if (!to || to === r.from) return;
    const ok = confirm(
      this.i18n.t(
        r.caseInsensitive
          ? 'brands.consolidate_confirm_prompt'
          : 'brands.rename_confirm_prompt',
        { from: r.from, to, count: r.fromCount.toString() },
      ),
    );
    if (!ok) return;
    this.acting.set(true);
    try {
      const res = await this.tezaur.renameBrand({
        from: r.from,
        to,
        caseInsensitive: r.caseInsensitive,
      });
      alert(this.i18n.t('brands.moved_alert', { count: res.moved.toString() }));
      await this.refresh();
      this.rename.set(null);
    } catch (err) {
      console.error('[brands-admin] rename failed', err);
      alert(this.i18n.t('brands.error_generic'));
    } finally {
      this.acting.set(false);
    }
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.tezaur.listBrandsAdmin();
      this.rows.set(rows);
    } catch (err) {
      console.error('[brands-admin] load failed', err);
    } finally {
      this.loading.set(false);
    }
  }
}
