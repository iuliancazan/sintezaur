import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'ws-toasts',
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <button
          type="button"
          class="toast"
          [class.toast--error]="toast.kind === 'error'"
          [class.toast--success]="toast.kind === 'success'"
          (click)="toastService.dismiss(toast.id)"
        >
          {{ toast.message }}
        </button>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      left: 50%;
      bottom: 28px;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      z-index: 1000;
      width: min(480px, calc(100vw - 32px));
    }
    .toast {
      width: 100%;
      padding: 13px 18px;
      border-radius: 12px;
      border: 1px solid var(--ws-card-border);
      background: #161616;
      color: var(--ws-text);
      font-family: var(--ws-font-display);
      font-size: 15px;
      line-height: 1.35;
      text-align: left;
      cursor: pointer;
    }
    .toast--error {
      border-color: #7a2e2e;
      background: #1d0e0e;
    }
    .toast--success {
      border-color: #2e5a33;
      background: #0e1a10;
    }
  `,
})
export class ToastsComponent {
  protected readonly toastService = inject(ToastService);
}
