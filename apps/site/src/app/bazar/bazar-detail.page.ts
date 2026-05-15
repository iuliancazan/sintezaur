import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatPrice } from '@sintezaur/shared';
import {
  SzAvatarComponent,
  SzBadgeComponent,
  SzButtonComponent,
  SzIconComponent,
} from '@sintezaur/ui';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { clampDescription, stripHtml, uploadUrl } from '../seo/seo.utils';
import { TPipe } from '../i18n/t.pipe';
import {
  BazarService,
  type BazarListItem,
  type BazarListingDetail,
} from './bazar.service';

@Component({
  selector: 'app-bazar-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    SzIconComponent,
    SzBadgeComponent,
    SzAvatarComponent,
    SzButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (detail(); as d) {
      <div class="shell">
        <!-- BREADCRUMB -->
        <nav class="bd-crumb" aria-label="Breadcrumb">
          <a routerLink="/bazar" class="bd-crumb__back">
            <sz-icon name="back" [size]="14" />
            {{ 'bazar.detail.back_to_list' | t }}
          </a>
          <span class="sep">·</span>
          <a routerLink="/bazar">{{ 'bazar.detail.breadcrumb_root' | t }}</a>
          @if (d.gear?.brand || d.listing.rawMake) {
            <span class="sep">/</span>
            <span>{{ d.gear?.brand ?? d.listing.rawMake }}</span>
          }
          <span class="sep">/</span>
          <span class="cur">{{ d.listing.title }}</span>
        </nav>

        @if (statusBanner(); as banner) {
          <div class="bd-banner" [class]="'is-' + banner.kind">
            {{ banner.label }}
          </div>
        }

        <div class="bd-main">
          <!-- ============ LEFT: gallery + info ============ -->
          <div class="bd-left">
            <!-- GALLERY -->
            <div class="bd-gallery">
              @if (photos().length > 0) {
                <div class="bd-gallery__hero">
                  <img
                    [src]="bazar.imageUrl(heroPhoto()!.path)"
                    [alt]="d.listing.title"
                  />
                </div>
                @if (photos().length > 1) {
                  <div class="bd-gallery__thumbs">
                    @for (p of thumbs(); track p.sourceId) {
                      <button
                        type="button"
                        class="bd-gallery__thumb"
                        [class.is-active]="p.sourceId === activeSourceId()"
                        (click)="activeSourceId.set(p.sourceId)"
                      >
                        <img [src]="bazar.imageUrl(p.path)" alt="" />
                      </button>
                    }
                  </div>
                }
              } @else {
                <div class="bd-gallery__hero is-empty">
                  <span>{{ 'bazar.detail.no_photos' | t }}</span>
                </div>
              }
            </div>

            <!-- HEADER -->
            <header class="bd-header">
              <div class="bd-header__top">
                @if (d.gear) {
                  <a class="bd-header__brand" [routerLink]="['/tezaur', d.gear.slug]">
                    // {{ d.gear.brand }} {{ d.gear.model }}
                  </a>
                } @else if (d.listing.rawMake || d.listing.rawModel) {
                  <span class="bd-header__brand bd-header__brand--raw">
                    // {{ d.listing.rawMake }} {{ d.listing.rawModel }}
                    @if (d.listing.rawYear) {
                      ({{ d.listing.rawYear }})
                    }
                  </span>
                }
                <div class="bd-header__badges">
                  <sz-badge>{{ 'bazar.condition.' + d.listing.condition | t }}</sz-badge>
                  @if (d.listing.kind !== 'sell') {
                    <sz-badge variant="accent">{{ 'bazar.kind.' + d.listing.kind | t }}</sz-badge>
                  }
                  @if (d.listing.acceptsOffers) {
                    <sz-badge>{{ 'bazar.card.accepts_offers' | t }}</sz-badge>
                  }
                </div>
              </div>
              <h1 class="bd-header__title">{{ d.listing.title }}</h1>
              <div class="bd-header__meta">
                <span class="bd-header__meta-item">
                  <sz-icon name="pin" [size]="13" />
                  {{ d.listing.location }}
                </span>
                <span class="bd-header__meta-item">
                  {{ 'bazar.detail.posted_on' | t: { date: formatDate(d.listing.createdAt) } }}
                </span>
                <span class="bd-header__meta-item">
                  <sz-icon name="heart" [size]="13" />
                  {{ d.listing.viewCount }} {{ 'bazar.detail.views' | t }}
                </span>
              </div>
            </header>

            <!-- PRICE -->
            <div class="bd-price-bar">
              <div>
                <div class="bd-price">
                  {{ formatPrice(d.listing.price, d.listing.currency) }}
                </div>
                @if (d.listing.acceptsOffers) {
                  <div class="bd-price__sub">{{ 'bazar.detail.offers_welcome' | t }}</div>
                }
              </div>
              <div class="bd-actions">
                @if (isOwner()) {
                  <a
                    class="bd-action"
                    [routerLink]="['/bazar', d.listing.slug, 'editare']"
                  >{{ 'bazar.detail.edit' | t }}</a>
                } @else {
                  <button
                    type="button"
                    class="bd-action bd-action--watch"
                    [class.is-active]="isWatched()"
                    (click)="toggleWatch()"
                    [disabled]="watchPending() || !auth.isLoggedIn()"
                  >
                    <sz-icon name="heart" [size]="14" />
                    {{ (isWatched() ? 'bazar.detail.watching' : 'bazar.detail.watch') | t }}
                  </button>
                  <a class="bd-action" routerLink="/login">
                    {{ 'bazar.detail.report' | t }}
                  </a>
                }
              </div>
            </div>

            <!-- DESCRIPTION -->
            @if (d.listing.descriptionHtml) {
              <section class="bd-section">
                <h2 class="bd-section__title">// {{ 'bazar.detail.description' | t }}</h2>
                <div class="bd-prose" [innerHTML]="d.listing.descriptionHtml"></div>
              </section>
            }

            <!-- TRADE LOOKING FOR -->
            @if (d.listing.lookingFor) {
              <section class="bd-section">
                <h2 class="bd-section__title">// {{ 'bazar.detail.looking_for' | t }}</h2>
                <p class="bd-lookingfor">{{ d.listing.lookingFor }}</p>
              </section>
            }

            <!-- CONDITION NOTE -->
            @if (d.listing.conditionNote) {
              <section class="bd-section">
                <h2 class="bd-section__title">// {{ 'bazar.detail.condition_note' | t }}</h2>
                <p>{{ d.listing.conditionNote }}</p>
              </section>
            }

            <!-- DELIVERY -->
            <section class="bd-section">
              <h2 class="bd-section__title">// {{ 'bazar.detail.delivery' | t }}</h2>
              <dl class="bd-spec">
                <div>
                  <dt>{{ 'bazar.filters.delivery' | t }}</dt>
                  <dd>{{ 'bazar.delivery.' + d.listing.delivery | t }}</dd>
                </div>
                @if (d.listing.shippingCost) {
                  <div>
                    <dt>{{ 'bazar.detail.shipping_cost' | t }}</dt>
                    <dd>{{ formatPrice(d.listing.shippingCost, d.listing.currency) }}</dd>
                  </div>
                }
                @if (d.listing.shippingCarriers.length > 0) {
                  <div>
                    <dt>{{ 'bazar.detail.shipping_carriers' | t }}</dt>
                    <dd>{{ shippingCarriersLabel(d.listing.shippingCarriers) }}</dd>
                  </div>
                }
              </dl>
            </section>
          </div>

          <!-- ============ RIGHT: sticky sidebar ============ -->
          <aside class="bd-side">
            <!-- SELLER CARD -->
            <section class="bd-card">
              <header class="bd-card__head">// {{ 'bazar.detail.seller' | t }}</header>
              <div class="bd-card__body">
                <div class="bd-seller">
                  <sz-avatar [name]="d.seller.username" />
                  <div>
                    <div class="bd-seller__name">{{ d.seller.username }}</div>
                    <div class="bd-seller__meta">
                      @if (d.seller.avgRating) {
                        <span class="bd-seller__rating">★ {{ d.seller.avgRating }}</span>
                        <span class="dot">·</span>
                      }
                      <span>{{ 'bazar.detail.tx_count' | t: { count: d.seller.transactionCount } }}</span>
                    </div>
                    <div class="bd-seller__since">
                      {{ 'bazar.detail.member_since' | t: { date: formatYear(d.seller.createdAt) } }}
                    </div>
                  </div>
                </div>

                @if (!isOwner() && d.listing.status === 'active') {
                  @if (auth.isLoggedIn()) {
                    <div class="bd-contact">
                      @if (contactSuccess()) {
                        <p class="bd-contact__ok">
                          ✓ {{ 'bazar.detail.message_sent' | t }}
                          <a routerLink="/cont/mesaje">
                            {{ 'bazar.detail.go_to_inbox' | t }}
                          </a>
                        </p>
                      } @else {
                        <textarea
                          rows="4"
                          [(ngModel)]="contactBody"
                          [placeholder]="
                            i18n.t('bazar.detail.message_placeholder', {
                              brand: d.gear?.brand ?? d.listing.rawMake ?? ''
                            })
                          "
                        ></textarea>
                        @if (contactError()) {
                          <p class="bd-contact__err">{{ contactError() }}</p>
                        }
                        <button
                          sz-button
                          type="button"
                          (click)="sendMessage(d.listing.id)"
                          [disabled]="!contactBody.trim() || contactPending()"
                        >
                          {{
                            (contactPending()
                              ? 'bazar.detail.sending'
                              : 'bazar.detail.send_message') | t
                          }}
                        </button>
                      }
                    </div>
                  } @else {
                    <a routerLink="/login" class="bd-login-cta">
                      {{ 'bazar.detail.login_to_message' | t }}
                    </a>
                  }
                }

                @if (d.listing.contactPhone) {
                  <p class="bd-phone">
                    <sz-icon name="bell" [size]="12" />
                    <strong>{{ d.listing.contactPhone }}</strong>
                  </p>
                }
              </div>
            </section>

            <!-- LINKED TEZAUR ENTRY -->
            @if (d.gear) {
              <section class="bd-card">
                <header class="bd-card__head">// {{ 'bazar.detail.linked_gear' | t }}</header>
                <div class="bd-card__body">
                  <a class="bd-gear-link" [routerLink]="['/tezaur', d.gear.slug]">
                    <div class="bd-gear-link__brand">{{ d.gear.brand }}</div>
                    <div class="bd-gear-link__model">{{ d.gear.model }}</div>
                    <div class="bd-gear-link__cta">{{ 'bazar.detail.view_tezaur' | t }} →</div>
                  </a>
                </div>
              </section>
            }

            <!-- RECENTLY SOLD -->
            @if (recentlySold().length > 0) {
              <section class="bd-card">
                <header class="bd-card__head">
                  // {{ 'bazar.detail.recently_sold' | t }}
                </header>
                <div class="bd-card__body bd-recently">
                  @for (s of recentlySold(); track s.id) {
                    <a class="bd-recent" [routerLink]="['/bazar', s.slug]">
                      <span class="bd-recent__price">
                        {{ formatPrice(s.price, s.currency) }}
                      </span>
                      <span class="bd-recent__cond">
                        {{ 'bazar.condition.' + s.condition | t }}
                      </span>
                      <span class="bd-recent__loc">{{ s.location }}</span>
                    </a>
                  }
                </div>
              </section>
            }
          </aside>
        </div>
      </div>
    } @else if (loading()) {
      <div class="shell">
        <p class="bd-loading">{{ 'app.loading' | t }}</p>
      </div>
    } @else if (notFound()) {
      <div class="shell">
        <p class="bd-empty">{{ 'bazar.detail.not_found' | t }}</p>
        <a routerLink="/bazar" class="bd-empty__back">← {{ 'bazar.detail.back_to_list' | t }}</a>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }

      .bd-crumb {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 0;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .bd-crumb a { color: var(--fg-muted); text-decoration: none; }
      .bd-crumb a:hover { color: var(--fg); }
      .bd-crumb .sep { color: var(--fg-subtle); }
      .bd-crumb .cur { color: var(--fg); }
      .bd-crumb__back {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--accent) !important;
      }

      .bd-banner {
        padding: 10px 14px;
        margin-bottom: 18px;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border: 1px solid var(--line-strong);
        background: var(--bg-elev);
      }
      .bd-banner.is-warn { border-color: var(--accent); color: var(--accent); }
      .bd-banner.is-info { color: var(--fg-muted); }

      .bd-main {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 32px;
        margin-bottom: var(--gutter-y);
      }

      .bd-gallery {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
      }
      .bd-gallery__hero {
        position: relative;
        aspect-ratio: 4 / 3;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        overflow: hidden;
      }
      .bd-gallery__hero img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .bd-gallery__hero.is-empty {
        display: grid;
        place-items: center;
        color: var(--fg-subtle);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
      }
      .bd-gallery__thumbs {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 8px;
      }
      .bd-gallery__thumb {
        aspect-ratio: 1 / 1;
        padding: 0;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        cursor: pointer;
        overflow: hidden;
      }
      .bd-gallery__thumb.is-active { border-color: var(--accent); }
      .bd-gallery__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

      .bd-header {
        border-top: 1px solid var(--line);
        padding-top: 16px;
        margin-bottom: 18px;
      }
      .bd-header__top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 8px;
      }
      .bd-header__brand {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent);
        text-decoration: none;
      }
      .bd-header__brand:hover { text-decoration: underline; text-underline-offset: 3px; }
      .bd-header__brand--raw { color: var(--fg-muted); }
      .bd-header__badges {
        display: inline-flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .bd-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 4vw, 42px);
        line-height: 1.1;
        margin: 0 0 12px;
      }
      .bd-header__meta {
        display: inline-flex;
        gap: 16px;
        flex-wrap: wrap;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
      }
      .bd-header__meta-item { display: inline-flex; align-items: center; gap: 4px; }

      .bd-price-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 18px 20px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        margin-bottom: 22px;
      }
      .bd-price {
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 38px);
        font-weight: 600;
        line-height: 1;
      }
      .bd-price__sub {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin-top: 4px;
      }
      .bd-actions { display: inline-flex; gap: 8px; flex-wrap: wrap; }
      .bd-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--fg);
        cursor: pointer;
        text-decoration: none;
        min-height: 40px;
      }
      .bd-action:hover { border-color: var(--accent); color: var(--accent); }
      .bd-action--watch.is-active {
        background: var(--accent);
        color: var(--bg);
        border-color: var(--accent);
      }
      .bd-action:disabled { cursor: not-allowed; opacity: 0.55; }

      .bd-section { margin-bottom: 28px; }
      .bd-section__title {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--fg-muted);
        margin: 0 0 10px;
      }
      .bd-prose {
        font-size: 15px;
        line-height: 1.65;
        color: var(--fg);
      }
      .bd-prose :is(p, ul, ol) { margin: 0 0 12px; }
      .bd-prose ul, .bd-prose ol { padding-left: 22px; }
      .bd-prose a { color: var(--accent); }
      .bd-lookingfor {
        padding: 14px 16px;
        background: var(--bg-elev);
        border-left: 3px solid var(--accent);
        font-style: italic;
        color: var(--fg);
      }
      .bd-spec {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 24px;
        margin: 0;
      }
      .bd-spec dt {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--fg-muted);
      }
      .bd-spec dd { margin: 4px 0 0; font-size: 14px; }

      .bd-side {
        position: sticky;
        top: 84px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-self: start;
      }
      .bd-card {
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .bd-card__head {
        padding: 12px 14px;
        border-bottom: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--fg);
      }
      .bd-card__body { padding: 14px; display: flex; flex-direction: column; gap: 14px; }

      .bd-seller {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .bd-seller__name {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 16px;
      }
      .bd-seller__meta {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
      }
      .bd-seller__rating { color: var(--accent); }
      .bd-seller__since {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .bd-contact { display: flex; flex-direction: column; gap: 8px; }
      .bd-contact textarea {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
        resize: vertical;
        min-height: 90px;
      }
      .bd-contact textarea:focus { outline: 1px solid var(--accent); border-color: var(--accent); }
      .bd-contact__ok {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .bd-contact__ok a {
        display: block;
        margin-top: 4px;
        color: var(--fg);
        text-decoration: underline;
        text-transform: none;
        letter-spacing: 0;
      }
      .bd-contact__err {
        font-family: var(--font-mono);
        font-size: 11px;
        color: #c0392b;
      }

      .bd-login-cta {
        display: block;
        text-align: center;
        padding: 12px;
        background: var(--accent);
        color: var(--bg);
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-decoration: none;
      }
      .bd-phone {
        margin: 0;
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--fg);
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .bd-gear-link {
        display: block;
        padding: 12px;
        background: var(--bg);
        border: 1px solid var(--line);
        text-decoration: none;
        color: var(--fg);
      }
      .bd-gear-link:hover { border-color: var(--accent); }
      .bd-gear-link__brand {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.16em;
      }
      .bd-gear-link__model {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 18px;
        margin: 4px 0 8px;
      }
      .bd-gear-link__cta {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }

      .bd-recently { gap: 8px; }
      .bd-recent {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 8px;
        padding: 8px 10px;
        background: var(--bg);
        border: 1px solid var(--line);
        text-decoration: none;
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .bd-recent:hover { border-color: var(--accent); }
      .bd-recent__price { font-weight: 600; }
      .bd-recent__cond { color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; align-self: center; }
      .bd-recent__loc { color: var(--fg-subtle); font-size: 10px; align-self: center; text-transform: uppercase; letter-spacing: 0.08em; }

      .bd-loading,
      .bd-empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
      }
      .bd-empty__back {
        display: block;
        text-align: center;
        color: var(--accent);
      }

      @media (max-width: 1100px) {
        .bd-main { grid-template-columns: 1fr; }
        .bd-side { position: static; }
      }
      @media (max-width: 720px) {
        .bd-price-bar { flex-direction: column; align-items: stretch; }
        .bd-actions { flex-direction: column; }
        .bd-action { justify-content: center; }
        .bd-spec { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class BazarDetailPage {
  readonly i18n = inject(I18nService);
  readonly bazar = inject(BazarService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly detail = signal<BazarListingDetail | null>(null);
  readonly recentlySold = signal<BazarListItem[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  readonly activeSourceId = signal<string | null>(null);
  readonly isWatched = signal(false);
  readonly watchPending = signal(false);

  contactBody = '';
  readonly contactPending = signal(false);
  readonly contactSuccess = signal(false);
  readonly contactError = signal<string | null>(null);

  readonly formatPrice = formatPrice;

  readonly photos = computed(() => {
    const all = this.detail()?.photos ?? [];
    // Group by sourceId, prefer the `landscape_4x3_large` variant for the hero.
    const bySource = new Map<string, typeof all>();
    for (const p of all) {
      const arr = bySource.get(p.sourceId) ?? [];
      arr.push(p);
      bySource.set(p.sourceId, arr);
    }
    const sources = Array.from(bySource.entries()).map(([sourceId, group]) => {
      const hero =
        group.find((g) => g.variant === 'landscape_4x3_large') ??
        group.find((g) => g.variant === 'landscape_4x3_medium') ??
        group[0];
      const thumb =
        group.find((g) => g.variant === 'square_thumb') ??
        group.find((g) => g.variant === 'square_medium') ??
        hero;
      return {
        sourceId,
        position: hero.position,
        path: hero.path,
        thumbPath: thumb.path,
      };
    });
    sources.sort((a, b) => a.position - b.position);
    return sources;
  });

  readonly heroPhoto = computed(() => {
    const ps = this.photos();
    if (ps.length === 0) return null;
    const active = this.activeSourceId();
    return ps.find((p) => p.sourceId === active) ?? ps[0];
  });

  readonly thumbs = computed(() =>
    this.photos().map((p) => ({ sourceId: p.sourceId, path: p.thumbPath })),
  );

  readonly isOwner = computed(() => {
    const user = this.auth.currentUser();
    const sellerId = this.detail()?.listing.sellerId;
    return !!(user && sellerId && user.id === sellerId);
  });

  readonly statusBanner = computed(() => {
    const l = this.detail()?.listing;
    if (!l) return null;
    switch (l.status) {
      case 'sold':
        return {
          kind: 'warn',
          label: this.i18n.t('bazar.detail.status_sold'),
        } as const;
      case 'expired':
        return {
          kind: 'warn',
          label: this.i18n.t('bazar.detail.status_expired'),
        } as const;
      case 'removed':
        return {
          kind: 'warn',
          label: this.i18n.t('bazar.detail.status_removed'),
        } as const;
      case 'draft':
        return {
          kind: 'info',
          label: this.i18n.t('bazar.detail.status_draft'),
        } as const;
      default:
        return null;
    }
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      void this.load(slug);
    });
  }

  private async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    this.contactSuccess.set(false);
    this.contactError.set(null);
    try {
      const d = await this.bazar.detail(slug);
      this.detail.set(d);
      this.applySeo(d);
      this.isWatched.set(d.isWatched);
      const firstSourceId = this.photos()[0]?.sourceId ?? null;
      this.activeSourceId.set(firstSourceId);
      // Recently sold sidebar — only when there's a Tezaur gear FK.
      if (d.gear?.id) {
        try {
          const sold = await this.bazar.recentlySold({
            gearId: d.gear.id,
            limit: 5,
          });
          // exclude the current listing if it appears (shouldn't, but defensive)
          this.recentlySold.set(
            sold.items.filter((i) => i.id !== d.listing.id),
          );
        } catch {
          this.recentlySold.set([]);
        }
      } else {
        this.recentlySold.set([]);
      }
    } catch (err) {
      console.error('[bazar] detail load failed', err);
      this.detail.set(null);
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleWatch(): Promise<void> {
    const d = this.detail();
    if (!d || !this.auth.isLoggedIn() || this.watchPending()) return;
    this.watchPending.set(true);
    const next = !this.isWatched();
    try {
      if (next) await this.bazar.watch(d.listing.id);
      else await this.bazar.unwatch(d.listing.id);
      this.isWatched.set(next);
    } catch (err) {
      console.error('[bazar] watch toggle failed', err);
    } finally {
      this.watchPending.set(false);
    }
  }

  async sendMessage(listingId: string): Promise<void> {
    const body = this.contactBody.trim();
    if (!body || this.contactPending()) return;
    this.contactPending.set(true);
    this.contactError.set(null);
    try {
      await this.bazar.startThread(listingId, body);
      this.contactSuccess.set(true);
      this.contactBody = '';
    } catch (err: unknown) {
      console.error('[bazar] send message failed', err);
      this.contactError.set(
        this.i18n.t('bazar.detail.message_error'),
      );
    } finally {
      this.contactPending.set(false);
    }
  }

  private applySeo(d: BazarListingDetail): void {
    const l = d.listing;
    const description = clampDescription(
      stripHtml(l.descriptionHtml) || `${l.title} — anunț Bazar Sintezaur`,
    );
    const heroPath = d.photos[0]?.path;
    const ogImage = uploadUrl(heroPath);
    const origin = window.location.origin;

    this.seo.set({
      title: `${l.title} · ${l.price} ${l.currency.toUpperCase()}`,
      description,
      ogImage,
      canonicalPath: `/bazar/${l.slug}`,
      ogType: 'product',
    });

    const conditionMap: Record<string, string> = {
      new: 'https://schema.org/NewCondition',
      mint: 'https://schema.org/NewCondition',
      very_good: 'https://schema.org/UsedCondition',
      good: 'https://schema.org/UsedCondition',
      fair: 'https://schema.org/UsedCondition',
      for_parts: 'https://schema.org/DamagedCondition',
    };
    const availability =
      l.status === 'active'
        ? 'https://schema.org/InStock'
        : l.status === 'sold'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/OutOfStock';

    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: l.title,
      description,
      image: ogImage ? [ogImage] : undefined,
      itemCondition: conditionMap[l.condition] ?? 'https://schema.org/UsedCondition',
      offers: {
        '@type': 'Offer',
        price: l.price,
        priceCurrency: l.currency.toUpperCase(),
        availability,
        url: `${origin}/bazar/${l.slug}`,
        areaServed: { '@type': 'Country', name: 'Romania' },
      },
    });
  }

  shippingCarriersLabel(carriers: string[]): string {
    return carriers
      .map((c) =>
        c
          .split('_')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' '),
      )
      .join(' · ');
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.i18n.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatYear(iso: string): string {
    return String(new Date(iso).getFullYear());
  }
}
