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
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import {
  BadgesAdminService,
  type BadgeAdminRow,
  type BadgeCriteriaKind,
  type CreateBadgePayload,
} from './badges-admin.service';

const KINDS: BadgeCriteriaKind[] = [
  'post_count',
  'account_age_days',
  'likes_received',
];
const KIND_LABELS: Record<BadgeCriteriaKind, string> = {
  post_count: 'Postări aprobate (Forum)',
  account_age_days: 'Vechime cont (zile)',
  likes_received: 'Reacții „Util" primite',
};
const CATEGORIES = [
  'activity',
  'membership',
  'content',
  'collection',
  'trade',
  'trust',
] as const;

interface FormState {
  id: string | null;
  key: string;
  nameRo: string;
  nameEn: string;
  category: string;
  descriptionRo: string;
  descriptionEn: string;
  kind: BadgeCriteriaKind;
  threshold: number;
  position: number;
}

const EMPTY_FORM: FormState = {
  id: null,
  key: '',
  nameRo: '',
  nameEn: '',
  category: 'activity',
  descriptionRo: '',
  descriptionEn: '',
  kind: 'post_count',
  threshold: 1,
  position: 0,
};

@Component({
  selector: 'app-badges-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Badges</h1>
        <p class="admin__meta">
          Definește badge-urile pe care le primesc utilizatorii. Cron-ul rulează nightly la 04:00 UTC, iar hook-urile aplică instant la post / like.
        </p>
      </header>

      <div class="admin__filters">
        <button pButton type="button" (click)="openCreate()" label="+ Badge nou"></button>
        <button
          pButton
          type="button"
          severity="secondary"
          [disabled]="sweeping()"
          (click)="onSweep()"
          [label]="sweeping() ? 'Re-evaluare...' : 'Re-evaluează acum'"
        ></button>
        @if (lastSweep() !== null) {
          <span class="admin__meta">Ultima rulare: {{ lastSweep() }} awards.</span>
        }
      </div>

      <p-table [value]="items()" [loading]="loading()" stripedRows responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 240px;">Key</th>
            <th>Nume (RO)</th>
            <th>Categorie</th>
            <th>Criteriu</th>
            <th style="width: 80px;">Pos</th>
            <th style="width: 160px;">Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td><code>{{ row.key }}</code></td>
            <td>
              <strong>{{ row.nameRo }}</strong>
              @if (row.descriptionRo) {
                <div class="muted">{{ row.descriptionRo }}</div>
              }
            </td>
            <td>{{ row.category }}</td>
            <td>
              <code>{{ row.criteria.kind }}</code> ≥ {{ row.criteria.threshold }}
            </td>
            <td>{{ row.position }}</td>
            <td class="actions">
              <button pButton type="button" icon="pi pi-pencil" severity="secondary" size="small" (click)="openEdit(row)" aria-label="Edit"></button>
              <button pButton type="button" icon="pi pi-trash" severity="danger" size="small" (click)="onDelete(row)" aria-label="Delete"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="empty">Nu există badges definite.</td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog
        [(visible)]="dialogVisible"
        [modal]="true"
        [closable]="!saving()"
        [style]="{ width: '560px' }"
        [header]="form().id ? 'Editare badge' : 'Badge nou'"
      >
        <div class="form">
          <label>
            <span>Key (stabil, doar lowercase + _)</span>
            <input
              pInputText
              type="text"
              [ngModel]="form().key"
              (ngModelChange)="patch('key', $event)"
              [disabled]="!!form().id"
              placeholder="ex. first_post"
            />
          </label>
          <div class="row">
            <label>
              <span>Nume RO</span>
              <input pInputText type="text" [ngModel]="form().nameRo" (ngModelChange)="patch('nameRo', $event)" />
            </label>
            <label>
              <span>Nume EN</span>
              <input pInputText type="text" [ngModel]="form().nameEn" (ngModelChange)="patch('nameEn', $event)" />
            </label>
          </div>
          <label>
            <span>Categorie</span>
            <p-select
              [options]="categoryOptions"
              [ngModel]="form().category"
              (ngModelChange)="patch('category', $event)"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
            ></p-select>
          </label>
          <div class="row">
            <label>
              <span>Descriere RO</span>
              <textarea class="native-textarea"rows="2" [ngModel]="form().descriptionRo" (ngModelChange)="patch('descriptionRo', $event)"></textarea>
            </label>
            <label>
              <span>Descriere EN</span>
              <textarea class="native-textarea"rows="2" [ngModel]="form().descriptionEn" (ngModelChange)="patch('descriptionEn', $event)"></textarea>
            </label>
          </div>
          <div class="row">
            <label>
              <span>Kind (cum se acordă)</span>
              <p-select
                [options]="kindOptions"
                [ngModel]="form().kind"
                (ngModelChange)="patch('kind', $event)"
                optionLabel="label"
                optionValue="value"
                appendTo="body"
              ></p-select>
            </label>
            <label>
              <span>Threshold</span>
              <p-inputNumber [ngModel]="form().threshold" (ngModelChange)="patch('threshold', $event)" [min]="1"></p-inputNumber>
            </label>
            <label>
              <span>Position</span>
              <p-inputNumber [ngModel]="form().position" (ngModelChange)="patch('position', $event)" [min]="0"></p-inputNumber>
            </label>
          </div>
          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
        </div>
        <ng-template pTemplate="footer">
          <button pButton type="button" severity="secondary" [disabled]="saving()" (click)="closeDialog()" label="Anulează"></button>
          <button pButton type="button" [disabled]="!canSubmit() || saving()" (click)="onSave()" [label]="saving() ? 'Se salvează...' : 'Salvează'"></button>
        </ng-template>
      </p-dialog>
    </main>
  `,
  styles: [
    `
      .admin { padding: 24px 32px; max-width: 1200px; margin: 0 auto; }
      .admin__head h1 { margin: 4px 0 6px; }
      .admin__back { font-size: 12px; color: var(--p-text-muted-color); text-decoration: none; }
      .admin__meta { color: var(--p-text-muted-color); font-size: 13px; margin: 0; }
      .admin__filters { display: flex; gap: 12px; align-items: center; margin: 16px 0; flex-wrap: wrap; }
      .muted { color: var(--p-text-muted-color); font-size: 12px; margin-top: 4px; }
      .actions { display: inline-flex; gap: 6px; }
      .empty { text-align: center; color: var(--p-text-muted-color); padding: 30px; }
      .form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
      .form label { display: flex; flex-direction: column; gap: 4px; }
      .form label span { font-size: 12px; color: var(--p-text-muted-color); }
      .form .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .err { color: #e8665b; font-size: 13px; margin: 0; }
      code { font-family: var(--font-mono, monospace); font-size: 12px; }
      .native-textarea {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--p-inputtext-border-color, #ccc);
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
      }
      .native-textarea:focus { outline: none; border-color: var(--p-primary-color, #6366f1); }
    `,
  ],
})
export class BadgesAdminPage {
  private readonly badges = inject(BadgesAdminService);

  readonly items = signal<BadgeAdminRow[]>([]);
  readonly loading = signal(true);
  readonly form = signal<FormState>({ ...EMPTY_FORM });
  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly sweeping = signal(false);
  readonly lastSweep = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  readonly kindOptions = KINDS.map((k) => ({ label: KIND_LABELS[k], value: k }));
  readonly categoryOptions = CATEGORIES.map((c) => ({ label: c, value: c }));

  constructor() {
    void this.load();
  }

  patch<K extends keyof FormState>(key: K, value: FormState[K]): void {
    this.form.set({ ...this.form(), [key]: value });
  }

  openCreate(): void {
    this.form.set({ ...EMPTY_FORM });
    this.error.set(null);
    this.dialogVisible.set(true);
  }

  openEdit(row: BadgeAdminRow): void {
    this.form.set({
      id: row.id,
      key: row.key,
      nameRo: row.nameRo,
      nameEn: row.nameEn,
      category: row.category,
      descriptionRo: row.descriptionRo ?? '',
      descriptionEn: row.descriptionEn ?? '',
      kind: row.criteria.kind,
      threshold: row.criteria.threshold,
      position: row.position,
    });
    this.error.set(null);
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    if (this.saving()) return;
    this.dialogVisible.set(false);
  }

  canSubmit(): boolean {
    const f = this.form();
    return (
      f.key.length >= 2 &&
      /^[a-z0-9_]+$/.test(f.key) &&
      f.nameRo.trim().length >= 2 &&
      f.nameEn.trim().length >= 2 &&
      f.threshold >= 1
    );
  }

  async onSave(): Promise<void> {
    if (!this.canSubmit() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const f = this.form();
    try {
      if (f.id) {
        await this.badges.update(f.id, {
          nameRo: f.nameRo,
          nameEn: f.nameEn,
          category: f.category,
          descriptionRo: f.descriptionRo || null,
          descriptionEn: f.descriptionEn || null,
          criteria: { kind: f.kind, threshold: f.threshold },
          position: f.position,
        });
      } else {
        const payload: CreateBadgePayload = {
          key: f.key,
          nameRo: f.nameRo,
          nameEn: f.nameEn,
          category: f.category,
          descriptionRo: f.descriptionRo || null,
          descriptionEn: f.descriptionEn || null,
          criteria: { kind: f.kind, threshold: f.threshold },
          position: f.position,
        };
        await this.badges.create(payload);
      }
      this.dialogVisible.set(false);
      await this.load();
    } catch (err) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(msg ?? 'Salvarea a eșuat.');
    } finally {
      this.saving.set(false);
    }
  }

  async onDelete(row: BadgeAdminRow): Promise<void> {
    if (
      !confirm(
        `Sigur ștergi "${row.nameRo}"? Vor fi șterse și toate award-urile aferente.`,
      )
    ) {
      return;
    }
    try {
      const res = await this.badges.delete(row.id);
      this.items.set(this.items().filter((b) => b.id !== row.id));
      alert(`Șters. ${res.removedAwards} award-uri eliminate.`);
    } catch (err) {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        'Ștergerea a eșuat.';
      alert(msg);
    }
  }

  async onSweep(): Promise<void> {
    if (this.sweeping()) return;
    this.sweeping.set(true);
    try {
      const res = await this.badges.sweep();
      this.lastSweep.set(res.awarded);
    } catch (err) {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ??
        'Re-evaluarea a eșuat.';
      alert(msg);
    } finally {
      this.sweeping.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.badges.list();
      this.items.set(data);
    } catch (err) {
      console.error('[badges] list failed', err);
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
