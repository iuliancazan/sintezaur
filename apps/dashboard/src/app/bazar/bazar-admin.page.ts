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
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TPipe } from '../i18n/t.pipe';
import {
  BazarAdminService,
  type AdminListingRow,
} from './bazar-admin.service';

const STATUS_OPTIONS = [
  { value: '', label: 'Toate' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Vândute' },
  { value: 'expired', label: 'Expirate' },
  { value: 'removed', label: 'Eliminate' },
  { value: 'draft', label: 'Schiță' },
];

@Component({
  selector: 'app-bazar-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    TableModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <div>
          <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
          <h1>Bazar · moderare</h1>
          @if (totalCount() !== null) {
            <p class="admin__meta">{{ totalCount() }} anunțuri (filtrate)</p>
          }
        </div>
      </header>

      <div class="admin__filters">
        <input
          pInputText
          type="search"
          placeholder="Caută titlu / slug…"
          [(ngModel)]="q"
          (input)="onFilterInput()"
        />
        <input
          pInputText
          type="search"
          placeholder="Vânzător (username)"
          [(ngModel)]="sellerUsername"
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
        styleClass="admin__table"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 64px">Foto</th>
            <th>Titlu</th>
            <th>Vânzător</th>
            <th>Preț</th>
            <th>Stare</th>
            <th>Status</th>
            <th>Creat</th>
            <th>Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              @if (row.thumb) {
                <img
                  class="admin__thumb"
                  [src]="bazar.imageUrl(row.thumb)"
                  [alt]="row.title"
                />
              } @else {
                <div class="admin__thumb is-empty"></div>
              }
            </td>
            <td>
              <a
                class="admin__title-link"
                [href]="'/bazar/' + row.slug"
                target="_blank"
                rel="noopener"
              >
                {{ row.title }}
              </a>
            </td>
            <td>
              <span class="admin__seller">&#64;{{ row.seller.username }}</span>
            </td>
            <td>{{ formatPrice(row.price, row.currency) }}</td>
            <td>{{ row.condition }}</td>
            <td>
              <span class="admin__status is-{{ row.status }}">
                {{ statusLabel(row.status) }}
              </span>
            </td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="admin__actions">
              @if (row.status !== 'removed') {
                <button
                  pButton
                  type="button"
                  severity="danger"
                  size="small"
                  label="Elimină"
                  [disabled]="actingId() === row.id"
                  (click)="removeListing(row)"
                ></button>
              } @else {
                <button
                  pButton
                  type="button"
                  severity="success"
                  size="small"
                  label="Restaurează"
                  [disabled]="actingId() === row.id"
                  (click)="restoreListing(row)"
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
      .admin__meta {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 12px;
        margin: 4px 0 0;
      }
      .admin__filters {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
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
      .admin__thumb.is-empty {
        background: var(--bg-elev);
        border: 1px dashed var(--line);
      }
      .admin__title-link { color: var(--fg); text-decoration: none; font-weight: 600; }
      .admin__title-link:hover { color: var(--accent); }
      .admin__seller {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg-muted);
      }
      .admin__status {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1px solid var(--line-strong);
      }
      .admin__status.is-active { color: var(--accent); border-color: var(--accent); }
      .admin__status.is-sold { color: #fff; background: var(--accent); border-color: var(--accent); }
      .admin__status.is-expired { color: #c0392b; border-color: #c0392b; }
      .admin__status.is-removed { color: #999; }
      .admin__actions { white-space: nowrap; }
      .admin__empty { text-align: center; padding: 40px; color: var(--fg-muted); }
    `,
  ],
})
export class BazarAdminPage {
  readonly bazar = inject(BazarAdminService);

  readonly statusOptions = STATUS_OPTIONS;
  readonly pageSize = 50;

  readonly items = signal<AdminListingRow[]>([]);
  readonly totalCount = signal<number | null>(null);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly actingId = signal<string | null>(null);

  q = '';
  sellerUsername = '';
  status = '';

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.reload();
  }

  onFilterInput(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      void this.reload();
    }, 300);
  }

  reload(): void {
    this.page.set(1);
    void this.fetch();
  }

  onLazy(event: { first?: number; rows?: number }): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    const next = Math.floor(first / rows) + 1;
    this.page.set(next);
    void this.fetch();
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.bazar.list({
        q: this.q || undefined,
        sellerUsername: this.sellerUsername || undefined,
        status: this.status || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } catch (err) {
      console.error('[bazar admin] list failed', err);
      this.items.set([]);
      this.totalCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  async removeListing(row: AdminListingRow): Promise<void> {
    const reason = window.prompt(
      `Motiv eliminare pentru "${row.title}":`,
    );
    if (reason === null) return;
    this.actingId.set(row.id);
    try {
      await this.bazar.remove(row.id, reason || '(fără motiv)');
      await this.fetch();
    } catch (err) {
      console.error('[bazar admin] remove failed', err);
      window.alert('Eliminarea a eșuat.');
    } finally {
      this.actingId.set(null);
    }
  }

  async restoreListing(row: AdminListingRow): Promise<void> {
    const ok = window.confirm(`Restaurează "${row.title}"?`);
    if (!ok) return;
    this.actingId.set(row.id);
    try {
      await this.bazar.unremove(row.id);
      await this.fetch();
    } catch (err) {
      console.error('[bazar admin] restore failed', err);
      window.alert('Restaurarea a eșuat.');
    } finally {
      this.actingId.set(null);
    }
  }

  statusLabel(s: string): string {
    return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
  }

  formatPrice(amount: string, currency: 'ron' | 'eur'): string {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(n);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
