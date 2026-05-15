import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { AuthService } from '../auth/auth.service';
import {
  ReportDialogComponent,
  type ReportSubmit,
} from '../forum/report-dialog.component';
import { I18nService } from '../i18n/i18n.service';
import { ToastService } from '../ui/toast.service';
import { ReportsService, type ReportTargetType } from './reports.service';

/**
 * Inline "Raportează" button + bundled dialog. Reuses the existing
 * `<app-report-dialog>` from forum (M5-G) — same 5 categories + free
 * reason. Hidden for unauthenticated visitors and for the author of
 * the target (server also rejects self-reports).
 *
 * Usage:
 *   <app-report-button
 *     targetType="listing"
 *     [targetId]="listing.id"
 *     [authorUserId]="listing.sellerId"
 *   />
 */
@Component({
  selector: 'app-report-button',
  standalone: true,
  imports: [ReportDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <button
        type="button"
        class="report-btn"
        [disabled]="busy()"
        (click)="open()"
      >
        {{ buttonLabel() }}
      </button>
    }
    <app-report-dialog
      [open]="dialogOpen()"
      mode="report"
      [busy]="busy()"
      [error]="error()"
      (submitReport)="onSubmit($event)"
      (cancel)="close()"
    />
  `,
  styles: [
    `
      .report-btn {
        background: transparent;
        border: 1px solid var(--line);
        color: var(--fg-muted);
        padding: 6px 12px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .report-btn:hover:not(:disabled) {
        border-color: var(--danger, #c44);
        color: var(--danger, #c44);
      }
      .report-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    `,
  ],
})
export class ReportButtonComponent {
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly targetType = input.required<ReportTargetType>();
  readonly targetId = input.required<string>();
  /** Author of the target (hides button for them). Optional — server-side rejects self-report regardless. */
  readonly authorUserId = input<string | null>(null);
  readonly label = input<string>('Raportează');

  readonly dialogOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  private startedAt = 0;

  readonly visible = computed(() => {
    const cur = this.auth.currentUser();
    if (!cur) return false;
    const author = this.authorUserId();
    if (author && author === cur.id) return false;
    return true;
  });

  buttonLabel(): string {
    return this.label();
  }

  open(): void {
    this.error.set(null);
    this.startedAt = Date.now();
    this.dialogOpen.set(true);
  }

  close(): void {
    this.dialogOpen.set(false);
  }

  async onSubmit(payload: ReportSubmit): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.reports.submit({
        targetType: this.targetType(),
        targetId: this.targetId(),
        reason: `[${payload.category.toUpperCase()}] ${payload.reason}`,
        hp: '',
        formStartedAt: this.startedAt,
      });
      this.dialogOpen.set(false);
      this.toast.success(this.i18n.t('forum.report.thanks') || 'Raport trimis. Mulțumim!');
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 409) {
          this.error.set('Ai raportat deja acest conținut.');
        } else if (err.status === 400) {
          this.error.set(
            (err.error as { message?: string })?.message ??
              'Date invalide. Verifică textul.',
          );
        } else {
          this.error.set('Eroare la trimitere. Încearcă din nou.');
        }
      } else {
        this.error.set('Eroare la trimitere. Încearcă din nou.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
