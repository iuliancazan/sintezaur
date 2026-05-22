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
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { clampDescription, stripHtml, uploadUrl } from '../seo/seo.utils';
import { TPipe } from '../i18n/t.pipe';
import { BlockButtonComponent } from '../blocks/block-button.component';
import { ReportButtonComponent } from '../reports/report-button.component';
import {
  BazarService,
  type BazarListItem,
  type BazarListingDetail,
} from './bazar.service';

/**
 * Bazar listing detail — V05 design 1:1 (M13-C2).
 *
 * Layout:
 *   .td-crumb (breadcrumb) →
 *   .bd-hero { .bd-gallery + .bd-info(price/chips/deal/CTAs) } →
 *   .bd-main { left: .bd-desc + .bd-mini-specs + .bd-similar + delivery
 *              right: .bd-sidebar { seller, safety, contact-form } }
 *
 * All visual styling is provided globally by `v05.css`. Page-local
 * styles cover only seller block internals and the contact form
 * textarea (no equivalent in v05.css).
 */
@Component({
  selector: 'app-bazar-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TPipe,
    BlockButtonComponent,
    ReportButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (detail(); as d) {
      <div class="shell">
        <!-- BREADCRUMB (V05: .td-crumb) -->
        <nav class="td-crumb" aria-label="Breadcrumb">
          <a routerLink="/bazar" style="display:inline-flex;align-items:center;gap:6px;color:var(--accent);">
            <svg width="14" height="14"><use href="#i-back"/></svg>
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

        <!-- HERO (V05: .bd-hero with .bd-gallery + .bd-info) -->
        <section class="bd-hero crosses">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>

          <div class="bd-gallery">
            <div class="bd-gallery__main">
              <span class="bd-gallery__chip">{{ 'bazar.condition.' + d.listing.condition | t }}</span>
              @if (heroPhoto(); as h) {
                <div class="gear-fill">
                  <img class="gear-fill__photo" [src]="bazar.imageUrl(h.path)" [alt]="d.listing.title" />
                </div>
              } @else {
                <div class="gear-fill">
                  <span class="gear-fill__label">{{ 'bazar.detail.no_photos' | t }}</span>
                </div>
              }
              @if (photos().length > 1) {
                <div class="bd-gallery__counter">
                  {{ activeIndex() + 1 }} / {{ photos().length }}
                </div>
                <div class="bd-gallery__nav">
                  <button type="button" aria-label="Anterior" (click)="prevPhoto()">‹</button>
                  <button type="button" aria-label="Următorul" (click)="nextPhoto()">›</button>
                </div>
              }
            </div>
            @if (photos().length > 1) {
              <div class="bd-gallery__thumbs">
                @for (p of photos(); track p.sourceId) {
                  <button
                    type="button"
                    class="bd-thumb"
                    [class.is-active]="p.sourceId === activeSourceId()"
                    (click)="activeSourceId.set(p.sourceId)"
                  >
                    <div class="gear-fill">
                      <img class="gear-fill__photo" [src]="bazar.imageUrl(p.thumbPath)" alt="" />
                    </div>
                  </button>
                }
              </div>
            }
          </div>

          <div class="bd-info">
            <div class="bd-info__topline">
              <span class="bd-info__brand">
                @if (d.gear) {
                  <a [routerLink]="['/tezaur']" [queryParams]="{ brand: d.gear.brand }">
                    {{ d.gear.brand }}
                  </a>
                  <span class="sep">·</span>
                  <a [routerLink]="['/tezaur', d.gear.slug]">
                    {{ d.gear.model }}
                  </a>
                  <span class="sep">·</span>
                } @else if (d.listing.rawMake || d.listing.rawModel) {
                  @if (d.listing.rawMake) {
                    <span>{{ d.listing.rawMake }}</span>
                    <span class="sep">·</span>
                  }
                  @if (d.listing.rawModel) {
                    <span>{{ d.listing.rawModel }}</span>
                    <span class="sep">·</span>
                  }
                }
                <span>{{ 'bazar.kind.' + d.listing.kind | t }}</span>
              </span>
              <span class="bd-info__status">
                {{ 'bazar.detail.status_' + d.listing.status | t }}
              </span>
            </div>
            <h1 class="bd-info__title">{{ d.listing.title }}</h1>

            <div class="bd-info__price-row">
              <div class="bd-info__price">
                {{ formatPriceShort(d.listing.price) }}<small>{{ d.listing.currency | uppercase }}</small>
              </div>
              @if (d.listing.acceptsOffers) {
                <div class="bd-info__price-side">
                  <span class="bd-info__price-delta">{{ 'bazar.detail.offers_welcome' | t }}</span>
                </div>
              }
            </div>

            <div class="bd-info__chips">
              <span class="bd-info__chip">
                <svg><use href="#i-pin"/></svg>
                {{ d.listing.location }}
              </span>
              <span class="bd-info__chip">
                <svg><use href="#i-truck"/></svg>
                {{ 'bazar.delivery.' + d.listing.delivery | t }}
              </span>
              @if (d.listing.acceptsOffers) {
                <span class="bd-info__chip is-accent">{{ 'bazar.detail.negotiable' | t }} ↕</span>
              }
            </div>

            <div class="bd-info__deal">
              <div class="bd-info__deal-cell">
                <span class="k">// {{ 'bazar.detail.transaction' | t }}</span>
                <span class="v">{{ 'bazar.kind.' + d.listing.kind | t }}</span>
              </div>
              @if (d.listing.shippingCost) {
                <div class="bd-info__deal-cell">
                  <span class="k">// {{ 'bazar.detail.shipping_cost' | t }}</span>
                  <span class="v">{{ formatPrice(d.listing.shippingCost, d.listing.currency) }}</span>
                </div>
              } @else {
                <div class="bd-info__deal-cell">
                  <span class="k">// {{ 'bazar.detail.posted' | t }}</span>
                  <span class="v">{{ formatDate(d.listing.createdAt) }}</span>
                </div>
              }
            </div>

            <div class="bd-info__ctas">
              @if (isOwner()) {
                <a class="bd-info__cta bd-info__cta--primary" [routerLink]="['/bazar', d.listing.slug, 'editare']">
                  {{ 'bazar.detail.edit' | t }}
                </a>
                <a class="bd-info__cta bd-info__cta--ghost" routerLink="/cont/anunturile-mele">
                  {{ 'bazar.detail.my_listings' | t }} →
                </a>
                <span class="bd-info__cta bd-info__cta--icon">
                  <svg><use href="#i-eye"/></svg>
                </span>
              } @else {
                <button
                  type="button"
                  class="bd-info__cta bd-info__cta--primary"
                  (click)="focusContactForm()"
                  [disabled]="d.listing.status !== 'active'"
                >
                  {{ 'bazar.detail.send_message' | t }}
                </button>
                @if (d.listing.acceptsOffers) {
                  <button
                    type="button"
                    class="bd-info__cta bd-info__cta--ghost"
                    (click)="focusContactForm()"
                    [disabled]="d.listing.status !== 'active'"
                  >
                    {{ 'bazar.detail.make_offer' | t }} →
                  </button>
                } @else {
                  <a class="bd-info__cta bd-info__cta--ghost" routerLink="/bazar">
                    {{ 'bazar.detail.see_more' | t }} →
                  </a>
                }
                <button
                  type="button"
                  class="bd-info__cta bd-info__cta--icon"
                  [class.is-on]="isWatched()"
                  (click)="toggleWatch()"
                  [disabled]="watchPending() || !auth.isLoggedIn()"
                  [attr.aria-label]="(isWatched() ? 'bazar.detail.watching' : 'bazar.detail.watch') | t"
                >
                  <svg><use href="#i-heart"/></svg>
                </button>
              }
            </div>

            <div class="bd-info__posted">
              <span>
                <span class="accent">{{ 'bazar.detail.posted' | t }}</span>
                · {{ formatDate(d.listing.createdAt) }}
              </span>
              <span>
                <svg width="11" height="11" style="display:inline-block;vertical-align:-1px;margin-right:4px"><use href="#i-eye"/></svg>
                {{ d.listing.viewCount }} {{ 'bazar.detail.views' | t }}
              </span>
            </div>
          </div>
        </section>

        <!-- MAIN: description + sidebar (V05: .bd-main) -->
        <div class="bd-main">
          <div>
            @if (d.listing.descriptionHtml) {
              <section class="bd-desc">
                <h2>{{ 'bazar.detail.about_this_item' | t }}</h2>
                <div class="bd-desc__body" [innerHTML]="d.listing.descriptionHtml"></div>
              </section>
            }

            @if (d.listing.lookingFor) {
              <section class="bd-desc">
                <h2>{{ 'bazar.detail.looking_for' | t }}</h2>
                <p>{{ d.listing.lookingFor }}</p>
              </section>
            }

            @if (d.listing.conditionNote) {
              <section class="bd-desc">
                <h2>{{ 'bazar.detail.condition_note' | t }}</h2>
                <p>{{ d.listing.conditionNote }}</p>
              </section>
            }

            <!-- Mini-specs (V05: link to Tezaur if gear linked) -->
            @if (d.gear) {
              <section class="bd-mini-specs">
                <header class="bd-mini-specs__head">
                  <h3>{{ 'bazar.detail.specs_short' | t }}</h3>
                  <a class="block__cta" [routerLink]="['/tezaur', d.gear.slug]">
                    {{ 'bazar.detail.view_tezaur' | t }}
                  </a>
                </header>
                <div class="bd-mini-specs__body">
                  <div class="bd-mini-specs__row"><span class="k">{{ 'bazar.detail.brand' | t }}</span><span class="v">{{ d.gear.brand }}</span></div>
                  <div class="bd-mini-specs__row"><span class="k">{{ 'bazar.detail.model' | t }}</span><span class="v">{{ d.gear.model }}</span></div>
                </div>
              </section>
            }

            <!-- Similar (V05: .bd-similar; use recentlySold from same gear) -->
            @if (recentlySold().length > 0) {
              <section class="bd-similar">
                <header class="bd-similar__head">
                  <h3>{{ 'bazar.detail.recently_sold' | t }}<span style="color:var(--accent)">.</span></h3>
                  <span class="sub">{{ recentlySold().length }} {{ 'bazar.detail.tx_completed' | t }}</span>
                </header>
                <div class="bz-grid">
                  @for (s of recentlySold(); track s.id) {
                    <a class="listing" [routerLink]="['/bazar', s.slug]" style="text-decoration:none;color:inherit;">
                      <div class="listing__media">
                        <div class="gear-fill">
                          @if (s.thumb) {
                            <img class="gear-fill__photo" [src]="bazar.imageUrl(s.thumb)" [alt]="s.title" loading="lazy" />
                          }
                          <span class="gear-fill__label">{{ s.brand }} · {{ s.model }}</span>
                        </div>
                        <span class="listing__chip" [attr.data-cond]="s.condition">{{ 'bazar.condition.' + s.condition | t }}</span>
                      </div>
                      <div class="listing__body">
                        <div class="listing__brand">// {{ s.brand || '—' }}</div>
                        <div class="listing__title">{{ s.model || s.title }}</div>
                        <div class="listing__row">
                          <div class="listing__price">{{ formatPriceShort(s.price) }}<small>{{ s.currency | uppercase }}</small></div>
                          <div class="listing__loc">
                            <svg width="11" height="11"><use href="#i-pin"/></svg>
                            {{ s.location }}
                          </div>
                        </div>
                      </div>
                    </a>
                  }
                </div>
              </section>
            }
          </div>

          <!-- SIDEBAR (V05: .bd-sidebar) -->
          <aside class="bd-sidebar">
            <section class="bd-sidebar__block">
              <header class="bd-sidebar__head">{{ 'bazar.detail.seller' | t }}</header>
              <div class="bd-seller">
                <div class="bd-seller__row">
                  <span class="bd-seller__avatar">{{ initials(d.seller.username) }}</span>
                  <div>
                    <div class="bd-seller__name">{{ d.seller.username }}</div>
                    <div class="bd-seller__handle">
                      &#64;{{ d.seller.username }} ·
                      {{ 'bazar.detail.member_since' | t: { date: formatYear(d.seller.createdAt) } }}
                    </div>
                  </div>
                </div>

                <div class="bd-seller__stats">
                  <div class="bd-seller__stat">
                    <span class="v accent">{{ d.seller.avgRating ?? '—' }}</span>
                    <span class="k">★ {{ 'bazar.detail.rating' | t }}</span>
                  </div>
                  <div class="bd-seller__stat">
                    <span class="v">{{ d.seller.transactionCount }}</span>
                    <span class="k">{{ 'bazar.detail.sales' | t }}</span>
                  </div>
                  <div class="bd-seller__stat">
                    <span class="v">{{ d.seller.reviewCount }}</span>
                    <span class="k">{{ 'bazar.detail.reviews' | t }}</span>
                  </div>
                </div>

                @if (!isOwner() && auth.isLoggedIn()) {
                  <div class="bd-seller__rows">
                    <app-report-button
                      targetType="listing"
                      [targetId]="d.listing.id"
                      [authorUserId]="d.seller.id"
                    />
                    <app-block-button
                      [userId]="d.seller.id"
                      [username]="d.seller.username"
                    />
                  </div>
                }

                @if (!isOwner() && d.listing.status === 'active') {
                  @if (auth.isLoggedIn()) {
                    <div class="bd-contact" #contactBlock>
                      @if (contactSuccess()) {
                        <p class="bd-contact__ok">
                          ✓ {{ 'bazar.detail.message_sent' | t }}
                          <a routerLink="/cont/mesaje">{{ 'bazar.detail.go_to_inbox' | t }} →</a>
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
                          type="button"
                          class="bd-info__cta bd-info__cta--primary"
                          (click)="sendMessage(d.listing.id)"
                          [disabled]="!contactBody.trim() || contactPending()"
                        >
                          {{ (contactPending() ? 'bazar.detail.sending' : 'bazar.detail.send_message') | t }}
                        </button>
                      }
                    </div>
                  } @else {
                    <a routerLink="/login" class="bd-info__cta bd-info__cta--ghost" style="text-align:center;display:block;margin-top:14px;">
                      {{ 'bazar.detail.login_to_message' | t }}
                    </a>
                  }
                }

                @if (d.listing.contactPhone) {
                  <p class="bd-phone">
                    <svg width="12" height="12"><use href="#i-bell"/></svg>
                    <strong>{{ d.listing.contactPhone }}</strong>
                  </p>
                }
              </div>
            </section>

            <!-- Safety tips (V05: .bd-safety) -->
            <section class="bd-sidebar__block">
              <header class="bd-sidebar__head">{{ 'bazar.detail.safety_title' | t }}</header>
              <div class="bd-safety">
                <div class="bd-safety__item">
                  <span class="ico">1</span>
                  <span class="txt"><strong>{{ 'bazar.detail.safety_1_title' | t }}</strong> {{ 'bazar.detail.safety_1_body' | t }}</span>
                </div>
                <div class="bd-safety__item">
                  <span class="ico">2</span>
                  <span class="txt"><strong>{{ 'bazar.detail.safety_2_title' | t }}</strong> {{ 'bazar.detail.safety_2_body' | t }}</span>
                </div>
                <div class="bd-safety__item">
                  <span class="ico">3</span>
                  <span class="txt"><strong>{{ 'bazar.detail.safety_3_title' | t }}</strong> {{ 'bazar.detail.safety_3_body' | t }}</span>
                </div>
                <div class="bd-safety__item">
                  <span class="ico">4</span>
                  <span class="txt"><strong>{{ 'bazar.detail.safety_4_title' | t }}</strong> {{ 'bazar.detail.safety_4_body' | t }}</span>
                </div>
              </div>
            </section>
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

      /* Page-local extras NOT covered by v05.css */
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

      .bd-info__cta--icon.is-on { color: var(--accent); border-color: var(--accent); }

      /* Description body — fits V05 prose look without redefining typography */
      .bd-desc__body p {
        font-size: 15.5px;
        line-height: 1.65;
        margin: 0 0 16px;
        color: var(--fg);
        text-wrap: pretty;
      }
      .bd-desc__body strong { color: var(--accent); font-weight: 600; }

      /* Seller block internals (not in v05.css) */
      .bd-seller {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 14px 18px;
      }
      .bd-seller__row { display: flex; align-items: center; gap: 12px; }
      .bd-seller__avatar {
        width: 44px; height: 44px;
        display: inline-grid; place-items: center;
        background: var(--bg-card-2);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-weight: 600;
        font-size: 14px;
        color: var(--fg);
      }
      .bd-seller__name { font-weight: 600; font-size: 14px; }
      .bd-seller__handle {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        margin-top: 2px;
      }
      .bd-seller__stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0;
        border-top: 1px dashed var(--line);
        border-bottom: 1px dashed var(--line);
        padding: 12px 0;
      }
      .bd-seller__stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: center;
        text-align: center;
        border-right: 1px dashed var(--line);
      }
      .bd-seller__stat:last-child { border-right: 0; }
      .bd-seller__stat .v {
        font-family: var(--font-display);
        font-size: 22px;
        font-weight: 600;
        line-height: 1;
      }
      .bd-seller__stat .v.accent { color: var(--accent); }
      .bd-seller__stat .k {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .bd-seller__rows {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      /* Contact form */
      .bd-contact {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 4px;
      }
      .bd-contact textarea {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
        resize: vertical;
        min-height: 88px;
      }
      .bd-contact textarea:focus { outline: 0; border-color: var(--accent); }
      .bd-contact__ok {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.06em;
        margin: 0;
      }
      .bd-contact__ok a { color: var(--fg); text-decoration: underline; }
      .bd-contact__err {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        margin: 0;
      }

      .bd-phone {
        margin: 0;
        padding: 10px 12px;
        background: var(--bg-card);
        border: 1px dashed var(--line);
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--fg);
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      /* Safety tips block */
      .bd-safety {
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .bd-safety__item {
        display: grid;
        grid-template-columns: 22px 1fr;
        gap: 10px;
        font-size: 12.5px;
        line-height: 1.45;
        color: var(--fg-muted);
      }
      .bd-safety__item .ico {
        width: 22px; height: 22px;
        display: inline-grid; place-items: center;
        background: var(--bg-card);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        color: var(--accent);
      }
      .bd-safety__item strong { color: var(--fg); font-weight: 600; }

      /* Similar grid using v05.css's .bz-grid */
      .bd-similar { margin-bottom: 24px; }
      .bd-similar__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-bottom: 14px;
      }
      .bd-similar__head h3 {
        font-family: var(--font-display);
        font-size: clamp(24px, 2.5vw, 36px);
        font-weight: 600;
        line-height: 0.95;
        text-transform: uppercase;
        margin: 0;
        padding-top: 0.18em;
      }
      .bd-similar__head .sub {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }

      .bd-loading, .bd-empty {
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
        .bd-seller__stats { grid-template-columns: 1fr 1fr 1fr; }
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

  readonly activeIndex = computed(() => {
    const ps = this.photos();
    if (ps.length === 0) return 0;
    const active = this.activeSourceId();
    const idx = ps.findIndex((p) => p.sourceId === active);
    return idx < 0 ? 0 : idx;
  });

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
        return { kind: 'warn', label: this.i18n.t('bazar.detail.status_sold') } as const;
      case 'expired':
        return { kind: 'warn', label: this.i18n.t('bazar.detail.status_expired') } as const;
      case 'removed':
        return { kind: 'warn', label: this.i18n.t('bazar.detail.status_removed') } as const;
      case 'draft':
        return { kind: 'info', label: this.i18n.t('bazar.detail.status_draft') } as const;
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
      if (d.gear?.id) {
        try {
          const sold = await this.bazar.recentlySold({ gearId: d.gear.id, limit: 5 });
          this.recentlySold.set(sold.items.filter((i) => i.id !== d.listing.id));
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

  prevPhoto(): void {
    const ps = this.photos();
    if (ps.length < 2) return;
    const idx = this.activeIndex();
    const next = (idx - 1 + ps.length) % ps.length;
    this.activeSourceId.set(ps[next].sourceId);
  }

  nextPhoto(): void {
    const ps = this.photos();
    if (ps.length < 2) return;
    const idx = this.activeIndex();
    const next = (idx + 1) % ps.length;
    this.activeSourceId.set(ps[next].sourceId);
  }

  focusContactForm(): void {
    if (typeof document === 'undefined') return;
    const el = document.querySelector<HTMLTextAreaElement>('.bd-contact textarea');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Logged-out path → push them to login.
      void this.router.navigate(['/login']);
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
      this.contactError.set(this.i18n.t('bazar.detail.message_error'));
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

    this.seo.setJsonLd([
      {
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
      },
      SeoService.breadcrumbList([
        { name: 'Acasă', path: '/' },
        { name: 'Bazar', path: '/bazar' },
        { name: l.title, path: `/bazar/${l.slug}` },
      ]),
    ]);
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

  formatPriceShort(price: string | number): string {
    const n = typeof price === 'number' ? price : Number(price);
    if (!isFinite(n)) return String(price);
    return n.toLocaleString('ro-RO', { maximumFractionDigits: 0 });
  }

  initials(name: string): string {
    if (!name) return '—';
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
