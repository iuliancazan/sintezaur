import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlocksService } from '../blocks/blocks.service';
import { uploadUrl } from '../seo/seo.utils';
import { ToastService } from '../ui/toast.service';

/**
 * `/cont/blocuri` — read + manage the current user's block list.
 * Loaded lazily via `BlocksService.load()`. Unblock is one-click +
 * toast (no confirmation; blocking is the irreversible direction).
 */
@Component({
  selector: 'app-blocks-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="blocks">
      <header class="blocks__head">
        <a routerLink="/cont" class="blocks__back">← Înapoi la cont</a>
        <h1>Utilizatori blocați</h1>
        <p class="blocks__hint">
          Utilizatorii blocați nu îți pot trimite mesaje, iar postările
          lor sunt ascunse de pe paginile pe care le vezi.
        </p>
      </header>

      @if (loading()) {
        <p class="loading">Se încarcă…</p>
      } @else if (blocks.items().length === 0) {
        <p class="empty">Nu ai blocat pe nimeni.</p>
      } @else {
        <ul class="list">
          @for (b of blocks.items(); track b.id) {
            <li class="row">
              <div class="row__user">
                @if (avatar(b.blockedAvatarUrl); as src) {
                  <img class="avatar" [src]="src" alt="" />
                } @else {
                  <span class="avatar avatar--ph">{{ initial(b.blockedFullName) }}</span>
                }
                <div>
                  <strong>{{ b.blockedFullName }}</strong>
                  <div class="muted">
                    <a [routerLink]="['/autor', b.blockedUsername]"
                      >&#64;{{ b.blockedUsername }}</a
                    >
                  </div>
                </div>
              </div>
              <div class="row__meta">
                <time>{{ formatDate(b.createdAt) }}</time>
                @if (b.reason) {
                  <p class="reason">„{{ b.reason }}"</p>
                }
              </div>
              <button
                type="button"
                class="unblock"
                [disabled]="busy().has(b.blockedUserId)"
                (click)="unblock(b.blockedUserId, b.blockedUsername)"
              >
                {{ busy().has(b.blockedUserId) ? 'Se deblochează…' : 'Deblochează' }}
              </button>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [
    `
      .blocks {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px var(--gutter-x);
      }
      .blocks__head { margin-bottom: 24px; }
      .blocks__back {
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
        text-decoration: none;
      }
      .blocks__head h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 40px);
        margin: 4px 0 8px;
      }
      .blocks__hint {
        color: var(--fg-muted);
        font-size: 13px;
        margin: 0;
      }
      .loading, .empty {
        text-align: center;
        color: var(--fg-muted);
        padding: 48px 0;
      }
      .list {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr 160px auto;
        gap: 16px;
        align-items: center;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        padding: 14px 18px;
      }
      .row__user {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        background: var(--bg-card);
        flex-shrink: 0;
      }
      .avatar--ph {
        display: grid;
        place-items: center;
        font-family: var(--font-display);
        font-size: 16px;
        color: var(--fg-muted);
        border: 1px solid var(--line);
      }
      .muted { color: var(--fg-muted); font-size: 12px; margin-top: 2px; }
      .muted a { color: inherit; }
      .row__meta {
        font-size: 12px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
      }
      .reason {
        margin: 4px 0 0;
        font-style: italic;
        font-family: inherit;
      }
      .unblock {
        padding: 8px 14px;
        background: transparent;
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .unblock:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
      .unblock:disabled { opacity: 0.5; cursor: not-allowed; }
      @media (max-width: 640px) {
        .row {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .unblock { justify-self: flex-end; }
      }
    `,
  ],
})
export class BlocksListPage {
  readonly blocks = inject(BlocksService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly busy = signal<Set<string>>(new Set());

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      await this.blocks.load();
    } catch {
      this.toast.error('Nu am putut încărca lista.');
    } finally {
      this.loading.set(false);
    }
  }

  async unblock(userId: string, username: string): Promise<void> {
    const next = new Set(this.busy());
    next.add(userId);
    this.busy.set(next);
    try {
      await this.blocks.unblock(userId);
      this.toast.success(`Ai deblocat @${username}.`);
    } catch {
      this.toast.error('Operațiunea nu a reușit.');
    } finally {
      const cleared = new Set(this.busy());
      cleared.delete(userId);
      this.busy.set(cleared);
    }
  }

  avatar(path: string | null): string | undefined {
    return uploadUrl(path);
  }

  initial(name: string): string {
    return (name.trim().charAt(0) || '·').toUpperCase();
  }

  formatDate(s: string): string {
    try {
      return new Date(s).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return s;
    }
  }
}
