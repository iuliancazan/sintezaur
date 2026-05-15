import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../ui/toast.service';

/**
 * `/cont/date` — GDPR / RGPD self-service per spec §11 foundation.
 * Two actions:
 *   - Export: downloads a JSON file with every row about the user
 *     (Art. 15 — right of access).
 *   - Delete: irreversible account deletion + PII anonymization
 *     (Art. 17 — right to erasure). Double-confirm + magic phrase
 *     so it can't fire by accident.
 */
@Component({
  selector: 'app-account-data-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="data">
      <header class="data__head">
        <a routerLink="/cont" class="data__back">← Înapoi la cont</a>
        <h1>Datele tale</h1>
        <p class="data__lede">
          Conform RGPD ai dreptul să descarci o copie a datelor tale
          sau să-ți ștergi contul.
        </p>
      </header>

      <section class="card">
        <h2>Descarcă o copie</h2>
        <p>
          Exportul include profilul tău, anunțurile, mesajele,
          tranzacțiile, review-urile, colecția, postările pe forum,
          articolele scrise și preferințele. Fișier JSON, pentru uz
          personal sau pentru migrare.
        </p>
        <button
          type="button"
          class="btn"
          (click)="exportData()"
          [disabled]="busy() !== 'idle'"
        >
          {{ busy() === 'export' ? 'Se generează…' : 'Descarcă datele (JSON)' }}
        </button>
      </section>

      <section class="card card--danger">
        <h2>Șterge contul</h2>
        <p>
          Ștergerea este <strong>ireversibilă</strong>. Conținutul
          public (anunțuri vândute, postări forum, articole publicate)
          rămâne pentru integritatea tranzacțiilor și discuțiilor —
          dar e marcat „[utilizator șters]" și nu mai poate fi asociat
          cu tine. Profilul, avatarul, email-ul, telefonul și
          link-urile sociale sunt eliminate definitiv.
        </p>
        <p class="muted">
          Anunțurile active sunt scoase din listă; mesajele tale rămân
          în conversațiile existente cu „[utilizator șters]" ca
          expeditor.
        </p>

        @if (confirmStep() === 'idle') {
          <button
            type="button"
            class="btn btn--danger"
            (click)="confirmStep.set('typing')"
            [disabled]="busy() !== 'idle'"
          >
            Vreau să-mi șterg contul
          </button>
        } @else {
          <p class="confirm-prompt">
            Pentru confirmare, scrie <code>{{ magicPhrase }}</code>
            în câmpul de mai jos:
          </p>
          <input
            type="text"
            class="confirm-input"
            [class.is-match]="phraseInput() === magicPhrase"
            [value]="phraseInput()"
            (input)="onPhraseInput($event)"
            autocomplete="off"
            spellcheck="false"
            placeholder="copiază exact fraza de sus"
          />
          <div class="confirm-actions">
            <button
              type="button"
              class="btn btn--ghost"
              (click)="cancelDelete()"
              [disabled]="busy() === 'delete'"
            >
              Anulează
            </button>
            <button
              type="button"
              class="btn btn--danger"
              (click)="deleteAccount()"
              [disabled]="phraseInput() !== magicPhrase || busy() === 'delete'"
            >
              {{ busy() === 'delete' ? 'Se șterge…' : 'Șterge contul definitiv' }}
            </button>
          </div>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .data {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px var(--gutter-x);
      }
      .data__head { margin-bottom: 24px; }
      .data__back {
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
        text-decoration: none;
      }
      .data__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 40px);
        margin: 4px 0 8px;
      }
      .data__lede { color: var(--fg-muted); margin: 0; font-size: 14px; }
      .card {
        background: var(--bg-elev);
        border: 1px solid var(--line);
        padding: 24px;
        margin-bottom: 16px;
      }
      .card h2 { margin: 0 0 8px; font-size: 18px; }
      .card p { margin: 6px 0; line-height: 1.55; }
      .muted { color: var(--fg-muted); font-size: 13px; }
      .card--danger { border-color: rgba(204, 68, 68, 0.5); }
      .card--danger h2 { color: var(--danger, #c44); }
      .btn {
        padding: 10px 18px;
        background: var(--bg-card);
        border: 1px solid var(--line);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        margin-top: 12px;
      }
      .btn:hover:not(:disabled) { border-color: var(--accent); }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn--danger {
        background: rgba(204, 68, 68, 0.1);
        color: var(--danger, #c44);
        border-color: rgba(204, 68, 68, 0.5);
      }
      .btn--danger:hover:not(:disabled) {
        background: rgba(204, 68, 68, 0.2);
        border-color: var(--danger, #c44);
      }
      .btn--ghost { background: transparent; }
      .confirm-prompt {
        margin: 16px 0 6px;
        font-weight: 500;
      }
      .confirm-prompt code {
        background: var(--bg-card);
        padding: 2px 6px;
        font-family: var(--font-mono);
        font-size: 13px;
        border: 1px solid var(--line);
      }
      .confirm-input {
        width: 100%;
        background: var(--bg-card);
        border: 1px solid var(--line);
        color: var(--fg);
        padding: 10px 12px;
        font: inherit;
        font-family: var(--font-mono);
      }
      .confirm-input.is-match { border-color: var(--danger, #c44); }
      .confirm-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class AccountDataPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly magicPhrase = 'ȘTERGE CONTUL';
  readonly busy = signal<'idle' | 'export' | 'delete'>('idle');
  readonly confirmStep = signal<'idle' | 'typing'>('idle');
  readonly phraseInput = signal('');

  async exportData(): Promise<void> {
    this.busy.set('export');
    try {
      const data = await this.auth.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sintezaur-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.toast.success('Datele tale au fost descărcate.');
    } catch {
      this.toast.error('Exportul nu a reușit. Încearcă din nou.');
    } finally {
      this.busy.set('idle');
    }
  }

  onPhraseInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.phraseInput.set(target.value);
  }

  cancelDelete(): void {
    this.confirmStep.set('idle');
    this.phraseInput.set('');
  }

  async deleteAccount(): Promise<void> {
    if (this.phraseInput() !== this.magicPhrase) return;
    this.busy.set('delete');
    try {
      await this.auth.deleteAccount();
      this.toast.success('Contul tău a fost șters.');
      await this.router.navigateByUrl('/');
    } catch {
      this.toast.error('Ștergerea nu a reușit. Contactează suportul.');
      this.busy.set('idle');
    }
  }
}
