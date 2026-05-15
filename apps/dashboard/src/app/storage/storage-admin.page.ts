import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminStorageDashboardService,
  type AdminFolderRow,
  type AdminLimitRow,
  type AdminOverview,
  type AdminTopUserRow,
  type AdminTrendsPoint,
  type StorageModuleValue,
} from './admin-storage.service';

type TabKey = 'limits' | 'overview' | 'folders' | 'trends' | 'users';

/**
 * `/admin/storage` — single page with 5 tabs that all hit Postgres
 * (never R2). Limits tab edits the cache-backed `storage_limits`
 * table; the change propagates within ≤5 min on the API (the backend
 * service explicitly invalidates its cache on update). The Reconcile
 * button enqueues a one-shot `storage:reconcile` pg-boss job; result
 * lands in the worker log (no toast loop here).
 */
@Component({
  selector: 'app-storage-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Storage</h1>
        <p class="admin__meta">
          Limite editabile · totaluri · folders · trends · top useri.
          Reconciliere on-demand sub buton (rulează și automat
          nightly la 03:00 UTC pe driver-ul S3).
        </p>
      </header>

      <nav class="tabs">
        <button
          type="button"
          [class.is-active]="tab() === 'limits'"
          (click)="setTab('limits')"
        >Limite</button>
        <button
          type="button"
          [class.is-active]="tab() === 'overview'"
          (click)="setTab('overview')"
        >Overview</button>
        <button
          type="button"
          [class.is-active]="tab() === 'folders'"
          (click)="setTab('folders')"
        >Folders</button>
        <button
          type="button"
          [class.is-active]="tab() === 'trends'"
          (click)="setTab('trends')"
        >Trends</button>
        <button
          type="button"
          [class.is-active]="tab() === 'users'"
          (click)="setTab('users')"
        >Top useri</button>
        <span class="tabs-spacer"></span>
        <button
          type="button"
          class="reconcile-btn"
          (click)="onReconcile()"
          [disabled]="reconcileBusy()"
        >
          {{ reconcileBusy() ? 'Se trimite…' : 'Reconcile acum' }}
        </button>
      </nav>

      @if (toast(); as t) {
        <div class="toast">{{ t }}</div>
      }

      @if (tab() === 'limits') {
        <section class="card">
          <h2>Limite (editabile)</h2>
          @if (limits().length === 0) {
            <p class="muted">Nicio limită configurată.</p>
          } @else {
            <table class="grid">
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Tip fișier</th>
                  <th>Modul</th>
                  <th>Max (bytes)</th>
                  <th>Max (MB)</th>
                  <th>Actualizat</th>
                  <th>De către</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (l of limits(); track l.id) {
                  <tr>
                    <td>{{ l.scope }}</td>
                    <td>{{ l.fileType }}</td>
                    <td>{{ l.module }}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        [(ngModel)]="edited[l.id]"
                        [placeholder]="l.maxBytes"
                      />
                    </td>
                    <td class="muted">{{ formatMB(l.maxBytes) }}</td>
                    <td>{{ formatDate(l.updatedAt) }}</td>
                    <td>{{ l.updatedByUsername ?? '—' }}</td>
                    <td>
                      <button
                        type="button"
                        (click)="saveLimit(l)"
                        [disabled]="!isDirty(l) || saving()"
                      >
                        {{ saving() ? '…' : 'Salvează' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      @if (tab() === 'overview') {
        <section class="card">
          <h2>Totaluri</h2>
          @if (overview(); as o) {
            <div class="cards-row">
              <div class="metric-card">
                <span class="label">Total bytes</span>
                <span class="value">{{ formatBytes(o.totalBytes) }}</span>
              </div>
              <div class="metric-card">
                <span class="label">Total uploads</span>
                <span class="value">{{ o.totalEvents }}</span>
              </div>
            </div>
            <h3>Per modul</h3>
            <table class="grid">
              <thead>
                <tr>
                  <th>Modul</th>
                  <th>Bytes</th>
                  <th>Uploads</th>
                </tr>
              </thead>
              <tbody>
                @for (m of o.perModule; track m.module) {
                  <tr>
                    <td>{{ m.module }}</td>
                    <td>{{ formatBytes(m.bytes) }}</td>
                    <td>{{ m.events }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <h3>Per tip fișier</h3>
            <table class="grid">
              <thead>
                <tr>
                  <th>Tip</th>
                  <th>Bytes</th>
                  <th>Uploads</th>
                </tr>
              </thead>
              <tbody>
                @for (f of o.perFileType; track f.fileType) {
                  <tr>
                    <td>{{ f.fileType }}</td>
                    <td>{{ formatBytes(f.bytes) }}</td>
                    <td>{{ f.events }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="muted">Se încarcă…</p>
          }
        </section>
      }

      @if (tab() === 'folders') {
        <section class="card">
          <h2>Folders — top consume</h2>
          <div class="filters">
            <label>
              Modul:
              <select [(ngModel)]="folderModule" (change)="loadFolders()">
                <option value="*">Toate</option>
                <option value="tezaur">tezaur</option>
                <option value="bazar">bazar</option>
                <option value="revista">revista</option>
                <option value="forum">forum</option>
                <option value="avatar">avatar</option>
              </select>
            </label>
          </div>
          @if (folders().length === 0) {
            <p class="muted">Niciun folder cu trafic încă.</p>
          } @else {
            <table class="grid">
              <thead>
                <tr>
                  <th>Modul</th>
                  <th>Resource ID</th>
                  <th>Bytes</th>
                  <th>Files</th>
                  <th>Last update</th>
                </tr>
              </thead>
              <tbody>
                @for (f of folders(); track f.module + '/' + f.resourceId) {
                  <tr>
                    <td>{{ f.module }}</td>
                    <td class="mono">{{ f.resourceId }}</td>
                    <td>{{ formatBytes(f.totalBytes) }}</td>
                    <td>{{ f.fileCount }}</td>
                    <td>{{ formatDate(f.updatedAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      @if (tab() === 'trends') {
        <section class="card">
          <h2>Trends</h2>
          <div class="filters">
            <label>
              Granularitate:
              <select [(ngModel)]="granularity" (change)="loadTrends()">
                <option value="day">Zilnic</option>
                <option value="week">Săptămânal</option>
                <option value="month">Lunar</option>
              </select>
            </label>
            <label>
              De la:
              <input
                type="date"
                [(ngModel)]="trendsFrom"
                (change)="loadTrends()"
              />
            </label>
            <label>
              Până la:
              <input
                type="date"
                [(ngModel)]="trendsTo"
                (change)="loadTrends()"
              />
            </label>
          </div>
          @if (trends().length === 0) {
            <p class="muted">Niciun upload în intervalul ales.</p>
          } @else {
            <table class="grid">
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th>Bytes</th>
                  <th>Uploads</th>
                </tr>
              </thead>
              <tbody>
                @for (t of trends(); track t.bucket) {
                  <tr>
                    <td>{{ formatBucket(t.bucket) }}</td>
                    <td>{{ formatBytes(t.bytes) }}</td>
                    <td>{{ t.events }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      @if (tab() === 'users') {
        <section class="card">
          <h2>Top useri</h2>
          @if (topUsers().length === 0) {
            <p class="muted">Niciun upload de la useri încă.</p>
          } @else {
            <table class="grid">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Bytes</th>
                  <th>Uploads</th>
                </tr>
              </thead>
              <tbody>
                @for (u of topUsers(); track u.userId; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>{{ u.username ?? u.userId }}</td>
                    <td>{{ formatBytes(u.bytes) }}</td>
                    <td>{{ u.events }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
    </main>
  `,
  styles: [
    `
      .admin {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px var(--gutter-x);
      }
      .admin__head h1 {
        font-family: var(--font-display);
        margin: 16px 0 8px;
      }
      .admin__back {
        font-size: 13px;
        color: var(--fg);
        opacity: 0.7;
        text-decoration: none;
      }
      .admin__meta {
        color: var(--fg);
        opacity: 0.7;
        font-size: 13px;
        max-width: 720px;
      }
      .tabs {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 24px 0 16px;
        border-bottom: 1px solid var(--line);
        padding-bottom: 8px;
        flex-wrap: wrap;
      }
      .tabs button {
        background: transparent;
        border: 1px solid var(--line);
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        color: var(--fg);
      }
      .tabs button.is-active {
        background: var(--accent, #2563eb);
        color: #fff;
        border-color: var(--accent, #2563eb);
      }
      .tabs-spacer { flex: 1; }
      .reconcile-btn {
        background: var(--bg-card);
      }
      .reconcile-btn:not([disabled]) {
        cursor: pointer;
      }
      .card {
        background: var(--bg-card, #fff);
        border: 1px solid var(--line, #e4e4e7);
        padding: 16px;
        margin-bottom: 16px;
      }
      .card h2 { margin: 0 0 12px; font-size: 18px; }
      .card h3 { margin: 16px 0 8px; font-size: 14px; }
      .grid {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .grid th, .grid td {
        border: 1px solid var(--line, #e4e4e7);
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      .grid th { background: var(--bg-elev, #f9fafb); font-weight: 600; }
      .mono { font-family: var(--font-mono, monospace); font-size: 11px; }
      .muted { opacity: 0.6; }
      .cards-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .metric-card {
        border: 1px solid var(--line);
        padding: 12px;
        display: flex;
        flex-direction: column;
      }
      .metric-card .label { font-size: 11px; opacity: 0.7; }
      .metric-card .value {
        font-family: var(--font-display);
        font-size: 22px;
        margin-top: 4px;
      }
      .filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
        font-size: 13px;
      }
      .filters label {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .toast {
        background: var(--accent, #2563eb);
        color: #fff;
        padding: 8px 12px;
        font-size: 13px;
        margin-bottom: 12px;
        border-radius: 4px;
      }
    `,
  ],
})
export class StorageAdminPage implements OnInit {
  private readonly api = inject(AdminStorageDashboardService);

  readonly tab = signal<TabKey>('limits');
  readonly limits = signal<AdminLimitRow[]>([]);
  readonly overview = signal<AdminOverview | null>(null);
  readonly folders = signal<AdminFolderRow[]>([]);
  readonly trends = signal<AdminTrendsPoint[]>([]);
  readonly topUsers = signal<AdminTopUserRow[]>([]);
  readonly saving = signal(false);
  readonly reconcileBusy = signal(false);
  readonly toast = signal<string | null>(null);

  readonly edited: Record<string, number | null> = {};
  folderModule: StorageModuleValue | '*' = '*';
  granularity: 'day' | 'week' | 'month' = 'day';
  trendsFrom = '';
  trendsTo = '';

  ngOnInit(): void {
    void this.loadLimits();
  }

  setTab(t: TabKey): void {
    this.tab.set(t);
    if (t === 'limits') void this.loadLimits();
    if (t === 'overview') void this.loadOverview();
    if (t === 'folders') void this.loadFolders();
    if (t === 'trends') void this.loadTrends();
    if (t === 'users') void this.loadTopUsers();
  }

  isDirty(l: AdminLimitRow): boolean {
    const v = this.edited[l.id];
    return v !== undefined && v !== null && v !== l.maxBytes && v > 0;
  }

  async saveLimit(l: AdminLimitRow): Promise<void> {
    const v = this.edited[l.id];
    if (!v) return;
    this.saving.set(true);
    try {
      await this.api.updateLimit(l.id, v);
      await this.loadLimits();
      this.flashToast(`Limită salvată: ${l.scope}/${l.fileType}/${l.module}`);
      delete this.edited[l.id];
    } catch (err) {
      this.flashToast(`Eroare: ${(err as Error).message}`);
    } finally {
      this.saving.set(false);
    }
  }

  async loadLimits(): Promise<void> {
    try {
      this.limits.set(await this.api.listLimits());
    } catch {
      this.flashToast('Eroare la încărcarea limitelor');
    }
  }

  async loadOverview(): Promise<void> {
    try {
      this.overview.set(await this.api.overview());
    } catch {
      this.flashToast('Eroare la overview');
    }
  }

  async loadFolders(): Promise<void> {
    try {
      const mod =
        this.folderModule === '*'
          ? undefined
          : (this.folderModule as StorageModuleValue);
      this.folders.set(await this.api.folders({ module: mod, limit: 100 }));
    } catch {
      this.flashToast('Eroare la folders');
    }
  }

  async loadTrends(): Promise<void> {
    try {
      this.trends.set(
        await this.api.trends({
          granularity: this.granularity,
          from: this.trendsFrom || undefined,
          to: this.trendsTo || undefined,
        }),
      );
    } catch {
      this.flashToast('Eroare la trends');
    }
  }

  async loadTopUsers(): Promise<void> {
    try {
      this.topUsers.set(await this.api.topUsers({ limit: 50 }));
    } catch {
      this.flashToast('Eroare la top useri');
    }
  }

  async onReconcile(): Promise<void> {
    this.reconcileBusy.set(true);
    try {
      const res = await this.api.reconcile();
      this.flashToast(
        res.jobId
          ? `Job reconciliere trimis (id: ${res.jobId})`
          : 'Reconcile trimis (id necunoscut)',
      );
    } catch (err) {
      this.flashToast(`Eroare: ${(err as Error).message}`);
    } finally {
      this.reconcileBusy.set(false);
    }
  }

  formatBytes(b: number): string {
    if (!b) return '0 B';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024)
      return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  formatMB(b: number): string {
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('ro-RO');
  }

  formatBucket(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ro-RO');
  }

  private flashToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2400);
  }
}
