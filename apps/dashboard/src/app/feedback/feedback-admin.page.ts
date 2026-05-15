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
  FeedbackAdminService,
  type FeedbackKind,
  type FeedbackRow,
  type FeedbackStatus,
} from './feedback-admin.service';

const KIND_LABELS: Record<FeedbackKind, string> = {
  bug: 'Bug',
  sugestie: 'Sugestie',
  altele: 'Altele',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Nou',
  read: 'Citit',
  archived: 'Arhivat',
};

const STATUS_FILTERS: Array<{ value: FeedbackStatus | 'all'; label: string }> = [
  { value: 'new', label: 'Noi' },
  { value: 'read', label: 'Citite' },
  { value: 'archived', label: 'Arhivate' },
  { value: 'all', label: 'Toate' },
];

const KIND_FILTERS: Array<{ value: FeedbackKind | 'all'; label: string }> = [
  { value: 'all', label: 'Toate' },
  { value: 'bug', label: 'Bug-uri' },
  { value: 'sugestie', label: 'Sugestii' },
  { value: 'altele', label: 'Altele' },
];

@Component({
  selector: 'app-feedback-admin-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Feedback utilizatori</h1>
        <p class="admin__meta">
          Coada pentru link-ul „Trimite feedback" din pagina
          <code>/cont</code>. Bug-urile și sugestiile aterizează aici;
          email notification se trimite la
          <code>CONTACT_OPERATOR_EMAIL</code> dacă e setat.
        </p>

        <nav class="filters">
          <div class="filters__group">
            <span class="filters__label">Status:</span>
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
          </div>
          <div class="filters__group">
            <span class="filters__label">Tip:</span>
            @for (f of kindFilters; track f.value) {
              <button
                class="filter"
                [class.is-active]="kindFilter() === f.value"
                type="button"
                (click)="setKind(f.value)"
              >
                {{ f.label }}
              </button>
            }
          </div>
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
            <th style="width: 110px;">Status</th>
            <th style="width: 110px;">Tip</th>
            <th>Autor</th>
            <th>Mesaj (preview)</th>
            <th style="width: 140px;">Trimis</th>
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
            <td>
              <p-tag
                [value]="kindLabel(row.kind)"
                [severity]="kindSeverity(row.kind)"
              />
            </td>
            <td>
              @if (row.authorUsername) {
                <strong>&#64;{{ row.authorUsername }}</strong>
                <div class="muted">{{ row.authorEmail }}</div>
              } @else {
                <span class="muted">[user șters]</span>
              }
            </td>
            <td>
              <div class="preview">{{ excerpt(row.body) }}</div>
            </td>
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
                  @if (row.pageUrl) {
                    <span>Pagina: <code>{{ row.pageUrl }}</code></span>
                  }
                  <span>IP: <code>{{ row.ipAddress ?? '—' }}</code></span>
                  <span>UA: <code>{{ row.userAgent ?? '—' }}</code></span>
                  @if (row.readAt) {
                    <span>Citit: {{ formatDate(row.readAt) }}</span>
                  }
                </div>
                @if (row.authorEmail) {
                  <p class="reply-hint">
                    Răspunde la
                    <a [href]="'mailto:' + row.authorEmail">
                      {{ row.authorEmail }}
                    </a>.
                  </p>
                }
              </td>
            </tr>
          }
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7">Niciun feedback pentru filtrele curente.</td>
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
      .filters {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }
      .filters__group {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .filters__label {
        font-size: 12px;
        color: var(--p-text-muted-color);
        margin-right: 4px;
      }
      .filter {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        color: var(--p-text-color);
        padding: 5px 11px;
        border-radius: 6px;
        font-size: 12px;
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
      .preview {
        font-size: 13px;
        line-height: 1.4;
        max-width: 400px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
export class FeedbackAdminPage {
  private readonly service = inject(FeedbackAdminService);

  readonly statusFilters = STATUS_FILTERS;
  readonly kindFilters = KIND_FILTERS;
  readonly pageSize = 25;

  readonly items = signal<FeedbackRow[]>([]);
  readonly loading = signal(true);
  readonly busy = signal<Set<string>>(new Set());
  readonly statusFilter = signal<FeedbackStatus | 'all'>('new');
  readonly kindFilter = signal<FeedbackKind | 'all'>('all');
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
      const kind = this.kindFilter();
      const res = await this.service.list({
        status: status === 'all' ? undefined : status,
        kind: kind === 'all' ? undefined : kind,
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } finally {
      this.loading.set(false);
    }
  }

  setStatus(value: FeedbackStatus | 'all'): void {
    if (this.statusFilter() === value) return;
    this.statusFilter.set(value);
    this.page.set(1);
    this.refresh();
  }

  setKind(value: FeedbackKind | 'all'): void {
    if (this.kindFilter() === value) return;
    this.kindFilter.set(value);
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

  async mark(row: FeedbackRow, status: 'read' | 'archived'): Promise<void> {
    const next = new Set(this.busy());
    next.add(row.id);
    this.busy.set(next);
    try {
      await this.service.setStatus(row.id, status);
      const updated = this.items().map((r) =>
        r.id === row.id ? { ...r, status } : r,
      );
      this.items.set(updated);
      const filter = this.statusFilter();
      if (filter !== 'all' && filter !== status) {
        this.items.set(updated.filter((r) => r.id !== row.id));
        this.totalCount.set(Math.max(0, this.totalCount() - 1));
      }
    } finally {
      const cleared = new Set(this.busy());
      cleared.delete(row.id);
      this.busy.set(cleared);
    }
  }

  toggleExpand(row: FeedbackRow): void {
    const current = { ...this.expanded() };
    if (current[row.id]) {
      delete current[row.id];
    } else {
      current[row.id] = true;
      if (row.status === 'new') this.mark(row, 'read');
    }
    this.expanded.set(current);
  }

  statusLabel(s: FeedbackStatus): string {
    return STATUS_LABELS[s];
  }
  statusSeverity(s: FeedbackStatus): 'info' | 'success' | 'secondary' {
    if (s === 'new') return 'info';
    if (s === 'read') return 'success';
    return 'secondary';
  }

  kindLabel(k: FeedbackKind): string {
    return KIND_LABELS[k];
  }
  kindSeverity(k: FeedbackKind): 'danger' | 'warn' | 'secondary' {
    if (k === 'bug') return 'danger';
    if (k === 'sugestie') return 'warn';
    return 'secondary';
  }

  excerpt(body: string): string {
    if (body.length <= 120) return body;
    return body.slice(0, 117) + '…';
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
