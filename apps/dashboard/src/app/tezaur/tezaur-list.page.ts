import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { SzButtonComponent } from '@sintezaur/ui';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import {
  TezaurAdminService,
  type AdminGearRow,
} from './tezaur-admin.service';

type StateFilter = '' | 'draft' | 'submitted' | 'approved' | 'rejected';
type DeletedFilter = 'live' | 'all' | 'only_deleted';

const STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'În moderare',
  approved: 'Publicat',
  rejected: 'Respins',
};

@Component({
  selector: 'app-tezaur-admin-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    TableModule,
    InputTextModule,
    ButtonModule,
    SzButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <div>
          <h1>{{ 'tezaur.admin.list_title' | t }}</h1>
          @if (totalCount(); as total) {
            <p class="admin__meta">{{ total }} {{ 'tezaur.stats.pieces' | t }}</p>
          }
        </div>
        <a sz-button variant="primary" routerLink="/tezaur/new">
          + {{ 'tezaur.admin.new_gear' | t }}
        </a>
      </header>

      <div class="admin__toolbar">
        <input
          pInputText
          type="search"
          [placeholder]="i18n.t('tezaur.admin.filter_placeholder')"
          [(ngModel)]="filterText"
          (input)="onFilterInput()"
        />
        <label class="admin__select">
          <span>{{ 'tezaur.admin.filter_state' | t }}</span>
          <select [(ngModel)]="stateFilter" (change)="onParamsChange()">
            <option value="">{{ 'tezaur.admin.state_all' | t }}</option>
            <option value="draft">{{ 'tezaur.admin.state_draft' | t }}</option>
            <option value="submitted">{{ 'tezaur.admin.state_submitted' | t }}</option>
            <option value="approved">{{ 'tezaur.admin.state_approved' | t }}</option>
            <option value="rejected">{{ 'tezaur.admin.state_rejected' | t }}</option>
          </select>
        </label>
        <label class="admin__select">
          <span>{{ 'tezaur.admin.filter_visibility' | t }}</span>
          <select [(ngModel)]="deletedFilter" (change)="onParamsChange()">
            <option value="live">{{ 'tezaur.admin.visibility_live' | t }}</option>
            <option value="all">{{ 'tezaur.admin.visibility_all' | t }}</option>
            <option value="only_deleted">{{ 'tezaur.admin.visibility_deleted' | t }}</option>
          </select>
        </label>
      </div>

      <p-table
        [value]="items()"
        [loading]="loading()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageSize"
        [totalRecords]="totalCount()"
        [first]="(page() - 1) * pageSize"
        (onLazyLoad)="onLazy($event)"
        [rowsPerPageOptions]="[24, 48, 96]"
        styleClass="admin__table"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>{{ 'tezaur.admin.table.brand' | t }}</th>
            <th>{{ 'tezaur.admin.table.model' | t }}</th>
            <th>{{ 'tezaur.admin.table.category' | t }}</th>
            <th>{{ 'tezaur.admin.table.year' | t }}</th>
            <th>{{ 'tezaur.admin.table.state' | t }}</th>
            <th class="actions-col">{{ 'tezaur.admin.table.actions' | t }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [class.is-deleted]="$any(row).deletedAt">
            <td>{{ $any(row).brand }}</td>
            <td>
              {{ $any(row).model }}
              @if ($any(row).deletedAt) {
                <span class="badge badge--deleted">ȘTERS</span>
              }
            </td>
            <td>{{ humanize($any(row).category) }}</td>
            <td>{{ $any(row).yearReleased ?? '—' }}</td>
            <td>
              <span class="state-pill state-pill--{{ $any(row).state }}">
                {{ stateLabel($any(row).state) }}
              </span>
            </td>
            <td>
              <div class="admin__row-actions">
                @if ($any(row).deletedAt) {
                  <button
                    sz-button
                    variant="ghost"
                    size="sm"
                    type="button"
                    [disabled]="actingId() === $any(row).id"
                    (click)="onRestore($any(row))"
                  >
                    {{
                      actingId() === $any(row).id
                        ? ('tezaur.admin.actions.restoring' | t)
                        : ('tezaur.admin.actions.restore' | t)
                    }}
                  </button>
                } @else {
                  <a
                    sz-button
                    variant="ghost"
                    size="sm"
                    [routerLink]="['/tezaur', $any(row).id, 'edit']"
                  >
                    {{ 'tezaur.admin.actions.edit' | t }}
                  </a>
                  <button
                    sz-button
                    variant="ghost"
                    size="sm"
                    class="admin__row-action--danger"
                    type="button"
                    [disabled]="actingId() === $any(row).id"
                    (click)="onDelete($any(row))"
                  >
                    {{
                      actingId() === $any(row).id
                        ? ('tezaur.admin.actions.deleting' | t)
                        : ('tezaur.admin.actions.delete' | t)
                    }}
                  </button>
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="admin__empty">
              {{ 'tezaur.filters.no_results' | t }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </main>
  `,
  styles: [
    `
      :host { display: block; }

      .admin {
        max-width: 1280px;
        margin: 0 auto;
        padding: 32px var(--gutter-x);
      }
      .admin__head {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 24px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      .admin__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 48px);
        text-transform: uppercase;
        margin: 0;
        font-weight: 600;
      }
      .admin__meta {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg-muted);
        margin: 4px 0 0;
        letter-spacing: 0.08em;
      }
      .admin__toolbar {
        display: grid;
        grid-template-columns: 1fr 200px 200px;
        gap: 12px;
        margin-bottom: 16px;
        align-items: end;
      }
      @media (max-width: 800px) {
        .admin__toolbar { grid-template-columns: 1fr; }
      }
      .admin__toolbar input {
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        padding: 10px 14px;
        font-family: var(--font-mono);
        font-size: 13px;
        width: 100%;
      }
      .admin__toolbar input:focus { outline: none; border-color: var(--accent); }
      .admin__select {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .admin__select select {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .admin__select select:focus { outline: none; border-color: var(--accent); }

      :host ::ng-deep .admin__table .p-datatable-thead > tr > th {
        background: var(--bg-elev);
        color: var(--fg);
        border-bottom: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 12px;
      }
      :host ::ng-deep .admin__table .p-datatable-thead > tr > th.actions-col {
        text-align: right;
        width: 260px;
      }
      :host ::ng-deep .admin__table .p-datatable-tbody > tr > td {
        background: var(--bg-card);
        color: var(--fg);
        border-bottom: 1px solid var(--line);
        font-size: 13px;
        padding: 12px;
      }
      :host ::ng-deep .admin__table .p-datatable-tbody > tr:hover > td {
        background: var(--bg-card-2, var(--bg-elev));
      }
      :host ::ng-deep .admin__table .p-datatable-tbody > tr.is-deleted > td {
        opacity: 0.55;
        font-style: italic;
      }
      .admin__empty {
        padding: 48px;
        text-align: center;
        color: var(--fg-muted);
      }
      .admin__row-actions {
        display: inline-flex;
        gap: 6px;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
      }
      :host ::ng-deep .admin__row-action--danger {
        color: oklch(0.55 0.16 28);
      }
      :host ::ng-deep .admin__row-action--danger:hover {
        color: oklch(0.45 0.18 28);
      }

      .badge {
        display: inline-block;
        margin-left: 8px;
        padding: 1px 6px;
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.08em;
        border: 1px solid var(--line);
        background: var(--bg);
        color: var(--fg-muted);
      }
      .badge--deleted {
        background: oklch(0.92 0.04 28);
        color: oklch(0.45 0.18 28);
        border-color: oklch(0.78 0.10 28);
      }

      .state-pill {
        display: inline-block;
        padding: 2px 8px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        border: 1px solid var(--line);
        background: var(--bg);
        color: var(--fg-muted);
      }
      .state-pill--approved {
        color: oklch(0.55 0.16 145);
        border-color: oklch(0.55 0.12 145);
      }
      .state-pill--submitted {
        color: oklch(0.55 0.14 80);
        border-color: oklch(0.55 0.14 80);
      }
      .state-pill--draft { color: var(--fg-muted); }
      .state-pill--rejected {
        color: oklch(0.55 0.16 60);
        border-color: oklch(0.55 0.14 60);
      }
    `,
  ],
})
export class TezaurAdminListPage {
  readonly i18n = inject(I18nService);
  private readonly tezaur = inject(TezaurAdminService);

  readonly items = signal<AdminGearRow[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly actingId = signal<string | null>(null);
  pageSize = 24;
  filterText = '';
  stateFilter: StateFilter = '';
  deletedFilter: DeletedFilter = 'live';

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.fetch();
  }

  onLazy(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    this.pageSize = rows;
    this.page.set(Math.floor((event.first ?? 0) / rows) + 1);
    void this.fetch();
  }

  onFilterInput(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      void this.fetch();
    }, 300);
  }

  onParamsChange(): void {
    this.page.set(1);
    void this.fetch();
  }

  humanize(s: string): string {
    return s
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  stateLabel(state: string): string {
    return STATE_LABELS[state] ?? state;
  }

  async onDelete(row: AdminGearRow): Promise<void> {
    if (this.actingId() !== null) return;
    const title = this.i18n.t('tezaur.admin.delete.confirm_title', {
      brand: row.brand,
      model: row.model,
    });
    const body = this.i18n.t('tezaur.admin.delete.confirm_body');
    if (!confirm(title + '\n\n' + body)) return;
    this.actingId.set(row.id);
    try {
      await this.tezaur.softDelete(row.id);
      if (this.deletedFilter === 'live') {
        this.items.update((rows) => rows.filter((r) => r.id !== row.id));
        this.totalCount.update((n) => Math.max(0, n - 1));
      } else {
        await this.fetch();
      }
    } catch (err) {
      console.error('[tezaur-admin-list] delete failed', err);
      alert(this.i18n.t('tezaur.admin.delete.error'));
    } finally {
      this.actingId.set(null);
    }
  }

  async onRestore(row: AdminGearRow): Promise<void> {
    if (this.actingId() !== null) return;
    const ok = confirm(
      this.i18n.t('tezaur.admin.restore.confirm', {
        brand: row.brand,
        model: row.model,
      }),
    );
    if (!ok) return;
    this.actingId.set(row.id);
    try {
      await this.tezaur.restore(row.id);
      await this.fetch();
    } catch (err) {
      console.error('[tezaur-admin-list] restore failed', err);
      alert(this.i18n.t('tezaur.admin.restore.error'));
    } finally {
      this.actingId.set(null);
    }
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.tezaur.listAdmin({
        q: this.filterText || undefined,
        state: this.stateFilter || undefined,
        includeDeleted: this.deletedFilter === 'all',
        onlyDeleted: this.deletedFilter === 'only_deleted',
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } catch (err) {
      console.error('[tezaur-admin-list] fetch failed', err);
    } finally {
      this.loading.set(false);
    }
  }
}
