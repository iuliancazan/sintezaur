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
import { TezaurAdminService } from './tezaur-admin.service';
import type { TezaurListItem } from './tezaur.types';

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

      <div class="admin__filter">
        <input
          pInputText
          type="search"
          [placeholder]="i18n.t('tezaur.admin.filter_placeholder')"
          [(ngModel)]="filterText"
          (input)="onFilterInput()"
        />
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
            <th>{{ 'tezaur.admin.table.owners' | t }}</th>
            <th>{{ 'tezaur.admin.table.actions' | t }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ $any(row).brand }}</td>
            <td>{{ $any(row).model }}</td>
            <td>{{ humanize($any(row).category) }}</td>
            <td>{{ $any(row).yearReleased ?? '—' }}</td>
            <td>{{ $any(row).ownersPublicCount }}</td>
            <td>
              <div class="admin__row-actions">
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
                  [disabled]="deletingId() === $any(row).id"
                  (click)="onDelete($any(row))"
                >
                  {{
                    deletingId() === $any(row).id
                      ? ('tezaur.admin.actions.deleting' | t)
                      : ('tezaur.admin.actions.delete' | t)
                  }}
                </button>
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
      .admin__filter {
        margin-bottom: 16px;
      }
      .admin__filter input {
        width: 100%;
        max-width: 480px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        padding: 10px 14px;
        font-family: var(--font-mono);
        font-size: 13px;
      }
      .admin__filter input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .admin__table {
        background: var(--bg-elev);
      }
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
      :host ::ng-deep .admin__table .p-datatable-tbody > tr > td {
        background: var(--bg-card);
        color: var(--fg);
        border-bottom: 1px solid var(--line);
        font-size: 13px;
        padding: 12px;
      }
      :host ::ng-deep .admin__table .p-datatable-tbody > tr:hover > td {
        background: var(--bg-card-2);
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
      }
      :host ::ng-deep .admin__row-action--danger button,
      :host ::ng-deep .admin__row-action--danger {
        color: oklch(0.55 0.16 28);
      }
      :host ::ng-deep .admin__row-action--danger:hover {
        color: oklch(0.45 0.18 28);
      }
    `,
  ],
})
export class TezaurAdminListPage {
  readonly i18n = inject(I18nService);
  private readonly tezaur = inject(TezaurAdminService);

  readonly items = signal<TezaurListItem[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly deletingId = signal<string | null>(null);
  pageSize = 24;
  filterText = '';

  private debounce: ReturnType<typeof setTimeout> | null = null;

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

  humanize(s: string): string {
    return s
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  async onDelete(row: TezaurListItem): Promise<void> {
    if (this.deletingId() !== null) return;
    const title = this.i18n.t('tezaur.admin.delete.confirm_title', {
      brand: row.brand,
      model: row.model,
    });
    const body = this.i18n.t('tezaur.admin.delete.confirm_body');
    if (!confirm(title + '\n\n' + body)) return;
    this.deletingId.set(row.id);
    try {
      await this.tezaur.softDelete(row.id);
      // Optimistic: drop the row locally so the user sees it gone immediately.
      this.items.update((rows) => rows.filter((r) => r.id !== row.id));
      this.totalCount.update((n) => Math.max(0, n - 1));
    } catch (err) {
      console.error('[tezaur-admin-list] delete failed', err);
      alert(this.i18n.t('tezaur.admin.delete.error'));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.tezaur.list({
        q: this.filterText || undefined,
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
