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
import {
  ForumQueueService,
  type PendingPostRow,
} from './forum-queue.service';

@Component({
  selector: 'app-forum-queue-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TableModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Forum · prima postare</h1>
        <p class="admin__meta">
          Postări în așteptare (first-post approval per spec §8.4). FIFO,
          cel mai vechi primul.
        </p>
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
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 180px;">Autor</th>
            <th>Thread</th>
            <th>Corp</th>
            <th style="width: 140px;">Creat</th>
            <th style="width: 220px;">Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              @if (row.authorUsername) {
                <strong>&#64;{{ row.authorUsername }}</strong>
                @if (row.authorFullName) {
                  <div class="muted">{{ row.authorFullName }}</div>
                }
              } @else {
                <span class="muted">[șters]</span>
              }
            </td>
            <td>
              <strong>{{ row.threadTitle }}</strong>
              <div class="muted">
                <code>{{ row.categorySlug }}</code>
                @if (row.subSeq !== null) {
                  · #{{ row.topLevelSeq }}.{{ row.subSeq }}
                } @else if (row.topLevelSeq > 0) {
                  · #{{ row.topLevelSeq }}
                } @else {
                  · OP
                }
              </div>
            </td>
            <td>
              <div class="body" [innerHTML]="row.bodyHtml"></div>
            </td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="actions">
              <button
                pButton
                type="button"
                size="small"
                severity="success"
                [disabled]="busy().has(row.id)"
                (click)="approve(row)"
                label="✓ Aprobă"
              ></button>
              <button
                pButton
                type="button"
                size="small"
                severity="danger"
                [disabled]="busy().has(row.id)"
                (click)="reject(row)"
                label="✗ Respinge"
              ></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty">Coada e goală — nimic de moderat.</td></tr>
        </ng-template>
      </p-table>
    </main>
  `,
  styles: [
    `
      .admin { padding: 24px 32px; max-width: 1280px; margin: 0 auto; }
      .admin__head h1 { margin: 4px 0 6px; }
      .admin__back { font-size: 12px; color: var(--p-text-muted-color); text-decoration: none; }
      .admin__meta { color: var(--p-text-muted-color); font-size: 13px; margin: 0 0 16px; }
      .muted { color: var(--p-text-muted-color); font-size: 12px; margin-top: 4px; }
      .body {
        max-height: 200px;
        overflow-y: auto;
        font-size: 13px;
        line-height: 1.5;
      }
      .body :first-child { margin-top: 0; }
      .body :last-child { margin-bottom: 0; }
      .body p { margin: 0 0 8px; }
      .actions { display: inline-flex; gap: 6px; }
      .empty { text-align: center; color: var(--p-text-muted-color); padding: 30px; }
      code { font-family: var(--font-mono, monospace); font-size: 11px; }
    `,
  ],
})
export class ForumQueuePage {
  private readonly queue = inject(ForumQueueService);

  readonly pageSize = 25;
  readonly items = signal<PendingPostRow[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly busy = signal<Set<string>>(new Set());

  constructor() {
    void this.fetch();
  }

  onLazy(ev: { first: number; rows: number }): void {
    const nextPage = Math.floor(ev.first / ev.rows) + 1;
    if (nextPage !== this.page()) {
      this.page.set(nextPage);
      void this.fetch();
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('ro', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async approve(row: PendingPostRow): Promise<void> {
    await this.act(row, () => this.queue.approve(row.id));
  }

  async reject(row: PendingPostRow): Promise<void> {
    if (!confirm(`Sigur respingi prima postare a lui @${row.authorUsername ?? '?'}?`)) {
      return;
    }
    await this.act(row, () => this.queue.reject(row.id));
  }

  private async act(
    row: PendingPostRow,
    call: () => Promise<void>,
  ): Promise<void> {
    const next = new Set(this.busy());
    next.add(row.id);
    this.busy.set(next);
    try {
      await call();
      this.items.set(this.items().filter((r) => r.id !== row.id));
      this.totalCount.set(Math.max(0, this.totalCount() - 1));
    } catch (err) {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        'Acțiunea a eșuat.';
      alert(msg);
    } finally {
      const after = new Set(this.busy());
      after.delete(row.id);
      this.busy.set(after);
    }
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.queue.list(this.page(), this.pageSize);
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } catch {
      this.items.set([]);
      this.totalCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }
}
