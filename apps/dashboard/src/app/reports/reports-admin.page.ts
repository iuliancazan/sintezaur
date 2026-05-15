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
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { environment } from '../../environments/environment';
import {
  ReportsAdminService,
  type ReportRow,
  type ReportStatus,
  type ReportTarget,
  type ResolveAction,
} from './reports-admin.service';

interface ResolveDialogState {
  report: ReportRow;
  action: ResolveAction;
  actionReason: string;
  resolutionNote: string;
}

@Component({
  selector: 'app-reports-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Raportări</h1>
        <p class="admin__meta">
          Coadă unificată per spec §7.10. Reporter primește notificare la rezolvare.
        </p>
      </header>

      <div class="admin__filters">
        <p-select
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="status()"
          (ngModelChange)="setStatus($event)"
          placeholder="Toate statusurile"
          [showClear]="true"
          appendTo="body"
        ></p-select>
        <p-select
          [options]="targetOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="targetType()"
          (ngModelChange)="setTarget($event)"
          placeholder="Toate tipurile"
          [showClear]="true"
          appendTo="body"
        ></p-select>
        <span class="admin__meta">{{ totalCount() }} rapoarte</span>
      </div>

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
            <th>Status</th>
            <th>Țintă</th>
            <th>Motiv</th>
            <th>Reporter</th>
            <th style="width: 140px;">Creat</th>
            <th style="width: 380px;">Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr [class.is-resolved]="!isOpen(row)">
            <td>
              <span class="badge" [attr.data-st]="row.status">{{ statusLabel(row.status) }}</span>
            </td>
            <td>
              <code>{{ row.targetType }}</code>
              @if (row.targetSnapshot?.title) {
                <div class="strong">{{ row.targetSnapshot.title }}</div>
              }
              @if (row.targetSnapshot?.bodyExcerpt) {
                <div class="muted excerpt">{{ row.targetSnapshot.bodyExcerpt }}</div>
              }
              @if (link(row); as href) {
                <a class="link-out" [href]="href" target="_blank" rel="noopener">
                  ↗ Deschide
                </a>
              }
            </td>
            <td class="reason">{{ row.reason }}</td>
            <td>
              @if (row.reporterUsername) {
                &#64;{{ row.reporterUsername }}
              } @else {
                <span class="muted">[șters]</span>
              }
            </td>
            <td>{{ formatDate(row.createdAt) }}</td>
            <td class="actions">
              @if (isOpen(row)) {
                @if (row.targetType === 'forum_post') {
                  <button pButton type="button" size="small" severity="danger" (click)="openResolve(row, 'hide_post')" label="Hide + Rezolvă"></button>
                }
                @if (row.targetType === 'forum_thread') {
                  <button pButton type="button" size="small" severity="warn" (click)="openResolve(row, 'lock_thread')" label="Lock + Rezolvă"></button>
                  <button pButton type="button" size="small" severity="danger" (click)="openResolve(row, 'delete_thread')" label="Delete + Rezolvă"></button>
                }
                <button pButton type="button" size="small" severity="secondary" (click)="quickResolve(row, 'resolved_no_action')" label="Fără acțiune"></button>
                <button pButton type="button" size="small" severity="secondary" (click)="quickResolve(row, 'duplicate')" label="Duplicat"></button>
              } @else {
                <span class="muted">
                  Rezolvat
                  @if (row.resolvedAt) { · {{ formatDate(row.resolvedAt) }} }
                  @if (row.resolutionNote) { · „{{ row.resolutionNote }}" }
                </span>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty">Nicio raportare.</td></tr>
        </ng-template>
      </p-table>

      <p-dialog
        [(visible)]="dialogVisible"
        [modal]="true"
        [closable]="!saving()"
        [style]="{ width: '480px' }"
        header="Confirmă acțiunea + rezolvă"
      >
        @if (dialog(); as d) {
          <div class="form">
            <p class="form__lede">
              Acțiune: <strong>{{ actionLabel(d.action) }}</strong> pe
              <code>{{ d.report.targetType }}</code>
            </p>
            @if (d.action === 'hide_post' || d.action === 'delete_thread') {
              <label>
                <span>Motiv (vizibil utilizatorului afectat)</span>
                <textarea
                  class="native-textarea"
                  rows="3"
                  [ngModel]="d.actionReason"
                  (ngModelChange)="patchDialog('actionReason', $event)"
                  placeholder="ex. Mesaj off-topic / limbaj inadecvat"
                ></textarea>
              </label>
            }
            <label>
              <span>Notă internă (opțional)</span>
              <input
                pInputText
                type="text"
                [ngModel]="d.resolutionNote"
                (ngModelChange)="patchDialog('resolutionNote', $event)"
                placeholder="Pentru istoric mod"
              />
            </label>
            @if (error()) {
              <p class="err">{{ error() }}</p>
            }
          </div>
        }
        <ng-template pTemplate="footer">
          <button pButton type="button" severity="secondary" [disabled]="saving()" (click)="closeDialog()" label="Anulează"></button>
          <button pButton type="button" [disabled]="!canSubmit() || saving()" (click)="confirmResolve()" [label]="saving() ? 'Se aplică...' : 'Aplică + Rezolvă'"></button>
        </ng-template>
      </p-dialog>
    </main>
  `,
  styles: [
    `
      .admin { padding: 24px 32px; max-width: 1280px; margin: 0 auto; }
      .admin__head h1 { margin: 4px 0 6px; }
      .admin__back { font-size: 12px; color: var(--p-text-muted-color); text-decoration: none; }
      .admin__meta { color: var(--p-text-muted-color); font-size: 13px; margin: 0; }
      .admin__filters { display: flex; gap: 12px; align-items: center; margin: 16px 0; flex-wrap: wrap; }

      tr.is-resolved { opacity: 0.7; }
      .badge {
        display: inline-block;
        padding: 2px 8px;
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-radius: 2px;
        background: #fde68a;
        color: #92400e;
      }
      .badge[data-st='resolved_action_taken'] { background: #d1fae5; color: #065f46; }
      .badge[data-st='resolved_no_action'] { background: #e5e7eb; color: #374151; }
      .badge[data-st='duplicate'] { background: #ede9fe; color: #5b21b6; }
      .badge[data-st='reviewing'] { background: #dbeafe; color: #1e40af; }

      .strong { font-weight: 600; margin-top: 4px; }
      .muted { color: var(--p-text-muted-color); font-size: 12px; }
      .excerpt { margin-top: 4px; font-style: italic; }
      .reason { max-width: 280px; white-space: pre-wrap; word-break: break-word; }
      .link-out { display: inline-block; margin-top: 4px; font-size: 11px; }
      .actions { display: flex; flex-direction: column; gap: 4px; }
      .empty { text-align: center; color: var(--p-text-muted-color); padding: 30px; }
      .form { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
      .form__lede { margin: 0 0 6px; }
      .form label { display: flex; flex-direction: column; gap: 4px; }
      .form label span { font-size: 12px; color: var(--p-text-muted-color); }
      .native-textarea {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--p-inputtext-border-color, #ccc);
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
      }
      .err { color: #e8665b; font-size: 13px; margin: 0; }
      code { font-family: var(--font-mono, monospace); font-size: 12px; }
    `,
  ],
})
export class ReportsAdminPage {
  private readonly reports = inject(ReportsAdminService);

  readonly pageSize = 25;
  readonly items = signal<ReportRow[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly status = signal<ReportStatus | undefined>('open');
  readonly targetType = signal<ReportTarget | undefined>(undefined);
  readonly loading = signal(true);

  readonly dialog = signal<ResolveDialogState | null>(null);
  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly statusOptions = [
    { label: 'Deschise', value: 'open' as ReportStatus },
    { label: 'În review', value: 'reviewing' as ReportStatus },
    { label: 'Rezolvate cu acțiune', value: 'resolved_action_taken' as ReportStatus },
    { label: 'Rezolvate fără acțiune', value: 'resolved_no_action' as ReportStatus },
    { label: 'Duplicate', value: 'duplicate' as ReportStatus },
  ];
  readonly targetOptions = [
    { label: 'Forum post', value: 'forum_post' as ReportTarget },
    { label: 'Forum thread', value: 'forum_thread' as ReportTarget },
    { label: 'Anunț Bazar', value: 'listing' as ReportTarget },
    { label: 'Mesaj chat', value: 'message' as ReportTarget },
    { label: 'Review echipament', value: 'gear_review' as ReportTarget },
    { label: 'Profil user', value: 'user_profile' as ReportTarget },
  ];

  constructor() {
    void this.fetch();
  }

  setStatus(s?: ReportStatus): void {
    this.status.set(s ?? undefined);
    this.page.set(1);
    void this.fetch();
  }

  setTarget(t?: ReportTarget): void {
    this.targetType.set(t ?? undefined);
    this.page.set(1);
    void this.fetch();
  }

  onLazy(ev: { first: number; rows: number }): void {
    const nextPage = Math.floor(ev.first / ev.rows) + 1;
    if (nextPage !== this.page()) {
      this.page.set(nextPage);
      void this.fetch();
    }
  }

  isOpen(row: ReportRow): boolean {
    return row.status === 'open' || row.status === 'reviewing';
  }

  link(row: ReportRow): string | null {
    if (row.targetType === 'forum_post' && row.targetSnapshot?.slug) {
      return `${this.siteRoot()}/forum/cat/${row.targetSnapshot.slug}`;
    }
    if (row.targetType === 'forum_thread' && row.targetSnapshot?.slug) {
      return `${this.siteRoot()}/forum/cat/${row.targetSnapshot.slug}`;
    }
    if (row.targetType === 'listing' && row.targetSnapshot?.slug) {
      return `${this.siteRoot()}/bazar/${row.targetSnapshot.slug}`;
    }
    if (row.targetType === 'user_profile' && row.targetSnapshot?.slug) {
      return `${this.siteRoot()}/autor/${row.targetSnapshot.slug}`;
    }
    return null;
  }

  private siteRoot(): string {
    return environment.apiBaseUrl.replace(/\/api$/, '').replace(/:3000$/, ':4200');
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('ro', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  statusLabel(s: ReportStatus): string {
    return (
      this.statusOptions.find((o) => o.value === s)?.label ?? s
    );
  }

  actionLabel(a: ResolveAction): string {
    switch (a) {
      case 'hide_post':
        return 'Ascunde postare';
      case 'lock_thread':
        return 'Blochează thread';
      case 'delete_thread':
        return 'Șterge thread';
      default:
        return 'Fără acțiune';
    }
  }

  openResolve(report: ReportRow, action: ResolveAction): void {
    this.dialog.set({
      report,
      action,
      actionReason: '',
      resolutionNote: '',
    });
    this.error.set(null);
    this.dialogVisible.set(true);
  }

  patchDialog<K extends keyof ResolveDialogState>(
    key: K,
    value: ResolveDialogState[K],
  ): void {
    const cur = this.dialog();
    if (!cur) return;
    this.dialog.set({ ...cur, [key]: value });
  }

  closeDialog(): void {
    if (this.saving()) return;
    this.dialogVisible.set(false);
    this.dialog.set(null);
  }

  canSubmit(): boolean {
    const d = this.dialog();
    if (!d) return false;
    if (d.action === 'hide_post' || d.action === 'delete_thread') {
      return d.actionReason.trim().length >= 2;
    }
    return true;
  }

  async confirmResolve(): Promise<void> {
    const d = this.dialog();
    if (!d || !this.canSubmit() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.reports.resolve(d.report.id, {
        resolution: 'resolved_action_taken',
        action: d.action,
        actionReason: d.actionReason.trim() || undefined,
        resolutionNote: d.resolutionNote.trim() || undefined,
      });
      this.dialogVisible.set(false);
      this.dialog.set(null);
      await this.fetch();
    } catch (err) {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        'Acțiunea a eșuat.';
      this.error.set(msg);
    } finally {
      this.saving.set(false);
    }
  }

  async quickResolve(
    row: ReportRow,
    resolution: 'resolved_no_action' | 'duplicate',
  ): Promise<void> {
    if (
      !confirm(
        resolution === 'duplicate'
          ? 'Marchezi acest raport ca duplicat?'
          : 'Marchezi acest raport ca fără acțiune?',
      )
    ) {
      return;
    }
    try {
      await this.reports.resolve(row.id, { resolution, action: 'none' });
      await this.fetch();
    } catch (err) {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        'Acțiunea a eșuat.';
      alert(msg);
    }
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.reports.list({
        status: this.status(),
        targetType: this.targetType(),
        page: this.page(),
        pageSize: this.pageSize,
      });
      this.items.set(res.items);
      this.totalCount.set(res.totalCount);
    } catch (err) {
      console.error('[reports] list failed', err);
      this.items.set([]);
      this.totalCount.set(0);
    } finally {
      this.loading.set(false);
    }
  }
}
