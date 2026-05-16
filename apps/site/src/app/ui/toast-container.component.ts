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
        gap: 12px;
        align-items: flex-start;
        padding: 12px 14px;
        background: var(--bg-card);
        border: 1px solid var(--line-strong);
        box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.45);
        animation: toast-slide-in 220ms ease-out;
        min-width: 280px;
      }
      [data-theme='light'] .toast {
        box-shadow: 0 12px 32px -8px rgba(60, 50, 20, 0.25);
      }
      .toast[data-kind='success'] {
        border-left: 3px solid oklch(0.62 0.16 145);
      }
      .toast[data-kind='info'] {
        border-left: 3px solid var(--accent);
      }
      .toast[data-kind='warn'] {
        border-left: 3px solid oklch(0.65 0.14 60);
      }
      .toast[data-kind='error'] {
        border-left: 3px solid oklch(0.62 0.18 28);
      }
      .toast__icon {
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
        margin-top: 2px;
        width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        flex-shrink: 0;
      }
      .toast[data-kind='success'] .toast__icon {
        background: oklch(0.62 0.16 145);
        color: oklch(0.98 0 0);
      }
      .toast[data-kind='info'] .toast__icon {
        background: var(--accent);
        color: var(--accent-fg);
      }
      .toast[data-kind='warn'] .toast__icon {
        background: oklch(0.65 0.14 60);
        color: oklch(0.98 0 0);
      }
      .toast[data-kind='error'] .toast__icon {
        background: oklch(0.62 0.18 28);
        color: oklch(0.98 0 0);
      }
      .toast__copy { flex: 1; min-width: 0; }
      .toast__body {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.35;
        color: var(--fg);
      }
      .toast__detail {
        margin: 4px 0 0;
        font-size: 12px;
        line-height: 1.4;
        color: var(--fg-muted);
      }
      .toast__close {
        background: transparent;
        border: 0;
        color: var(--fg-muted);
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        padding: 0 2px;
        margin-left: 4px;
        flex-shrink: 0;
        min-height: auto;
        min-width: auto;
      }
      .toast__close:hover { color: var(--fg); }
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
