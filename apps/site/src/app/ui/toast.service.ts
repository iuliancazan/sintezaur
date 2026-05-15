import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'warn' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  body: string;
  /** Optional second line shown smaller under `body`. */
  detail?: string;
  /** ms before auto-dismiss. 0 = stays until manually closed. */
  ttlMs: number;
  createdAt: number;
}

/**
 * Minimal toast notification primitive (M6-C). Avoids a PrimeNG dep
 * for what is a 30-line component. Consumed by the HTTP error
 * interceptor (network / 5xx / 429) and by any flow that wants to
 * surface a non-blocking notice. The container component (in
 * `toast-container.component.ts`) reads the signal and renders.
 *
 * Default TTLs:
 *   info / success — 3500ms
 *   warn           — 5000ms
 *   error          — 6500ms (longer because the body usually matters)
 *
 * Pass `ttlMs: 0` to make a toast sticky (manual dismiss only). Useful
 * for "you're offline" until reconnect.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<readonly Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(
    kind: ToastKind,
    body: string,
    opts: { detail?: string; ttlMs?: number } = {},
  ): number {
    const id = this.nextId++;
    const ttlMs =
      opts.ttlMs ??
      (kind === 'error'
        ? 6500
        : kind === 'warn'
          ? 5000
          : 3500);
    const toast: Toast = {
      id,
      kind,
      body,
      detail: opts.detail,
      ttlMs,
      createdAt: Date.now(),
    };
    this._toasts.set([...this._toasts(), toast]);
    if (ttlMs > 0) {
      setTimeout(() => this.dismiss(id), ttlMs);
    }
    return id;
  }

  info(body: string, opts?: { detail?: string; ttlMs?: number }): number {
    return this.show('info', body, opts);
  }
  success(body: string, opts?: { detail?: string; ttlMs?: number }): number {
    return this.show('success', body, opts);
  }
  warn(body: string, opts?: { detail?: string; ttlMs?: number }): number {
    return this.show('warn', body, opts);
  }
  error(body: string, opts?: { detail?: string; ttlMs?: number }): number {
    return this.show('error', body, opts);
  }

  dismiss(id: number): void {
    this._toasts.set(this._toasts().filter((t) => t.id !== id));
  }

  clear(): void {
    this._toasts.set([]);
  }
}
