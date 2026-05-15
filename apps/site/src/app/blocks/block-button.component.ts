import { CommonModule } from '@angular/common';
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
import { ToastService } from '../ui/toast.service';
import { BlocksService } from './blocks.service';

/**
 * Inline block / unblock toggle. Renders nothing for unauthenticated
 * visitors or for the current user looking at their own surface.
 *
 * Block requires confirmation; unblock is one-click (toast confirms).
 * State is read from `BlocksService` signal cache, so toggling here
 * propagates to any other instance of the button on the page.
 */
@Component({
  selector: 'app-block-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <button
        type="button"
        class="block-btn"
        [class.is-blocked]="isBlocked()"
        [disabled]="busy()"
        (click)="toggle()"
      >
        @if (isBlocked()) {
          {{ busy() ? 'Se deblochează…' : 'Deblochează' }}
        } @else {
          {{ busy() ? 'Se blochează…' : 'Blochează' }}
        }
      </button>
    }
  `,
  styles: [
    `
      .block-btn {
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
      .block-btn:hover:not(:disabled) {
        border-color: var(--danger, #c44);
        color: var(--danger, #c44);
      }
      .block-btn.is-blocked {
        color: var(--accent);
        border-color: var(--accent);
      }
      .block-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    `,
  ],
})
export class BlockButtonComponent {
  private readonly blocks = inject(BlocksService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly userId = input.required<string>();
  /** Optional handle (for confirm copy). */
  readonly username = input<string | null>(null);

  readonly busy = signal(false);

  constructor() {
    // Lazy-hydrate the cache so isBlocked() returns the right value
    // on first render. Cheap when already loaded.
    if (this.auth.isLoggedIn()) {
      this.blocks.loadIfStale().catch(() => undefined);
    }
  }

  readonly visible = computed(() => {
    const cur = this.auth.currentUser();
    if (!cur) return false;
    return cur.id !== this.userId();
  });

  readonly isBlocked = computed(() => this.blocks.isBlocked(this.userId()));

  async toggle(): Promise<void> {
    if (this.busy()) return;
    const blocked = this.isBlocked();
    const label = this.username() ? `@${this.username()}` : 'acest utilizator';
    if (!blocked) {
      const ok = window.confirm(
        `Sigur vrei să blochezi ${label}? Nu vei mai vedea mesajele lor și nu vor mai putea să te contacteze.`,
      );
      if (!ok) return;
    }
    this.busy.set(true);
    try {
      if (blocked) {
        await this.blocks.unblock(this.userId());
        this.toast.success(`Ai deblocat ${label}.`);
      } else {
        await this.blocks.block({ blockedUserId: this.userId() });
        this.toast.success(`Ai blocat ${label}.`);
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.toast.warn('Utilizatorul este deja blocat.');
        await this.blocks.load();
      } else {
        this.toast.error('Operațiunea nu a reușit.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
