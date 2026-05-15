import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  ContactCategory,
  ContactStatus,
  LegalAdminService,
  type ContactMessageRow,
} from './legal-admin.service';

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  cumparator: 'Cumpărător',
  vanzator: 'Vânzător',
  editor: 'Editor',
  juridic: 'Juridic / GDPR',
  altele: 'Altele',
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  new: 'Nou',
  read: 'Citit',
  archived: 'Arhivat',
};

const STATUS_FILTERS: Array<{ value: ContactStatus | 'all'; label: string }> = [
  { value: 'new', label: 'Noi' },
  { value: 'read', label: 'Citite' },
  { value: 'archived', label: 'Arhivate' },
  { value: 'all', label: 'Toate' },
];

@Component({
  selector: 'app-contact-messages-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Mesaje contact</h1>
        <p class="admin__meta">
          Coadă pentru formularul public <code>/contact</code>. Mesajele
          noi se marchează automat „citit" când deschizi rândul. Email
          notification se trimite și la <code>CONTACT_OPERATOR_EMAIL</code>.
        </p>

        <nav class="filters">
          @for (f of statusFilters; track f.value) {
            <button
              class="filter"
              [class.is-active]="statusFilter() === f.value"
              type="button"
              (click)="setStatus(f.value)"
            >
              {{ f.label }}
            </button>
          }
        </nav>
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
        [rowsPerPageOptions]="[25, 50]"
        responsiveLayout="scroll"
        stripedRows
        [expandedRowKeys]="expanded()"
        dataKey="id"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 36px;"></th>
            <th style="width: 130px;">Status</th>
            <th style="width: 130px;">Categorie</th>
            <th>De la</th>
            <th>Subiect</th>
            <th style="width: 140px;">Primit</th>
            <th style="width: 220px;">Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row let-expanded="expanded">
          <tr>
            <td>
              <button
                pButton
                type="button"
                size="small"
                severity="secondary"
                [text]="true"
                [label]="expanded ? '▼' : '▶'"
                (click)="toggleExpand(row)"
              ></button>
            </td>
            <td>
              <p-tag
                [value]="statusLabel(row.status)"
                [severity]="statusSeverity(row.status)"
              />
            </td>
            <td>{{ categoryLabel(row.category) }}</td>
            <td>
              <strong>{{ row.name }}</strong>
              <div class="muted">{{ row.email }}</div>
            </td>
            <td>{{ row.subject }}</td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="actions">
              @if (row.status === 'new') {
                <button
                  pButton
                  type="button"
                  size="small"
                  label="Marchează citit"
                  (click)="mark(row, 'read')"
                  [disabled]="busy().has(row.id)"
                ></button>
              }
              @if (row.status !== 'archived') {
                <button
                  pButton
                  type="button"
                  size="small"
                  severity="secondary"
                  label="Arhivează"
                  (click)="mark(row, 'archived')"
                  [disabled]="busy().has(row.id)"
                ></button>
              }
            </td>
          </tr>
          @if (expanded) {
            <tr>
              <td colspan="7" class="expand">
                <pre class="body">{{ row.body }}</pre>
                <div class="meta">
                  <span>IP: <code>{{ row.ipAddress ?? '—' }}</code></span>
                  <span>UA: <code>{{ row.userAgent ?? '—' }}</code></span>
                  @if (row.readAt) {
                    <span>Citit: {{ formatDate(row.readAt) }}</span>
                  }
                </div>
                <p class="reply-hint">
                  Răspunde direct la <a [href]="'mailto:' + row.email">{{ row.email }}</a>.
                </p>
              </td>
            </tr>
          }
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7">Niciun mesaj pentru filtrul curent.</td>
          </tr>
        </ng-template>
      </p-table>
    </main>
  `,
  styles: [
    `
      .admin { padding: 24px 32px; max-width: 1280px; margin: 0 auto; }
      .admin__head h1 { margin: 4px 0 6px; }
      .admin__back {
        font-size: 12px;
        color: var(--p-text-muted-color);
        text-decoration: none;
      }
      .admin__meta {
        font-size: 13px;
        color: var(--p-text-muted-color);
        margin: 0 0 16px;
      }
      .admin__meta code {
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 12px;
      }
      .filters { display: flex; gap: 8px; margin-bottom: 16px; }
      .filter {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        color: var(--p-text-color);
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
      }
      .filter.is-active {
        background: var(--p-primary-color);
        color: var(--p-primary-contrast-color);
        border-color: var(--p-primary-color);
      }
      .muted {
        font-size: 12px;
        color: var(--p-text-muted-color);
      }
      .actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .expand {
        background: var(--p-content-background);
        padding: 18px 28px;
      }
      .body {
        white-space: pre-wrap;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 12px;
        color: var(--p-text-color);
      }
      .meta {
        display: flex;
        gap: 24px;
        font-size: 12px;
        color: var(--p-text-muted-color);
        flex-wrap: wrap;
      }
      .meta code {
        font-family: var(--font-mono, ui-monospace, monospace);
      }
      .reply-hint {
        margin-top: 12px;
        font-size: 13px;
        color: var(--p-text-color);
      }
      .reply-hint a { color: var(--p-primary-color); }
    `,
  ],
})
export class ContactMessagesPage {
  private readonly service = inject(LegalAdminService);

  readonly statusFilters = STATUS_FILTERS;
  readonly pageSize = 25;

  readonly items = signal<ContactMessageRow[]>([]);
  readonly loading = signal(true);
  readonly busy = signal<Set<string>>(new Set());
  readonly statusFilter = signal<ContactStatus | 'all'>('new');
  readonly page = signal(1);
  readonly totalCount = signal(0);
  readonly expanded = signal<Record<string, boolean>>({});

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const status = this.statusFilter();
      const res = await this.service.listMessages({
        status: status === 'all' ? undefined : status,
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } finally {
      this.loading.set(false);
    }
  }

  setStatus(value: ContactStatus | 'all'): void {
    if (this.statusFilter() === value) return;
    this.statusFilter.set(value);
    this.page.set(1);
    this.refresh();
  }

  onLazy(event: { first: number; rows: number }): void {
    const nextPage = Math.floor(event.first / event.rows) + 1;
    if (nextPage !== this.page()) {
      this.page.set(nextPage);
      this.refresh();
    }
  }

  async mark(row: ContactMessageRow, status: 'read' | 'archived'): Promise<void> {
    const next = new Set(this.busy());
    next.add(row.id);
    this.busy.set(next);
    try {
      await this.service.setMessageStatus(row.id, status);
      // Optimistic local update; full refresh on filter mismatch.
      const updated = this.items().map((r) =>
        r.id === row.id ? { ...r, status } : r,
      );
      this.items.set(updated);
      const filter = this.statusFilter();
      if (filter !== 'all' && filter !== status) {
        // Drop the row that no longer matches the active filter.
        this.items.set(updated.filter((r) => r.id !== row.id));
        this.totalCount.set(Math.max(0, this.totalCount() - 1));
      }
    } finally {
      const cleared = new Set(this.busy());
      cleared.delete(row.id);
      this.busy.set(cleared);
    }
  }

  toggleExpand(row: ContactMessageRow): void {
    const current = { ...this.expanded() };
    if (current[row.id]) {
      delete current[row.id];
    } else {
      current[row.id] = true;
      // Auto-mark-read on first open (only when still new).
      if (row.status === 'new') this.mark(row, 'read');
    }
    this.expanded.set(current);
  }

  statusLabel(s: ContactStatus): string {
    return STATUS_LABELS[s];
  }

  statusSeverity(s: ContactStatus): 'info' | 'success' | 'secondary' {
    if (s === 'new') return 'info';
    if (s === 'read') return 'success';
    return 'secondary';
  }

  categoryLabel(c: ContactCategory): string {
    return CATEGORY_LABELS[c];
  }

  formatDate(s: string): string {
    try {
      return new Date(s).toLocaleString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return s;
    }
  }
}
