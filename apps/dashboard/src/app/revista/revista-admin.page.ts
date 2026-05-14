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
import { environment } from '../../environments/environment';
import {
  RevistaAdminService,
  type AdminArticleRow,
} from './revista-admin.service';

const STATUS_OPTIONS = [
  { value: '', label: 'Toate' },
  { value: 'draft', label: 'Schiță' },
  { value: 'published', label: 'Publicat' },
  { value: 'archived', label: 'Arhivat' },
];

@Component({
  selector: 'app-revista-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    InputTextModule,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Revista · moderare articole</h1>
        @if (totalCount() !== null) {
          <p class="admin__meta">{{ totalCount() }} articole (filtrate)</p>
        }
      </header>

      <div class="admin__filters">
        <input
          pInputText
          type="search"
          placeholder="Caută titlu / slug…"
          [(ngModel)]="q"
          (input)="onFilterInput()"
        />
        <select [(ngModel)]="status" (change)="reload()" class="admin__select">
          @for (opt of statusOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
      </div>

      <p-table
        [value]="items()"
        [loading]="loading()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageSize"
        [totalRecords]="totalCount() ?? 0"
        [first]="(page() - 1) * pageSize"
        (onLazyLoad)="onLazy($any($event))"
        [rowsPerPageOptions]="[25, 50, 100]"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 64px">Hero</th>
            <th>Titlu</th>
            <th>Autor</th>
            <th>Categorie</th>
            <th>Status</th>
            <th>Publicat</th>
            <th>Vizit.</th>
            <th>Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              @if (row.heroThumb) {
                <img
                  class="admin__thumb"
                  [src]="revista.imageUrl(row.heroThumb)"
                  [alt]="row.title"
                />
              } @else {
                <div class="admin__thumb is-empty"></div>
              }
            </td>
            <td>
              <a
                class="admin__title-link"
                [href]="siteUrl(row)"
                target="_blank"
                rel="noopener"
              >
                {{ row.title }}
              </a>
            </td>
            <td>
              <span class="admin__author">&#64;{{ row.author.username }}</span>
            </td>
            <td>{{ humanize(row.category) }}</td>
            <td>
              <span class="admin__status is-{{ row.status }}">
                {{ statusLabel(row.status) }}
              </span>
            </td>
            <td>{{ row.publishedAt ? formatDate(row.publishedAt) : '—' }}</td>
            <td>{{ row.viewCount }}</td>
            <td class="admin__actions">
              <a
                pButton
                type="button"
                severity="secondary"
                size="small"
                label="Vezi"
                [href]="editorUrl(row)"
                target="_blank"
                rel="noopener"
              ></a>
              @if (row.status === 'archived') {
                <button
                  pButton
                  type="button"
                  severity="success"
                  size="small"
                  label="Dezarhivează"
                  [disabled]="actingId() === row.id"
                  (click)="unarchive(row)"
                ></button>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="admin__empty">Niciun rezultat.</td>
          </tr>
        </ng-template>
      </p-table>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .admin { max-width: 1400px; margin: 0 auto; padding: 32px var(--gutter-x); }
      .admin__back {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        text-decoration: none;
        display: inline-block;
        margin-bottom: 8px;
      }
      h1 {
        font-family: var(--font-display);
        font-size: clamp(24px, 4vw, 36px);
        margin: 0;
      }
      .admin__meta { color: var(--fg-muted); font-family: var(--font-mono); font-size: 12px; margin: 4px 0 0; }
      .admin__filters {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        margin: 18px 0 14px;
      }
      .admin__select {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .admin__thumb {
        width: 56px;
        height: 56px;
        object-fit: cover;
        display: block;
        background: var(--bg-elev);
      }
      .admin__thumb.is-empty { background: var(--bg-elev); border: 1px dashed var(--line); }
      .admin__title-link { color: var(--fg); text-decoration: none; font-weight: 600; }
      .admin__title-link:hover { color: var(--accent); }
      .admin__author { font-family: var(--font-mono); font-size: 12px; color: var(--fg-muted); }
      .admin__status {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1px solid var(--line-strong);
      }
      .admin__status.is-published { color: var(--accent); border-color: var(--accent); }
      .admin__status.is-archived { color: #c0392b; border-color: #c0392b; }
      .admin__status.is-draft { color: var(--fg-muted); }
      .admin__actions { white-space: nowrap; display: inline-flex; gap: 8px; }
      .admin__empty { text-align: center; padding: 40px; color: var(--fg-muted); }
    `,
  ],
})
export class RevistaAdminPage {
  readonly revista = inject(RevistaAdminService);

  readonly statusOptions = STATUS_OPTIONS;
  readonly pageSize = 50;

  readonly items = signal<AdminArticleRow[]>([]);
  readonly totalCount = signal<number | null>(null);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly actingId = signal<string | null>(null);

  q = '';
  status = '';

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.reload();
  }

  onFilterInput(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      void this.fetch();
    }, 300);
  }

  reload(): void {
    this.page.set(1);
    void this.fetch();
  }

  onLazy(event: { first?: number; rows?: number }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    this.page.set(Math.floor(first / rows) + 1);
    void this.fetch();
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.revista.list({
        q: this.q || undefined,
        status: this.status || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } catch (err) {
      console.error('[revista admin] list failed', err);
      this.items.set([]);
      this.totalCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  async unarchive(row: AdminArticleRow): Promise<void> {
    const ok = window.confirm(`Dezarhivează "${row.title}"?`);
    if (!ok) return;
    this.actingId.set(row.id);
    try {
      await this.revista.unarchive(row.id);
      await this.fetch();
    } catch (err) {
      console.error('[revista admin] unarchive failed', err);
      window.alert('Dezarhivarea a eșuat.');
    } finally {
      this.actingId.set(null);
    }
  }

  statusLabel(s: string): string {
    return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
  }

  humanize(s: string): string {
    return s
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  siteUrl(row: AdminArticleRow): string {
    return `${this.siteHost()}/revista/${row.slug}`;
  }

  editorUrl(row: AdminArticleRow): string {
    return `${this.siteHost()}/revista/${row.slug}/editare`;
  }

  private siteHost(): string {
    return (
      environment.siteBaseUrl ??
      environment.apiBaseUrl.replace(/\/api$/, '')
    );
  }
}
