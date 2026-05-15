import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Fixed-bottom-right toast stack. Sits in the root shell so toasts can
 * be triggered from anywhere via `ToastService.show()`. Animations are
 * pure CSS (slide-in from the right).
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="region" aria-live="polite" aria-label="Notificări">
      @for (t of toasts(); track t.id) {
        <div class="toast" [attr.data-kind]="t.kind">
          <div class="toast__icon" aria-hidden="true">{{ iconFor(t.kind) }}</div>
          <div class="toast__copy">
            <p class="toast__body">{{ t.body }}</p>
            @if (t.detail) {
              <p class="toast__detail">{{ t.detail }}</p>
            }
          </div>
          <button
            class="toast__close"
            type="button"
            aria-label="Închide notificarea"
            (click)="dismiss(t.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: contents; }
      .toasts {
        position: fixed;
        right: 16px;
        bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1100;
        pointer-events: none;
        max-width: 360px;
      }
      .toast {
        pointer-events: auto;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 10px 12px;
        border-radius: 8px;
        background: var(--surface);
        border: 1px solid var(--line);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        animation: toast-slide-in 220ms ease-out;
      }
      .toast[data-kind='success'] { border-left: 3px solid #2e7d32; }
      .toast[data-kind='info']    { border-left: 3px solid #1976d2; }
      .toast[data-kind='warn']    { border-left: 3px solid #ed6c02; }
      .toast[data-kind='error']   { border-left: 3px solid #c62828; }
      .toast__icon {
        font-size: 18px;
        line-height: 1;
        margin-top: 1px;
      }
      .toast__copy { flex: 1; min-width: 0; }
      .toast__body {
        margin: 0;
        font-size: 14px;
        line-height: 1.35;
        color: var(--ink);
      }
      .toast__detail {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 1.35;
        color: var(--ink-soft);
      }
      .toast__close {
        background: transparent;
        border: none;
        color: var(--ink-soft);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
      }
      .toast__close:hover { color: var(--ink); }
      @keyframes toast-slide-in {
        from { transform: translateX(20px); opacity: 0; }
        to   { transform: translateX(0); opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .toast { animation: none; }
      }
      @media (max-width: 600px) {
        .toasts { left: 16px; right: 16px; max-width: none; }
      }
    `,
  ],
})
export class ToastContainer {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  iconFor(kind: 'info' | 'success' | 'warn' | 'error'): string {
    return (
      { info: 'i', success: '✓', warn: '!', error: '×' }[kind] ?? ''
    );
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
