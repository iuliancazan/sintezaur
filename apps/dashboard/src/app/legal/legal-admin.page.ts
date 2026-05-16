import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import {
  LegalAdminService,
  type LegalPageAdminRow,
} from './legal-admin.service';

const SLUG_LABELS: Record<string, string> = {
  termeni: 'Termeni și Condiții',
  confidentialitate: 'Confidențialitate (GDPR)',
  cookies: 'Cookies',
  'regulament-forum': 'Regulament forum',
  despre: 'Despre',
  contact: 'Contact (intro)',
};

/**
 * Dashboard `/legal` — list of the 6 static slugs + inline edit modal.
 * Markdown bodies are edited as plain text (no live preview in M6-A;
 * could add a side-by-side render in M6-B if useful). `updatedAt`
 * column shows when the page was last touched.
 */
@Component({
  selector: 'app-legal-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Pagini legale</h1>
        <p class="admin__meta">
          Editare texte pentru cele 6 pagini statice (Termeni,
          Confidențialitate, Cookies, Regulament forum, Despre,
          Contact). Markdown. Modificările apar imediat pe site.
        </p>
      </header>

      <p-table
        [value]="items()"
        [loading]="loading()"
        responsiveLayout="scroll"
        stripedRows
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 220px;">Pagină</th>
            <th>Titlu</th>
            <th style="width: 160px;">Ultima actualizare</th>
            <th style="width: 140px;">Acțiuni</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              <strong>{{ labelFor(row.slug) }}</strong>
              <div class="muted">
                <a [href]="'/' + row.slug" target="_blank" rel="noopener">
                  /{{ row.slug }} ↗
                </a>
              </div>
            </td>
            <td>{{ row.title }}</td>
            <td>{{ formatDate(row.updatedAt) }}</td>
            <td class="actions">
              <button
                pButton
                type="button"
                size="small"
                label="Editează"
                (click)="edit(row)"
              ></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="4">Nicio pagină — verifică seed-ul 9009.</td>
          </tr>
        </ng-template>
      </p-table>

      @if (editing(); as row) {
        <div class="editor-backdrop" (click)="closeIfBackdrop($event)">
          <div class="editor">
            <header class="editor__head">
              <h2>{{ labelFor(row.slug) }}</h2>
              <button
                class="editor__close"
                type="button"
                (click)="cancel()"
                aria-label="Închide"
              >
                ×
              </button>
            </header>

            @if (saveError()) {
              <div class="form-error">{{ saveError() }}</div>
            }

            <form
              class="editor__form"
              [formGroup]="form"
              (ngSubmit)="save()"
              novalidate
            >
              <label class="field">
                <span class="field__label">Titlu</span>
                <input
                  pInputText
                  formControlName="title"
                  maxlength="200"
                />
              </label>

              <label class="field">
                <span class="field__label">
                  Meta description (SEO)
                  <span class="field__hint">opțional, max 300 caractere</span>
                </span>
                <input
                  pInputText
                  formControlName="metaDescription"
                  maxlength="300"
                />
              </label>

              <label class="field">
                <span class="field__label">
                  Body (Markdown)
                  <span class="field__hint">
                    suportă #, ##, ###, **bold**, listare cu -, link
                    [text](url), tabele |a|b|, cod cu \`
                  </span>
                </span>
                <textarea
                  formControlName="bodyMd"
                  rows="20"
                  class="editor__textarea"
                ></textarea>
              </label>

              <details class="editor__en">
                <summary>🇬🇧 English translation (optional)</summary>
                <p class="editor__en-note">
                  When empty, the /en page falls back to the Romanian
                  body and shows a "translation pending" banner.
                </p>
                <label class="field">
                  <span class="field__label">Title (EN)</span>
                  <input
                    pInputText
                    formControlName="titleEn"
                    maxlength="200"
                  />
                </label>
                <label class="field">
                  <span class="field__label">
                    Meta description (EN)
                    <span class="field__hint">optional, max 300 chars</span>
                  </span>
                  <input
                    pInputText
                    formControlName="metaDescriptionEn"
                    maxlength="300"
                  />
                </label>
                <label class="field">
                  <span class="field__label">Body (Markdown, EN)</span>
                  <textarea
                    formControlName="bodyMdEn"
                    rows="20"
                    class="editor__textarea"
                  ></textarea>
                </label>
              </details>

              <div class="editor__actions">
                <button
                  pButton
                  type="button"
                  severity="secondary"
                  label="Renunță"
                  (click)="cancel()"
                ></button>
                <button
                  pButton
                  type="submit"
                  label="Salvează"
                  [disabled]="form.invalid || saving()"
                ></button>
              </div>
            </form>
          </div>
        </div>
      }
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
      .muted {
        font-size: 12px;
        color: var(--p-text-muted-color);
      }
      .muted a { color: inherit; text-decoration: underline; }
      .actions { display: flex; gap: 8px; }
      .editor-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 40px 20px;
        z-index: 100;
        overflow-y: auto;
      }
      .editor {
        background: var(--p-content-background);
        color: var(--p-text-color);
        border-radius: 10px;
        width: min(900px, 100%);
        padding: 24px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
      }
      .editor__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .editor__head h2 { margin: 0; font-size: 20px; }
      .editor__close {
        background: transparent;
        border: none;
        color: var(--p-text-color);
        font-size: 26px;
        cursor: pointer;
        line-height: 1;
      }
      .editor__form { display: flex; flex-direction: column; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 4px; }
      .field__label {
        font-size: 13px;
        font-weight: 600;
        display: flex;
        gap: 8px;
        align-items: baseline;
        flex-wrap: wrap;
      }
      .field__hint {
        font-weight: normal;
        font-size: 12px;
        color: var(--p-text-muted-color);
      }
      .editor__textarea {
        width: 100%;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 13px;
        padding: 10px;
        border: 1px solid var(--p-content-border-color);
        border-radius: 6px;
        background: var(--p-inputtext-background);
        color: var(--p-inputtext-color);
        resize: vertical;
        min-height: 320px;
      }
      .editor__actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 8px;
      }
      .form-error {
        padding: 10px;
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.4);
        color: #b71c1c;
        border-radius: 6px;
        margin-bottom: 8px;
      }
      .editor__en {
        border: 1px solid var(--p-content-border-color);
        border-radius: 6px;
        padding: 10px 14px;
        background: color-mix(in oklab, var(--p-content-background) 96%, black);
      }
      .editor__en > summary {
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        padding: 4px 0;
      }
      .editor__en[open] > summary { margin-bottom: 8px; }
      .editor__en-note {
        font-size: 12px;
        color: var(--p-text-muted-color);
        margin: 0 0 12px;
      }
    `,
  ],
})
export class LegalAdminPage {
  private readonly service = inject(LegalAdminService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<LegalPageAdminRow[]>([]);
  readonly loading = signal(true);
  readonly editing = signal<LegalPageAdminRow | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    bodyMd: ['', [Validators.required, Validators.minLength(10)]],
    metaDescription: [''],
    titleEn: [''],
    bodyMdEn: [''],
    metaDescriptionEn: [''],
  });

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.service.list();
      this.items.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  labelFor(slug: string): string {
    return SLUG_LABELS[slug] ?? slug;
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

  edit(row: LegalPageAdminRow): void {
    this.editing.set(row);
    this.saveError.set(null);
    this.form.reset({
      title: row.title,
      bodyMd: row.bodyMd,
      metaDescription: row.metaDescription ?? '',
      titleEn: row.titleEn ?? '',
      bodyMdEn: row.bodyMdEn ?? '',
      metaDescriptionEn: row.metaDescriptionEn ?? '',
    });
  }

  cancel(): void {
    this.editing.set(null);
    this.saveError.set(null);
  }

  closeIfBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.cancel();
  }

  async save(): Promise<void> {
    const row = this.editing();
    if (!row || this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const normalize = (v: string | null | undefined) =>
        v && v.trim() ? v.trim() : null;
      await this.service.update(row.slug, {
        title: value.title,
        bodyMd: value.bodyMd,
        metaDescription: normalize(value.metaDescription),
        titleEn: normalize(value.titleEn),
        bodyMdEn: normalize(value.bodyMdEn),
        metaDescriptionEn: normalize(value.metaDescriptionEn),
      });
      await this.refresh();
      this.cancel();
    } catch (err) {
      this.saveError.set(
        err && typeof err === 'object' && 'status' in err
          ? `Salvare eșuată (HTTP ${(err as { status: number }).status}).`
          : 'A apărut o eroare neașteptată.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
