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
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AuthService } from '../auth/auth.service';
import {
  UsersAdminService,
  type AdminUserRow,
} from './users-admin.service';

/** Grantable by admin (not superadmin). Match server-side allowlist. */
const ADMIN_GRANTABLE = ['editor', 'curator', 'moderator'] as const;
/** Additional roles only superadmin can grant/revoke. */
const SUPERADMIN_GRANTABLE = ['admin', 'superadmin'] as const;

@Component({
  selector: 'app-users-admin-page',
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
        <h1>Utilizatori · roluri</h1>
        @if (totalCount() !== null) {
          <p class="admin__meta">{{ totalCount() }} useri (filtrați)</p>
        }
      </header>

      <div class="admin__filters">
        <input
          pInputText
          type="search"
          placeholder="Caută username / email..."
          [(ngModel)]="q"
          (input)="onFilterInput()"
        />
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
            <th>User</th>
            <th>Email</th>
            <th>Roluri</th>
            <th>Trust</th>
            <th>Creat</th>
            <th>Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              <div class="admin__user">
                <strong>{{ row.fullName }}</strong>
                <span class="admin__handle">&#64;{{ row.username }}</span>
              </div>
            </td>
            <td>{{ row.email }}</td>
            <td>
              <div class="admin__roles">
                @for (r of row.roles; track r) {
                  <span class="admin__chip">
                    {{ r }}
                    @if (canRevoke(r)) {
                      <button
                        type="button"
                        (click)="revoke(row, r)"
                        [disabled]="actingKey() === row.id + ':' + r"
                        aria-label="Revocă"
                      >×</button>
                    }
                  </span>
                }
              </div>
            </td>
            <td><span class="admin__chip">{{ row.trustLevel }}</span></td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td>
              <div class="admin__grant">
                <select [(ngModel)]="pendingRole[row.id]">
                  <option [ngValue]="undefined">Adaugă rol...</option>
                  @for (r of grantableRoles(row); track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
                <button
                  pButton
                  type="button"
                  size="small"
                  label="Acordă"
                  [disabled]="!pendingRole[row.id] || actingKey() === row.id + ':grant'"
                  (click)="grant(row)"
                ></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="admin__empty">Niciun rezultat.</td>
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
      .admin__filters { margin: 18px 0 14px; }
      .admin__user strong {
        font-family: var(--font-display);
        font-weight: 500;
        display: block;
      }
      .admin__handle {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--accent);
        letter-spacing: 0.06em;
      }
      .admin__roles { display: inline-flex; flex-wrap: wrap; gap: 4px; }
      .admin__chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .admin__chip button {
        background: none;
        border: 0;
        color: var(--fg-muted);
        cursor: pointer;
        font-size: 13px;
        line-height: 1;
        padding: 0 2px;
      }
      .admin__chip button:hover:not(:disabled) { color: #c0392b; }
      .admin__chip button:disabled { opacity: 0.5; cursor: not-allowed; }
      .admin__grant {
        display: inline-flex;
        gap: 6px;
      }
      .admin__grant select {
        padding: 6px 8px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
      }
      .admin__empty { text-align: center; padding: 40px; color: var(--fg-muted); }
    `,
  ],
})
export class UsersAdminPage {
  readonly admin = inject(UsersAdminService);
  readonly auth = inject(AuthService);

  readonly pageSize = 50;
  readonly items = signal<AdminUserRow[]>([]);
  readonly totalCount = signal<number | null>(null);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly actingKey = signal<string | null>(null);

  pendingRole: Record<string, string | undefined> = {};
  q = '';

  private debounce: ReturnType<typeof setTimeout> | null = null;

  readonly isSuperadmin = computed(() => {
    const u = this.auth.currentUser();
    return !!u?.roles.includes('superadmin');
  });

  constructor() {
    void this.reload();
  }

  reload(): void {
    this.page.set(1);
    void this.fetch();
  }

  onFilterInput(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      void this.fetch();
    }, 300);
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

  grantableRoles(row: AdminUserRow): string[] {
    const all = this.isSuperadmin()
      ? [...ADMIN_GRANTABLE, ...SUPERADMIN_GRANTABLE]
      : [...ADMIN_GRANTABLE];
    return all.filter((r) => !row.roles.includes(r));
  }

  canRevoke(role: string): boolean {
    if (role === 'user') return false;
    if (role === 'admin' || role === 'superadmin') return this.isSuperadmin();
    return true;
  }

  async grant(row: AdminUserRow): Promise<void> {
    const role = this.pendingRole[row.id];
    if (!role) return;
    this.actingKey.set(row.id + ':grant');
    try {
      await this.admin.grantRole(row.id, role);
      this.pendingRole[row.id] = undefined;
      await this.fetch();
    } catch (err) {
      console.error('[users admin] grant failed', err);
      window.alert('Acordarea a eșuat.');
    } finally {
      this.actingKey.set(null);
    }
  }

  async revoke(row: AdminUserRow, role: string): Promise<void> {
    const ok = window.confirm(
      `Revocă rolul "${role}" pentru @${row.username}?`,
    );
    if (!ok) return;
    this.actingKey.set(row.id + ':' + role);
    try {
      await this.admin.revokeRole(row.id, role);
      await this.fetch();
    } catch (err) {
      console.error('[users admin] revoke failed', err);
      window.alert('Revocarea a eșuat.');
    } finally {
      this.actingKey.set(null);
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
