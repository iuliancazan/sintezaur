import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  AdminClosureService,
  type AuditLogRow,
} from './admin-closure.service';

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Toate' },
  { value: 'hide_post', label: 'Forum: hide post' },
  { value: 'lock_thread', label: 'Forum: lock thread' },
  { value: 'delete_thread', label: 'Forum: delete thread' },
  { value: 'pin_thread', label: 'Forum: pin thread' },
  { value: 'unpin_thread', label: 'Forum: unpin thread' },
  { value: 'first_post_approve', label: 'Forum: approve first post' },
  { value: 'first_post_reject', label: 'Forum: reject first post' },
  { value: 'resolve_content_report', label: 'Resolve content report' },
  { value: 'remove_listing', label: 'Bazar: remove listing' },
  { value: 'ban_user', label: 'Ban user' },
  { value: 'unban_user', label: 'Unban user' },
  { value: 'promote_user', label: 'Promote user' },
  { value: 'demote_user', label: 'Demote user' },
  { value: 'soft_delete_gear', label: 'Tezaur: soft delete' },
  { value: 'restore_gear', label: 'Tezaur: restore' },
  { value: 'create_gear', label: 'Tezaur: create gear' },
  { value: 'edit_gear', label: 'Tezaur: edit gear' },
  { value: 'set_canonical_thread', label: 'Tezaur: set canonical thread' },
  { value: 'update_currency_rate', label: 'Currency rate update' },
];

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Audit log</h1>
        <p class="admin__meta">
          Acțiuni privilegiate (mod / admin / superadmin) — append-only,
          retenție per spec §7.10. Filtrează pe acțiune, target_type sau
          interval de timp.
        </p>

        <div class="filters">
          <label>
            <span>Acțiune</span>
            <select [ngModel]="action()" (ngModelChange)="setAction($event)">
              @for (o of actionOptions; track o.value) {
                <option [value]="o.value">{{ o.label }}</option>
              }
            </select>
          </label>
          <label>
            <span>Target type</span>
            <input
              type="text"
              [ngModel]="targetType()"
              (ngModelChange)="targetType.set($event)"
              (change)="refresh()"
              placeholder="ex. forum_post"
            />
          </label>
          <label>
            <span>De la</span>
            <input
              type="date"
              [ngModel]="from()"
              (ngModelChange)="from.set($event)"
              (change)="refresh()"
            />
          </label>
          <label>
            <span>Până la</span>
            <input
              type="date"
              [ngModel]="to()"
              (ngModelChange)="to.set($event)"
              (change)="refresh()"
            />
          </label>
        </div>
      </header>

      <p-table
        [value]="items()"
        [loading]="loading()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageSize"
        [totalRecords]="totalCount()"
        [first]="(page() - 1) * pageSize"
        (onLazyLoad)="onLazy($any($event))"
        [rowsPerPageOptions]="[50, 100, 200]"
        responsiveLayout="scroll"
        stripedRows
        [expandedRowKeys]="expanded()"
        dataKey="id"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 36px;"></th>
            <th style="width: 180px;">Acțiune</th>
            <th style="width: 140px;">Actor</th>
            <th style="width: 130px;">Target type</th>
            <th>Target id</th>
            <th style="width: 170px;">Când</th>
            <th style="width: 120px;">IP</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row let-expanded="expanded">
          <tr>
            <td>
              <button
                type="button"
                class="expand-btn"
                (click)="toggle(row)"
              >
                {{ expanded ? '▼' : '▶' }}
              </button>
            </td>
            <td><code>{{ row.action }}</code></td>
            <td>
              @if (row.actorUsername) {
                &#64;{{ row.actorUsername }}
              } @else {
                <span class="muted">[sistem]</span>
              }
            </td>
            <td><code>{{ row.targetType ?? '—' }}</code></td>
            <td class="mono">{{ row.targetId ?? '—' }}</td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="mono">{{ row.ipAddress ?? '—' }}</td>
          </tr>
          @if (expanded) {
            <tr>
              <td colspan="7" class="expand">
                <pre>{{ formatDetails(row.details) }}</pre>
              </td>
            </tr>
          }
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">Niciun audit log pentru filtrele curente.</td></tr>
        </ng-template>
      </p-table>
    </main>
  `,
  styles: [
    `
      .admin { padding: 24px 32px; max-width: 1280px; margin: 0 auto; }
      .admin__head h1 { margin: 4px 0 6px; }
      .admin__back { font-size: 12px; color: var(--p-text-muted-color); text-decoration: none; }
      .admin__meta { font-size: 13px; color: var(--p-text-muted-color); margin: 0 0 16px; }
      .filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .filters label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11px;
        color: var(--p-text-muted-color);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .filters select,
      .filters input {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        color: var(--p-text-color);
        padding: 6px 8px;
        font-size: 13px;
      }
      .expand-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--p-text-color);
      }
      code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; }
      .mono { font-family: var(--font-mono, ui-monospace, monospace); font-size: 11px; color: var(--p-text-muted-color); }
      .muted { color: var(--p-text-muted-color); font-size: 12px; }
      .expand { background: var(--p-content-background); padding: 14px 22px; }
      pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 12px;
        color: var(--p-text-color);
      }
    `,
  ],
})
export class AuditLogPage {
  private readonly service = inject(AdminClosureService);

  readonly actionOptions = ACTION_OPTIONS;
  readonly pageSize = 50;

  readonly items = signal<AuditLogRow[]>([]);
  readonly loading = signal(true);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly action = signal('');
  readonly targetType = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly expanded = signal<Record<string, boolean>>({});

  constructor() {
    this.refresh();
  }

  setAction(value: string): void {
    this.action.set(value);
    this.page.set(1);
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.service.listAudit({
        action: this.action() || undefined,
        targetType: this.targetType() || undefined,
        from: this.from() ? new Date(this.from()).toISOString() : undefined,
        to: this.to()
          ? new Date(this.to() + 'T23:59:59').toISOString()
          : undefined,
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } finally {
      this.loading.set(false);
    }
  }

  onLazy(event: { first: number; rows: number }): void {
    const nextPage = Math.floor(event.first / event.rows) + 1;
    if (nextPage !== this.page()) {
      this.page.set(nextPage);
      this.refresh();
    }
  }

  toggle(row: AuditLogRow): void {
    const cur = { ...this.expanded() };
    if (cur[row.id]) delete cur[row.id];
    else cur[row.id] = true;
    this.expanded.set(cur);
  }

  formatDate(s: string): string {
    try {
      return new Date(s).toLocaleString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return s;
    }
  }

  formatDetails(d: Record<string, unknown>): string {
    if (!d || Object.keys(d).length === 0) return '(empty)';
    try {
      return JSON.stringify(d, null, 2);
    } catch {
      return String(d);
    }
  }
}
