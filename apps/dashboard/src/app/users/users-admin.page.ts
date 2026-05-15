import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { AuthService } from '../auth/auth.service';
import {
  UsersAdminService,
  type AdminUserRow,
} from './users-admin.service';

const ADMIN_GRANTABLE = ['editor', 'curator', 'moderator'] as const;
const SUPERADMIN_GRANTABLE = ['admin', 'superadmin'] as const;

@Component({
  selector: 'sz-users-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="main__pad">
      <nav class="crumb">
        <a routerLink="/">Admin</a>
        <span class="sep">/</span>
        <span class="cur">Useri</span>
      </nav>

      <div class="ph-row">
        <div class="ph-title-block">
          <h1 class="ph-title">Useri</h1>
          <p class="ph-sub">
            <b style="color:var(--fg)">{{ totalCount() ?? '—' }}</b> useri înregistrați
            (filtrați curent)
          </p>
        </div>
        <div class="ph-actions">
          <button class="btn btn--ghost" type="button" (click)="exportCsv()" disabled>
            <svg><use href="#i-download" /></svg>Export CSV
          </button>
        </div>
      </div>

      <div class="filterbar" role="toolbar" aria-label="Filtrează useri">
        <div class="fb-search">
          <svg><use href="#i-search" /></svg>
          <input
            type="text"
            placeholder="username · email · nume real…"
            [(ngModel)]="q"
            (input)="onFilterInput()"
          />
        </div>
        <button class="fb-select" type="button" disabled>
          <span class="lbl">Rol</span>
          <span class="val">toate</span>
          <span class="chev">▾</span>
        </button>
        <button class="fb-select" type="button" disabled>
          <span class="lbl">Trust</span>
          <span class="val">toate</span>
          <span class="chev">▾</span>
        </button>
        <button class="fb-select" type="button" disabled>
          <span class="lbl">Status</span>
          <span class="val">active</span>
          <span class="chev">▾</span>
        </button>
        <button class="fb-select" type="button" disabled>
          <span class="lbl">Înregistrat</span>
          <span class="val">toate</span>
          <span class="chev">▾</span>
        </button>
        <button class="fb-reset" type="button" (click)="resetFilters()">
          <svg width="11" height="11"><use href="#i-x" /></svg>
          Reset
        </button>
      </div>

      @if (selected().size > 0) {
        <div class="bulk">
          <span class="bulk__count"><b>{{ selected().size }}</b>useri selectați</span>
          <span class="bulk__sep"></span>
          <button class="btn btn--ghost btn--sm" type="button" disabled>Trimite mesaj</button>
          <button class="btn btn--danger btn--sm" type="button" disabled>Ban</button>
          <button class="btn btn--quiet btn--sm" type="button" (click)="clearSelection()" aria-label="Închide bulk">
            <svg width="12" height="12"><use href="#i-x" /></svg>
          </button>
        </div>
      }

      <section class="card">
        <div class="tbl-wrap">
          <p-table
            [value]="items()"
            [loading]="loading()"
            [lazy]="true"
            [paginator]="true"
            [rows]="pageSize"
            [totalRecords]="totalCount() ?? 0"
            [first]="(page() - 1) * pageSize"
            (onLazyLoad)="onLazy($event)"
            [rowsPerPageOptions]="[25, 50, 100]"
            styleClass="tbl"
          >
            <ng-template pTemplate="header">
              <tr>
                <th style="width:34px">
                  <span
                    class="tbl__check"
                    [class.is-mixed]="hasPartialSelection()"
                    [class.is-on]="hasFullSelection()"
                    (click)="toggleSelectAll()"
                    aria-label="Selectează toți"
                  ></span>
                </th>
                <th>User</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Trust level</th>
                <th>Member since</th>
                <th>Status</th>
                <th style="width:60px"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr [class.is-selected]="selected().has(row.id)">
                <td>
                  <span
                    class="tbl__check"
                    [class.is-on]="selected().has(row.id)"
                    (click)="toggleSelect(row.id)"
                  ></span>
                </td>
                <td>
                  <div class="tbl__user">
                    <span class="avt">{{ initials(row) }}</span>
                    <div style="min-width:0">
                      <div class="name">{{ row.fullName || row.username }}</div>
                      <div class="sub">&#64;{{ row.username }} · <span style="opacity:.7">{{ shortId(row.id) }}</span></div>
                    </div>
                  </div>
                </td>
                <td class="tbl__mono">{{ row.email }}</td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    @for (r of row.roles; track r) {
                      <span class="bdg" [class]="'bdg--role-' + r">{{ r }}</span>
                    }
                  </div>
                </td>
                <td><span class="bdg" [class]="'bdg--trust-' + row.trustLevel">{{ trustLabel(row.trustLevel) }}</span></td>
                <td class="tbl__mono">{{ formatDate(row.createdAt) }}</td>
                <td>
                  <span class="bdg bdg--status-active">Active</span>
                </td>
                <td style="text-align:right">
                  <a class="tbl__action" [routerLink]="['/useri', row.id]" [attr.aria-label]="'Edit ' + row.username">
                    <svg width="14" height="14" fill="currentColor"><use href="#i-more" /></svg>
                  </a>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="8" style="text-align:center;padding:40px;color:var(--fg-muted);font-family:var(--font-mono);font-size:12px">
                  Niciun rezultat.
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </section>
    </div>
  `,
})
export class UsersAdminPage {
  readonly admin = inject(UsersAdminService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly pageSize = 50;
  readonly items = signal<AdminUserRow[]>([]);
  readonly totalCount = signal<number | null>(null);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly selected = signal<Set<string>>(new Set<string>());

  q = '';

  private debounce: ReturnType<typeof setTimeout> | null = null;

  readonly isSuperadmin = computed(() => {
    const u = this.auth.currentUser();
    return !!u?.roles.includes('superadmin');
  });

  readonly hasFullSelection = computed(() => {
    const list = this.items();
    if (list.length === 0) return false;
    const sel = this.selected();
    return list.every((r) => sel.has(r.id));
  });

  readonly hasPartialSelection = computed(() => {
    const sel = this.selected();
    if (sel.size === 0) return false;
    return !this.hasFullSelection();
  });

  constructor() {
    void this.fetch();
  }

  onFilterInput(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      void this.fetch();
    }, 300);
  }

  onLazy(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    this.page.set(Math.floor(first / rows) + 1);
    void this.fetch();
  }

  resetFilters(): void {
    this.q = '';
    this.page.set(1);
    void this.fetch();
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  toggleSelectAll(): void {
    if (this.hasFullSelection()) {
      this.selected.set(new Set());
    } else {
      this.selected.set(new Set(this.items().map((r) => r.id)));
    }
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  exportCsv(): void {
    // Placeholder — server endpoint not yet implemented.
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.admin.list({
        q: this.q || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } catch (err) {
      console.error('[users admin] list failed', err);
      this.items.set([]);
      this.totalCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }

  initials(row: AdminUserRow): string {
    const source = row.fullName || row.username;
    const parts = source.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  shortId(id: string): string {
    return id.slice(0, 8);
  }

  trustLabel(level: string): string {
    switch (level) {
      case 'id_verified':
        return 'ID verified';
      case 'phone_verified':
        return 'Phone verified';
      case 'email_verified':
        return 'Email verified';
      case 'unverified':
        return 'Unverified';
      case 'trusted_seller':
        return 'Trusted seller';
      default:
        return level;
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  grantableRoles(row: AdminUserRow): readonly string[] {
    const all = this.isSuperadmin()
      ? [...ADMIN_GRANTABLE, ...SUPERADMIN_GRANTABLE]
      : [...ADMIN_GRANTABLE];
    return all.filter((r) => !row.roles.includes(r));
  }
}
