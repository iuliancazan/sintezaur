import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import {
  AdminClosureService,
  type CurrencyRateRow,
} from './admin-closure.service';

/**
 * `/currency-rates` — manual rate management per spec §7.12.
 * Listă completă (newest first) + form pentru rată nouă. MVP: doar
 * EUR (RON e implicit 1). Fiecare submit creează o nouă linie cu
 * `valid_from = now()` — vechile rămân pentru istoric.
 */
@Component({
  selector: 'app-currency-rates-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="admin">
      <header class="admin__head">
        <a routerLink="/" class="admin__back">← Înapoi la dashboard</a>
        <h1>Curs valutar</h1>
        <p class="admin__meta">
          Rate manuale EUR→RON (spec §7.12). Anunțurile listate în EUR
          afișează prețul convertit cu rata curentă; modifică aici când
          BNR-ul publică o nouă rată semnificativ diferită. Istoricul
          se păstrează — nu modificăm linii existente, doar adăugăm noi.
        </p>
      </header>

      <section class="card">
        <h2>Rată curentă</h2>
        @if (active(); as a) {
          <p class="active">
            <strong>1 EUR = {{ a.rateToRon }} RON</strong>
            <span class="muted"> · valabil de la {{ formatDate(a.validFrom) }}</span>
          </p>
        } @else {
          <p class="muted">Nicio rată setată încă.</p>
        }
      </section>

      <section class="card">
        <h2>Adaugă rată nouă</h2>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-row">
            <label>
              <span>Monedă</span>
              <select formControlName="currencyCode">
                <option value="eur">EUR</option>
              </select>
            </label>
            <label>
              <span>1 EUR = X RON</span>
              <input
                type="text"
                formControlName="rateToRon"
                inputmode="decimal"
                placeholder="ex. 5.0700"
              />
            </label>
            <label class="grow">
              <span>Notă (opțional)</span>
              <input
                type="text"
                formControlName="note"
                maxlength="200"
                placeholder="sursa, motivul, etc."
              />
            </label>
          </div>
          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
          <button
            type="submit"
            class="btn"
            [disabled]="form.invalid || saving()"
          >
            {{ saving() ? 'Se salvează…' : 'Salvează rată' }}
          </button>
        </form>
      </section>

      <section class="card">
        <h2>Istoric</h2>
        <p-table
          [value]="rows()"
          [loading]="loading()"
          responsiveLayout="scroll"
          stripedRows
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 100px;">Monedă</th>
              <th style="width: 140px;">Rată RON</th>
              <th style="width: 200px;">Valabil de la</th>
              <th>Notă</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td><strong>{{ row.currencyCode | uppercase }}</strong></td>
              <td>{{ row.rateToRon }}</td>
              <td>{{ formatDate(row.validFrom) }}</td>
              <td>{{ row.note ?? '—' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="4">Niciun curs salvat încă.</td></tr>
          </ng-template>
        </p-table>
      </section>
    </main>
  `,
  styles: [
    `
      .admin { padding: 24px 32px; max-width: 960px; margin: 0 auto; }
      .admin__head h1 { margin: 4px 0 6px; }
      .admin__back { font-size: 12px; color: var(--p-text-muted-color); text-decoration: none; }
      .admin__meta { font-size: 13px; color: var(--p-text-muted-color); margin: 0 0 24px; max-width: 60ch; }
      .card {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        padding: 20px 24px;
        margin-bottom: 16px;
      }
      .card h2 { margin: 0 0 12px; font-size: 16px; }
      .active { margin: 0; font-size: 15px; }
      .muted { color: var(--p-text-muted-color); font-size: 12px; }
      .form-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .form-row label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11px;
        color: var(--p-text-muted-color);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .form-row .grow { flex: 1; min-width: 240px; }
      .form-row input,
      .form-row select {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
        color: var(--p-text-color);
        padding: 8px 10px;
        font-size: 13px;
      }
      .btn {
        background: var(--p-primary-color);
        color: var(--p-primary-contrast-color);
        border: none;
        padding: 8px 18px;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .err { color: var(--p-red-500, #c44); font-size: 13px; margin: 8px 0; }
    `,
  ],
})
export class CurrencyRatesPage {
  private readonly service = inject(AdminClosureService);
  private readonly fb = inject(FormBuilder);

  readonly rows = signal<CurrencyRateRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    currencyCode: ['eur' as 'eur', Validators.required],
    rateToRon: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{1,3}(\.\d{1,4})?$/),
      ],
    ],
    note: ['', [Validators.maxLength(200)]],
  });

  constructor() {
    this.refresh();
  }

  active(): { rateToRon: string; validFrom: string } | null {
    const eur = this.rows().find((r) => r.currencyCode === 'eur');
    return eur ? { rateToRon: eur.rateToRon, validFrom: eur.validFrom } : null;
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.service.listCurrencyRates();
      this.rows.set(rows);
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    try {
      const created = await this.service.createCurrencyRate({
        currencyCode: v.currencyCode,
        rateToRon: v.rateToRon,
        note: v.note?.trim() || undefined,
      });
      this.rows.update((cur) => [created, ...cur]);
      this.form.reset({ currencyCode: 'eur', rateToRon: '', note: '' });
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        this.error.set(
          (err.error as { message?: string })?.message ??
            'Eroare la salvare.',
        );
      } else {
        this.error.set('Eroare la salvare.');
      }
    } finally {
      this.saving.set(false);
    }
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
