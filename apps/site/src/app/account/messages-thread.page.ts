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
  type TransactionDto,
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
              @case ('offer') {
                <div
                  class="thr-offer"
                  [class.is-mine]="m.senderId === me()"
                >
                  <div class="thr-offer__head">
                    <span class="thr-offer__kind">
                      {{ 'thread.offer.kind_offer' | t }}
                    </span>
                    <time>{{ formatTime(m.createdAt) }}</time>
                  </div>
                  <div class="thr-offer__amount">
                    {{ formatPrice(m.offerAmount!, m.offerCurrency!) }}
                  </div>
                  @if (m.body) {
                    <p class="thr-offer__note">{{ m.body }}</p>
                  }
                  @if (offerResolution(m.id); as r) {
                    <div class="thr-offer__resolved is-{{ r.kind }}">
                      {{ 'thread.offer.resolved_' + r.kind | t }}
                    </div>
                  } @else if (m.senderId !== me()) {
                    <div class="thr-offer__actions">
                      <button
                        type="button"
                        class="thr-offer__btn is-accept"
                        [disabled]="offerActionId() === m.id"
                        (click)="acceptOffer(m.id)"
                      >
                        {{ 'thread.offer.accept' | t }}
                      </button>
                      <button
                        type="button"
                        class="thr-offer__btn"
                        [disabled]="offerActionId() === m.id"
                        (click)="rejectOffer(m.id)"
                      >
                        {{ 'thread.offer.reject' | t }}
                      </button>
                      <button
                        type="button"
                        class="thr-offer__btn"
                        [disabled]="offerActionId() === m.id || atOfferCap()"
                        (click)="openCounterFor(m)"
                      >
                        {{ 'thread.offer.counter' | t }}
                      </button>
                    </div>
                  }
                </div>
              }
              @case ('counter_offer') {
                <div
                  class="thr-offer"
                  [class.is-mine]="m.senderId === me()"
                >
                  <div class="thr-offer__head">
                    <span class="thr-offer__kind">
                      {{ 'thread.offer.kind_counter' | t }}
                    </span>
                    <time>{{ formatTime(m.createdAt) }}</time>
                  </div>
                  <div class="thr-offer__amount">
                    {{ formatPrice(m.offerAmount!, m.offerCurrency!) }}
                  </div>
                  @if (m.body) {
                    <p class="thr-offer__note">{{ m.body }}</p>
                  }
                  @if (offerResolution(m.id); as r) {
                    <div class="thr-offer__resolved is-{{ r.kind }}">
                      {{ 'thread.offer.resolved_' + r.kind | t }}
                    </div>
                  } @else if (m.senderId !== me()) {
                    <div class="thr-offer__actions">
                      <button
                        type="button"
                        class="thr-offer__btn is-accept"
                        [disabled]="offerActionId() === m.id"
                        (click)="acceptOffer(m.id)"
                      >
                        {{ 'thread.offer.accept' | t }}
                      </button>
                      <button
                        type="button"
                        class="thr-offer__btn"
                        [disabled]="offerActionId() === m.id"
                        (click)="rejectOffer(m.id)"
                      >
                        {{ 'thread.offer.reject' | t }}
                      </button>
                      <button
                        type="button"
                        class="thr-offer__btn"
                        [disabled]="offerActionId() === m.id || atOfferCap()"
                        (click)="openCounterFor(m)"
                      >
                        {{ 'thread.offer.counter' | t }}
                      </button>
                    </div>
                  }
                </div>
              }
              @case ('offer_accepted') {
                <div class="thr-sys is-success">
                  ✓ {{ 'thread.offer.accepted_system' | t }} ·
                  <time>{{ formatTime(m.createdAt) }}</time>
                </div>
              }
              @case ('offer_rejected') {
                <div class="thr-sys">
                  {{ 'thread.offer.rejected_system' | t }} ·
                  <time>{{ formatTime(m.createdAt) }}</time>
                </div>
              }
            }
          }
        </section>

        @if (txBanner(); as banner) {
          <div class="thr__tx-banner" [class]="'is-' + banner.tone">
            <div class="thr__tx-banner-body">
              <strong>{{ banner.title }}</strong>
              <p>{{ banner.detail }}</p>
            </div>
            @if (banner.action === 'confirm') {
              <button
                type="button"
                class="thr__tx-cta"
                [disabled]="txPending()"
                (click)="confirmTransaction()"
              >
                {{
                  (txPending()
                    ? 'thread.tx.confirming'
                    : 'thread.tx.confirm_button') | t
                }}
              </button>
            } @else if (banner.action === 'review' && !reviewSubmitted()) {
              <button
                type="button"
                class="thr__tx-cta"
                (click)="openReview()"
              >
                {{ 'thread.tx.review_button' | t }}
              </button>
            }
          </div>
        }

        @if (reviewing()) {
          <div class="thr__review">
            <h3>{{ 'thread.review.title' | t }}</h3>
            <div class="thr__review-stars">
              @for (n of [1, 2, 3, 4, 5]; track n) {
                <button
                  type="button"
                  class="thr__star"
                  [class.is-active]="n <= reviewRating()"
                  (click)="reviewRating.set(n)"
                  [attr.aria-label]="i18n.t('thread.review.rate', { n })"
                >
                  ★
                </button>
              }
            </div>
            <textarea
              [(ngModel)]="reviewBody"
              rows="4"
              [placeholder]="i18n.t('thread.review.body_placeholder')"
              minlength="10"
              maxlength="2000"
            ></textarea>
            @if (reviewError()) {
              <p class="thr__err">{{ reviewError() }}</p>
            }
            <div class="thr__review-actions">
              <button type="button" class="thr__cancel" (click)="cancelReview()">
                {{ 'thread.review.cancel' | t }}
              </button>
              <button
                type="button"
                class="thr__send"
                [disabled]="!canSubmitReview() || reviewPending()"
                (click)="submitReview()"
              >
                {{
                  (reviewPending()
                    ? 'thread.review.submitting'
                    : 'thread.review.submit') | t
                }}
              </button>
            </div>
          </div>
        }

        @if (v.listing.status === 'active') {
          <footer class="thr__compose">
            <div class="thr__tabs">
              <button
                type="button"
                [class.is-active]="composeMode() === 'text'"
                (click)="composeMode.set('text')"
              >
                {{ 'thread.tab_message' | t }}
              </button>
              @if (canMakeOffer()) {
                <button
                  type="button"
                  [class.is-active]="composeMode() === 'offer'"
                  (click)="openOfferCompose()"
                  [disabled]="atOfferCap()"
                >
                  {{
                    (counterTargetId() ? 'thread.tab_counter' : 'thread.tab_offer') | t
                  }}
                </button>
              }
            </div>

            @if (sendError()) {
              <p class="thr__err">{{ sendError() }}</p>
            }

            @if (composeMode() === 'text') {
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
            } @else {
              <div class="thr__offer-form">
                <div class="thr__offer-fields">
                  <label>
                    <span>{{ 'thread.offer.amount_label' | t }}</span>
                    <input
                      type="number"
                      [(ngModel)]="offerAmount"
                      min="0"
                      step="1"
                      max="1000000"
                    />
                  </label>
                  <label>
                    <span>{{ 'thread.offer.currency_label' | t }}</span>
                    <select [(ngModel)]="offerCurrency">
                      <option value="ron">RON</option>
                      <option value="eur">EUR</option>
                    </select>
                  </label>
                </div>
                <textarea
                  [(ngModel)]="offerNote"
                  rows="2"
                  [placeholder]="i18n.t('thread.offer.note_placeholder')"
                ></textarea>
                @if (counterTargetId()) {
                  <p class="thr__offer-hint">
                    {{
                      'thread.offer.counter_hint'
                        | t: { rounds: v.thread.offerRoundCount + 1 }
                    }}
                  </p>
                } @else if (atOfferCap()) {
                  <p class="thr__offer-hint is-warn">
                    {{ 'thread.offer.cap_reached' | t }}
                  </p>
                }
                <div class="thr__offer-actions">
                  <button
                    type="button"
                    class="thr__cancel"
                    (click)="cancelOfferCompose()"
                  >
                    {{ 'thread.offer.cancel' | t }}
                  </button>
                  <button
                    type="button"
                    class="thr__send"
                    [disabled]="!offerAmount || sending() || atOfferCap()"
                    (click)="sendOffer()"
                  >
                    {{
                      (sending()
                        ? 'thread.sending'
                        : counterTargetId()
                          ? 'thread.offer.send_counter'
                          : 'thread.offer.send') | t
                    }}
                  </button>
                </div>
              </div>
            }
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

      .thr-offer {
        max-width: 360px;
        align-self: flex-start;
        padding: 14px 16px;
        background: var(--bg);
        border: 2px solid var(--accent);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .thr-offer.is-mine { align-self: flex-end; }
      .thr-offer__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .thr-offer__head time { color: var(--fg-subtle); }
      .thr-offer__amount {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 26px;
        line-height: 1;
      }
      .thr-offer__note { margin: 0; font-size: 13px; line-height: 1.5; }
      .thr-offer__actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .thr-offer__btn {
        flex: 1;
        padding: 8px 12px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        color: var(--fg);
      }
      .thr-offer__btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
      .thr-offer__btn.is-accept {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
      }
      .thr-offer__btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .thr-offer__resolved {
        padding: 6px 10px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-align: center;
        background: var(--bg-elev);
      }
      .thr-offer__resolved.is-accepted { color: var(--accent); }
      .thr-offer__resolved.is-rejected { color: var(--fg-muted); }

      .thr__tabs {
        grid-column: 1 / -1;
        display: inline-flex;
        gap: 0;
      }
      .thr__tabs button {
        padding: 8px 14px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-bottom: 0;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-muted);
        cursor: pointer;
      }
      .thr__tabs button + button { border-left: 0; }
      .thr__tabs button.is-active {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
      }
      .thr__tabs button:disabled { opacity: 0.5; cursor: not-allowed; }

      .thr__offer-form {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--accent);
        background: color-mix(in oklab, var(--accent) 4%, var(--bg-elev));
      }
      .thr__offer-fields { display: grid; grid-template-columns: 1fr auto; gap: 10px; }
      .thr__offer-form label { display: flex; flex-direction: column; gap: 4px; }
      .thr__offer-form label span {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .thr__offer-form input,
      .thr__offer-form select,
      .thr__offer-form textarea {
        padding: 8px 10px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
      }
      .thr__offer-form textarea { resize: vertical; }
      .thr__offer-hint {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
      }
      .thr__offer-hint.is-warn { color: #c0392b; }
      .thr__offer-actions { display: flex; gap: 10px; justify-content: flex-end; }
      .thr__cancel {
        padding: 10px 14px;
        background: transparent;
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        cursor: pointer;
        color: var(--fg-muted);
      }
      .thr__cancel:hover { color: var(--fg); }

      .thr__tx-banner {
        display: flex;
        gap: 16px;
        align-items: center;
        padding: 14px 18px;
        margin: 12px 0;
        border: 1px solid var(--line-strong);
      }
      .thr__tx-banner.is-info { background: var(--bg-elev); }
      .thr__tx-banner.is-warn { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 8%, var(--bg-elev)); }
      .thr__tx-banner.is-success { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev)); }
      .thr__tx-banner-body { flex: 1; }
      .thr__tx-banner strong {
        display: block;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .thr__tx-banner p { margin: 4px 0 0; font-size: 13px; color: var(--fg); }
      .thr__tx-cta {
        padding: 10px 18px;
        background: var(--accent);
        color: var(--bg);
        border: 0;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        cursor: pointer;
        min-height: 40px;
      }
      .thr__tx-cta:disabled { opacity: 0.55; cursor: not-allowed; }

      .thr__review {
        margin: 12px 0;
        padding: 16px 18px;
        border: 1px solid var(--accent);
        background: var(--bg-elev);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .thr__review h3 {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .thr__review-stars { display: inline-flex; gap: 6px; }
      .thr__star {
        background: none;
        border: 0;
        font-size: 30px;
        line-height: 1;
        color: var(--fg-subtle);
        cursor: pointer;
        padding: 4px;
        min-width: 38px;
      }
      .thr__star.is-active { color: var(--accent); }
      .thr__review textarea {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
        resize: vertical;
      }
      .thr__review-actions { display: flex; gap: 10px; justify-content: flex-end; }

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

  readonly composeMode = signal<'text' | 'offer'>('text');
  readonly counterTargetId = signal<string | null>(null);
  offerAmount: number | null = null;
  offerCurrency: 'ron' | 'eur' = 'ron';
  offerNote = '';
  readonly offerActionId = signal<string | null>(null);

  /** spec §8.2: counter chain capped at 5 rounds. */
  readonly MAX_OFFER_ROUNDS = 5;

  readonly transaction = signal<TransactionDto | null>(null);
  readonly txPending = signal(false);

  readonly reviewing = signal(false);
  readonly reviewRating = signal(5);
  reviewBody = '';
  readonly reviewPending = signal(false);
  readonly reviewError = signal<string | null>(null);
  readonly reviewSubmitted = signal(false);

  readonly formatPrice = formatPrice;

  readonly me = computed(() => this.auth.currentUser()?.id ?? null);
  readonly otherUsernameLabel = computed(() => {
    const v = this.view();
    if (!v) return '';
    return v.listing.sellerId === this.me() ? 'Cumpărător' : 'Vânzător';
  });

  readonly canMakeOffer = computed(() => {
    const v = this.view();
    return !!(v && v.listing.acceptsOffers && v.listing.status === 'active');
  });

  readonly atOfferCap = computed(() => {
    const v = this.view();
    return !!(v && v.thread.offerRoundCount >= this.MAX_OFFER_ROUNDS);
  });

  /**
   * Maps every offer / counter_offer message id → the message that
   * resolves it (kind = offer_accepted | offer_rejected | counter_offer
   * targeting it via repliesToMessageId).
   */
  readonly offerResolution = (offerId: string) => {
    const msgs = this.view()?.messages ?? [];
    const resolver = msgs.find(
      (m) =>
        m.repliesToMessageId === offerId &&
        (m.kind === 'offer_accepted' ||
          m.kind === 'offer_rejected' ||
          m.kind === 'counter_offer'),
    );
    if (!resolver) return null;
    if (resolver.kind === 'offer_accepted')
      return { kind: 'accepted' } as const;
    if (resolver.kind === 'offer_rejected')
      return { kind: 'rejected' } as const;
    return { kind: 'countered' } as const;
  };

  readonly txBanner = computed(() => {
    const v = this.view();
    const tx = this.transaction();
    const me = this.me();
    if (!v || !me) return null;
    if (tx?.status === 'confirmed') {
      if (this.reviewSubmitted()) {
        return {
          tone: 'success',
          title: this.i18n.t('thread.tx.banner_review_done_title'),
          detail: this.i18n.t('thread.tx.banner_review_done_detail'),
          action: null,
        } as const;
      }
      return {
        tone: 'success',
        title: this.i18n.t('thread.tx.banner_confirmed_title'),
        detail: this.i18n.t('thread.tx.banner_confirmed_detail'),
        action: 'review',
      } as const;
    }
    if (tx?.status === 'pending') {
      const myStamp =
        me === tx.sellerId ? tx.sellerConfirmedAt : tx.buyerConfirmedAt;
      if (myStamp) {
        return {
          tone: 'info',
          title: this.i18n.t('thread.tx.banner_waiting_other_title'),
          detail: this.i18n.t('thread.tx.banner_waiting_other_detail'),
          action: null,
        } as const;
      }
      return {
        tone: 'warn',
        title: this.i18n.t('thread.tx.banner_other_confirmed_title'),
        detail: this.i18n.t('thread.tx.banner_other_confirmed_detail'),
        action: 'confirm',
      } as const;
    }
    // No transaction yet — prompt only if listing is still active.
    if (v.listing.status === 'active') {
      return {
        tone: 'info',
        title: this.i18n.t('thread.tx.banner_idle_title'),
        detail: this.i18n.t('thread.tx.banner_idle_detail'),
        action: 'confirm',
      } as const;
    }
    return null;
  });

  readonly canSubmitReview = computed(
    () => this.reviewBody.trim().length >= 10 && this.reviewRating() >= 1,
  );

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
    this.reviewing.set(false);
    this.reviewSubmitted.set(false);
    try {
      const v = await this.bazar.readThread(threadId);
      this.view.set(v);
      this.shouldScroll = true;
      try {
        const tx = await this.bazar.getTransaction(threadId);
        this.transaction.set(tx);
      } catch {
        this.transaction.set(null);
      }
    } catch (err) {
      console.error('[bazar] thread load failed', err);
      this.notFound.set(true);
      this.view.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async confirmTransaction(): Promise<void> {
    const v = this.view();
    if (!v || this.txPending()) return;
    this.txPending.set(true);
    try {
      const res = await this.bazar.confirmTransaction(v.thread.id);
      this.transaction.set(res.transaction);
      // Re-fetch thread so the system message + listing.status flip show up.
      const refreshed = await this.bazar.readThread(v.thread.id);
      this.view.set(refreshed);
      this.shouldScroll = true;
    } catch (err) {
      console.error('[bazar] confirm tx failed', err);
      this.sendError.set(this.i18n.t('thread.tx.confirm_error'));
    } finally {
      this.txPending.set(false);
    }
  }

  openReview(): void {
    this.reviewing.set(true);
    this.reviewError.set(null);
  }

  cancelReview(): void {
    this.reviewing.set(false);
    this.reviewError.set(null);
    this.reviewBody = '';
    this.reviewRating.set(5);
  }

  async submitReview(): Promise<void> {
    const tx = this.transaction();
    if (!tx || !this.canSubmitReview() || this.reviewPending()) return;
    this.reviewPending.set(true);
    this.reviewError.set(null);
    try {
      await this.bazar.submitReview(
        tx.id,
        this.reviewRating(),
        this.reviewBody.trim(),
      );
      this.reviewSubmitted.set(true);
      this.reviewing.set(false);
      this.reviewBody = '';
      this.reviewRating.set(5);
    } catch (err: unknown) {
      console.error('[bazar] review submit failed', err);
      // The backend throws 409 if you've already submitted on this side.
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        this.reviewSubmitted.set(true);
        this.reviewing.set(false);
      } else {
        this.reviewError.set(this.i18n.t('thread.review.error'));
      }
    } finally {
      this.reviewPending.set(false);
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

  openOfferCompose(): void {
    if (this.atOfferCap()) return;
    this.composeMode.set('offer');
    // Pre-fill amount from listing price the first time.
    if (this.offerAmount === null) {
      const v = this.view();
      if (v) {
        this.offerAmount = Number(v.listing.price);
        this.offerCurrency = v.listing.currency;
      }
    }
  }

  openCounterFor(target: ChatMessage): void {
    this.counterTargetId.set(target.id);
    this.composeMode.set('offer');
    this.offerAmount = target.offerAmount ? Number(target.offerAmount) : null;
    this.offerCurrency = (target.offerCurrency ?? 'ron') as 'ron' | 'eur';
    this.offerNote = '';
  }

  cancelOfferCompose(): void {
    this.composeMode.set('text');
    this.counterTargetId.set(null);
    this.offerNote = '';
  }

  async sendOffer(): Promise<void> {
    const v = this.view();
    if (!v || !this.offerAmount || this.sending() || this.atOfferCap()) return;
    this.sending.set(true);
    this.sendError.set(null);
    try {
      const res = await this.bazar.makeOffer(v.thread.id, {
        amount: Number(this.offerAmount),
        currency: this.offerCurrency,
        note: this.offerNote.trim() || undefined,
        repliesToMessageId: this.counterTargetId() ?? undefined,
      });
      this.view.update((current) => {
        if (!current) return current;
        const isCounter = this.counterTargetId() !== null;
        return {
          ...current,
          thread: {
            ...current.thread,
            offerRoundCount: isCounter
              ? current.thread.offerRoundCount + 1
              : current.thread.offerRoundCount,
          },
          messages: [...current.messages, res.message],
        };
      });
      this.cancelOfferCompose();
      this.shouldScroll = true;
    } catch (err) {
      console.error('[bazar] offer send failed', err);
      this.sendError.set(this.i18n.t('thread.offer.send_error'));
    } finally {
      this.sending.set(false);
    }
  }

  async acceptOffer(offerId: string): Promise<void> {
    const v = this.view();
    if (!v) return;
    this.offerActionId.set(offerId);
    this.sendError.set(null);
    try {
      const res = await this.bazar.acceptOffer(v.thread.id, offerId);
      this.view.update((current) => {
        if (!current) return current;
        return { ...current, messages: [...current.messages, res.message] };
      });
      this.shouldScroll = true;
    } catch (err) {
      console.error('[bazar] offer accept failed', err);
      this.sendError.set(this.i18n.t('thread.offer.action_error'));
    } finally {
      this.offerActionId.set(null);
    }
  }

  async rejectOffer(offerId: string): Promise<void> {
    const v = this.view();
    if (!v) return;
    this.offerActionId.set(offerId);
    this.sendError.set(null);
    try {
      const res = await this.bazar.rejectOffer(v.thread.id, offerId);
      this.view.update((current) => {
        if (!current) return current;
        return { ...current, messages: [...current.messages, res.message] };
      });
      this.shouldScroll = true;
    } catch (err) {
      console.error('[bazar] offer reject failed', err);
      this.sendError.set(this.i18n.t('thread.offer.action_error'));
    } finally {
      this.offerActionId.set(null);
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
