import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatPrice } from '@sintezaur/shared';
import { SzAvatarComponent, SzIconComponent } from '@sintezaur/ui';
import { AuthService } from '../auth/auth.service';
import {
  BazarService,
  type ChatMessage,
  type ThreadView,
} from '../bazar/bazar.service';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';

@Component({
  selector: 'app-messages-thread-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    SzIconComponent,
    SzAvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="thr">
      <header class="thr__head">
        <a routerLink="/cont/mesaje" class="thr__back">
          <sz-icon name="back" [size]="14" />
          {{ 'thread.back_to_inbox' | t }}
        </a>
        @if (view(); as v) {
          <div class="thr__listing">
            <a [routerLink]="['/bazar', v.listing.slug]" class="thr__listing-link">
              <div class="thr__listing-title">{{ v.listing.title }}</div>
              <div class="thr__listing-meta">
                <span>{{ formatPrice(v.listing.price, v.listing.currency) }}</span>
                <span class="sep">·</span>
                <span>{{ 'bazar.condition.' + v.listing.condition | t }}</span>
                @if (v.listing.status !== 'active') {
                  <span class="sep">·</span>
                  <span class="thr__status">
                    {{ 'inbox.status.' + v.listing.status | t }}
                  </span>
                }
              </div>
            </a>
          </div>
        }
      </header>

      @if (loading()) {
        <p class="thr__empty">{{ 'app.loading' | t }}</p>
      } @else if (view(); as v) {
        <section #scroller class="thr__messages">
          @for (m of v.messages; track m.id) {
            @switch (m.kind) {
              @case ('text') {
                <div
                  class="thr-msg"
                  [class.is-mine]="m.senderId === me()"
                >
                  @if (m.senderId !== me()) {
                    <sz-avatar [name]="otherUsernameLabel()" />
                  }
                  <div class="thr-msg__bubble">
                    <p>{{ m.body }}</p>
                    <time>{{ formatTime(m.createdAt) }}</time>
                  </div>
                </div>
              }
              @case ('transaction_confirmed') {
                <div class="thr-sys is-success">
                  ✓ {{ 'thread.system.tx_confirmed' | t }} ·
                  <time>{{ formatTime(m.createdAt) }}</time>
                </div>
              }
              @case ('system') {
                <div class="thr-sys">
                  {{ m.body }} ·
                  <time>{{ formatTime(m.createdAt) }}</time>
                </div>
              }
              @default {
                <!-- E4b: offer / counter_offer / accepted / rejected -->
                <div class="thr-sys is-pending">
                  {{ 'thread.system.offer_placeholder' | t }} ·
                  <time>{{ formatTime(m.createdAt) }}</time>
                </div>
              }
            }
          }
        </section>

        @if (v.listing.status === 'active') {
          <footer class="thr__compose">
            @if (sendError()) {
              <p class="thr__err">{{ sendError() }}</p>
            }
            <textarea
              [(ngModel)]="composeBody"
              [placeholder]="i18n.t('thread.compose_placeholder')"
              rows="2"
              (keydown.control.enter)="send()"
              (keydown.meta.enter)="send()"
            ></textarea>
            <button
              type="button"
              class="thr__send"
              [disabled]="!composeBody.trim() || sending()"
              (click)="send()"
            >
              {{ (sending() ? 'thread.sending' : 'thread.send') | t }}
            </button>
          </footer>
        } @else {
          <footer class="thr__locked">
            {{ 'thread.locked.' + v.listing.status | t }}
          </footer>
        }
      } @else if (notFound()) {
        <p class="thr__empty">{{ 'thread.not_found' | t }}</p>
      }
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .thr {
        max-width: 880px;
        margin: 0 auto;
        padding: 24px var(--gutter-x) 0;
        height: calc(100vh - 64px);
        display: flex;
        flex-direction: column;
      }
      .thr__head { padding-bottom: 14px; border-bottom: 1px solid var(--line); }
      .thr__back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        text-decoration: none;
        margin-bottom: 10px;
      }
      .thr__listing-link { display: block; text-decoration: none; color: var(--fg); }
      .thr__listing-link:hover { color: var(--accent); }
      .thr__listing-title {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 18px;
      }
      .thr__listing-meta {
        display: inline-flex;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
        margin-top: 4px;
      }
      .thr__listing-meta .sep { color: var(--fg-subtle); }
      .thr__status { color: var(--accent); }

      .thr__messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .thr__empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
      }

      .thr-msg {
        display: flex;
        gap: 10px;
        align-items: flex-end;
        max-width: 70%;
      }
      .thr-msg.is-mine {
        align-self: flex-end;
        flex-direction: row-reverse;
      }
      .thr-msg__bubble {
        padding: 10px 14px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        font-size: 14px;
        line-height: 1.5;
      }
      .thr-msg__bubble p { margin: 0; white-space: pre-wrap; }
      .thr-msg__bubble time {
        display: block;
        margin-top: 4px;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        letter-spacing: 0.06em;
        text-align: right;
      }
      .thr-msg.is-mine .thr-msg__bubble {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
      }
      .thr-msg.is-mine .thr-msg__bubble time { color: color-mix(in oklab, var(--bg) 70%, transparent); }

      .thr-sys {
        align-self: center;
        padding: 6px 14px;
        background: var(--bg-elev);
        border: 1px dashed var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .thr-sys.is-success { color: var(--accent); border-color: var(--accent); }
      .thr-sys.is-pending { opacity: 0.6; }

      .thr__compose {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        padding: 14px 0 20px;
        border-top: 1px solid var(--line);
        align-items: end;
      }
      .thr__compose textarea {
        grid-column: 1;
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
        resize: vertical;
        min-height: 60px;
      }
      .thr__compose textarea:focus {
        outline: 1px solid var(--accent);
        border-color: var(--accent);
      }
      .thr__err {
        grid-column: 1 / -1;
        margin: 0;
        font-family: var(--font-mono);
        font-size: 11px;
        color: #c0392b;
      }
      .thr__send {
        padding: 12px 22px;
        background: var(--accent);
        color: var(--bg);
        border: 0;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
        min-height: 60px;
      }
      .thr__send:disabled { opacity: 0.5; cursor: not-allowed; }

      .thr__locked {
        padding: 14px 18px;
        margin: 14px 0;
        border: 1px dashed var(--line);
        text-align: center;
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }

      @media (max-width: 720px) {
        .thr { height: calc(100vh - 56px); padding: 16px 12px 0; }
        .thr-msg { max-width: 90%; }
      }
    `,
  ],
})
export class MessagesThreadPage implements AfterViewChecked {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly view = signal<ThreadView | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  composeBody = '';
  readonly sending = signal(false);
  readonly sendError = signal<string | null>(null);

  readonly formatPrice = formatPrice;

  readonly me = computed(() => this.auth.currentUser()?.id ?? null);
  readonly otherUsernameLabel = computed(() => {
    const v = this.view();
    if (!v) return '';
    return v.listing.sellerId === this.me() ? 'Cumpărător' : 'Vânzător';
  });

  @ViewChild('scroller') private scroller?: ElementRef<HTMLElement>;
  private shouldScroll = false;

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const id = p.get('threadId');
      if (id) void this.load(id);
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scroller) {
      this.scroller.nativeElement.scrollTop =
        this.scroller.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  private async load(threadId: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    try {
      const v = await this.bazar.readThread(threadId);
      this.view.set(v);
      this.shouldScroll = true;
    } catch (err) {
      console.error('[bazar] thread load failed', err);
      this.notFound.set(true);
      this.view.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async send(): Promise<void> {
    const v = this.view();
    if (!v) return;
    const body = this.composeBody.trim();
    if (!body || this.sending()) return;
    this.sending.set(true);
    this.sendError.set(null);
    try {
      const res = await this.bazar.sendMessage(v.thread.id, body);
      this.view.update((current) => {
        if (!current) return current;
        return { ...current, messages: [...current.messages, res.message] };
      });
      this.composeBody = '';
      this.shouldScroll = true;
    } catch (err) {
      console.error('[bazar] send failed', err);
      this.sendError.set(this.i18n.t('thread.send_error'));
    } finally {
      this.sending.set(false);
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString(this.i18n.locale(), {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
