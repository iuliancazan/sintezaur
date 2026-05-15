import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { USER_GEAR_STATUS_FLAGS, type UserGearStatusFlagLiteral } from '@sintezaur/shared';
import { SzAvatarComponent, SzBadgeComponent, SzButtonComponent, SzIconComponent } from '@sintezaur/ui';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { TezaurService, type TezaurDetail } from './tezaur.service';

type TabKey = 'detalii' | 'specs' | 'pret' | 'recenzii' | 'listari' | 'forum';

const TAB_KEYS: TabKey[] = ['detalii', 'specs', 'pret', 'recenzii', 'listari', 'forum'];

interface ReviewItem {
  id: string;
  rating: number;
  body: string;
  ownershipMonths: number | null;
  helpfulCount: number;
  createdAt: string;
  user: { id: string; username: string; initials: string };
}

interface ReviewsResponse {
  items: ReviewItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  aggregate: {
    avg: number | null;
    count: number;
    ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  };
}

@Component({
  selector: 'app-tezaur-detail-page',
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
        <nav class="td-crumb" aria-label="Breadcrumb">
          <a routerLink="/tezaur" class="td-crumb__back">
            <sz-icon name="back" [size]="14" />
            {{ 'tezaur.detail.back_to_list' | t }}
          </a>
          <span class="sep">·</span>
          <a routerLink="/tezaur">{{ 'tezaur.detail.breadcrumb_root' | t }}</a>
          <span class="sep">/</span>
          <span>{{ d.gear.brand }}</span>
          <span class="sep">/</span>
          <span class="cur">{{ d.gear.model }}</span>
        </nav>

        <!-- HERO -->
        <section class="td-hero crosses">
          <span class="crosses-tl"></span><span class="crosses-tr"></span>

          <div class="td-gallery">
            <div class="td-gallery__main">
              @if (currentImageUrl(); as img) {
                <img class="td-gallery__photo" [src]="img" [alt]="d.gear.brand + ' ' + d.gear.model" />
              } @else {
                <div class="td-gallery__ph">
                  <span>{{ d.gear.brand }} {{ d.gear.model }}</span>
                </div>
              }
              @if (galleryCount() > 1) {
                <div class="td-gallery__counter">
                  {{ paddedIndex() }} / {{ paddedCount() }}
                </div>
                <div class="td-gallery__nav">
                  <button type="button" aria-label="Previous" (click)="prevImage()">‹</button>
                  <button type="button" aria-label="Next" (click)="nextImage()">›</button>
                </div>
              }
            </div>
            @if (galleryCount() > 1) {
              <div class="td-gallery__thumbs">
                @for (img of galleryImages(); track img.url; let i = $index) {
                  <button
                    type="button"
                    class="td-thumb"
                    [class.is-active]="i === galleryIndex()"
                    (click)="setGalleryIndex(i)"
                    [attr.aria-label]="'Image ' + (i + 1)"
                  >
                    <img [src]="img.url" alt="" />
                  </button>
                }
              </div>
            }
          </div>

          <div class="td-info">
            <span class="td-info__brand">{{ d.gear.brand }}</span>
            <h1 class="td-info__model">{{ d.gear.model }}</h1>
            <div class="td-info__tags">
              @if (d.gear.specs['type']; as t) {
                <sz-badge variant="pill">{{ $any(t) }}</sz-badge>
              }
              <sz-badge variant="pill">{{ humanizeCategory(d.gear.category) }}</sz-badge>
              @if (d.gear.yearDiscontinued) {
                <sz-badge variant="pill">Vintage</sz-badge>
              }
            </div>

            <div class="td-info__stat-row">
              <div class="td-info__stat">
                <span class="k">// {{ 'tezaur.detail.stats.year_released' | t }}</span>
                <span class="v">{{ d.gear.yearReleased ?? '—' }}</span>
              </div>
              <div class="td-info__stat">
                <span class="k">// {{ 'tezaur.detail.stats.owners' | t }}</span>
                <span class="v accent">{{ d.gear.ownersPublicCount }}</span>
              </div>
              @if (d.gear.specs['polyphony']; as poly) {
                <div class="td-info__stat">
                  <span class="k">// {{ 'tezaur.detail.stats.polyphony' | t }}</span>
                  <span class="v">{{ $any(poly) }}</span>
                </div>
              }
            </div>

            @if (auth.isLoggedIn()) {
              <div class="td-info__collection">
                <span class="td-info__collection__label">// {{ 'tezaur.detail.collection.label' | t }}</span>
                <select [value]="''" (change)="onCollectionChange($any($event.target).value)">
                  <option value="" disabled selected>{{ 'tezaur.detail.collection.placeholder' | t }}</option>
                  @for (flag of statusFlags; track flag) {
                    <option [value]="flag">{{ 'tezaur.detail.collection.' + flag | t }}</option>
                  }
                </select>
              </div>
            }

            <div class="td-info__ctas">
              <button sz-button variant="primary">
                {{ 'tezaur.detail.ctas.sell' | t }}
              </button>
              @if (d.links.length) {
                <button sz-button variant="ghost">
                  {{ 'tezaur.detail.ctas.buy_from' | t }}
                </button>
              }
            </div>
          </div>
        </section>

        <!-- STICKY TABS -->
        <nav class="td-tabs">
          @for (key of tabKeys; track key) {
            <a
              [routerLink]="['/tezaur', d.gear.slug, key]"
              [class.is-active]="activeTab() === key"
              class="td-tab"
            >
              {{ 'tezaur.detail.tabs.' + key | t }}
              @if (key === 'recenzii' && d.gear.reviewCount > 0) {
                <span class="count">{{ d.gear.reviewCount }}</span>
              }
            </a>
          }
        </nav>

        <!-- MAIN -->
        <div class="td-main">
          <div>
            <!-- ----- DETALII ----- -->
            @if (activeTab() === 'detalii') {
              <section class="td-panel">
                @if (d.description; as desc) {
                  <article class="td-prose" [innerHTML]="desc.bodyHtml"></article>
                } @else {
                  <p class="muted">{{ 'app.loading' | t }}</p>
                }

                @if (d.siblings.length || d.relationships.parent.length || d.relationships.child.length) {
                  <section class="td-family">
                    <h3>{{ 'tezaur.detail.family.section_title' | t }}</h3>
                    <div class="td-family__row">
                      @for (sib of d.siblings; track sib.id) {
                        <a class="td-family__card" [routerLink]="['/tezaur', sib.slug]">
                          <div class="td-family__brand">// {{ sib.brand }}</div>
                          <div class="td-family__model">{{ sib.model }}</div>
                          <div class="td-family__year">{{ sib.yearReleased ?? '—' }}</div>
                        </a>
                      }
                    </div>
                  </section>
                }
              </section>
            }

            <!-- ----- SPECS ----- -->
            @if (activeTab() === 'specs') {
              <section class="td-panel">
                <div class="td-specs">
                  <section class="td-specs__sec">
                    <header class="td-specs__head">{{ 'tezaur.detail.specs_section.general' | t }}</header>
                    <div class="td-specs__rows">
                      <div class="td-specs__row">
                        <span class="k">Brand</span>
                        <span class="v">{{ d.gear.brand }}</span>
                      </div>
                      @if (d.gear.yearReleased) {
                        <div class="td-specs__row">
                          <span class="k">An lansare</span>
                          <span class="v">{{ d.gear.yearReleased }}</span>
                        </div>
                      }
                      @if (d.gear.yearDiscontinued) {
                        <div class="td-specs__row">
                          <span class="k">An discontinuare</span>
                          <span class="v">{{ d.gear.yearDiscontinued }}</span>
                        </div>
                      }
                      @if (d.gear.formFactor) {
                        <div class="td-specs__row">
                          <span class="k">Form factor</span>
                          <span class="v">{{ d.gear.formFactor }}</span>
                        </div>
                      }
                      @if (d.gear.msrpAtLaunchEur) {
                        <div class="td-specs__row">
                          <span class="k">MSRP la lansare</span>
                          <span class="v">€ {{ d.gear.msrpAtLaunchEur }}</span>
                        </div>
                      }
                      @if (d.gear.latestFirmwareVersion) {
                        <div class="td-specs__row">
                          <span class="k">Firmware</span>
                          <span class="v">{{ d.gear.latestFirmwareVersion }}</span>
                        </div>
                      }
                    </div>
                  </section>

                  @if (specsTypeFields().length) {
                    <section class="td-specs__sec">
                      <header class="td-specs__head">{{ 'tezaur.detail.specs_section.synthesis' | t }}</header>
                      <div class="td-specs__rows">
                        @for (row of specsTypeFields(); track row.key) {
                          <div class="td-specs__row">
                            <span class="k">{{ row.key }}</span>
                            <span class="v">{{ row.value }}</span>
                          </div>
                        }
                      </div>
                    </section>
                  }

                  @if (d.links.length) {
                    <section class="td-specs__sec">
                      <header class="td-specs__head">{{ 'tezaur.detail.specs_section.resources' | t }}</header>
                      <div class="td-specs__rows">
                        @for (link of d.links; track link.id) {
                          <div class="td-specs__row">
                            <span class="k">{{ link.kind }}</span>
                            <span class="v">
                              <a [href]="link.url" target="_blank" rel="noopener">
                                {{ link.label ?? link.url }} ↗
                              </a>
                            </span>
                          </div>
                        }
                      </div>
                    </section>
                  }
                </div>
              </section>
            }

            <!-- ----- PRET ----- -->
            @if (activeTab() === 'pret') {
              <section class="td-panel">
                <div class="td-empty">
                  <h3>{{ 'tezaur.detail.price_section.title' | t }}</h3>
                  <p>{{ 'tezaur.detail.price_section.empty' | t }}</p>
                </div>
              </section>
            }

            <!-- ----- RECENZII ----- -->
            @if (activeTab() === 'recenzii') {
              <section class="td-panel">
                @if (reviewsLoaded()) {
                  @if (reviews(); as r) {
                    <div class="td-reviews__agg">
                      <div class="td-reviews__score">
                        <div class="td-reviews__num">
                          {{ r.aggregate.avg !== null ? r.aggregate.avg.toFixed(1) : '—' }}
                        </div>
                        <div class="td-reviews__stars">{{ stars(r.aggregate.avg ?? 0) }}</div>
                        <div class="td-reviews__count">
                          {{ 'tezaur.detail.reviews_section.title_count' | t: { count: r.aggregate.count } }}
                        </div>
                      </div>
                      <div class="td-reviews__bars">
                        @for (star of ratingStars; track star) {
                          <div class="td-reviews__bar">
                            <span>{{ star }} ★</span>
                            <span class="track">
                              <span
                                class="fill"
                                [style.width.%]="barPercent(r.aggregate.ratingBreakdown[star], r.aggregate.count)"
                              ></span>
                            </span>
                            <span>{{ r.aggregate.ratingBreakdown[star] }}</span>
                          </div>
                        }
                      </div>
                    </div>

                    @if (auth.isLoggedIn() && !writingReview()) {
                      <button sz-button variant="cta" (click)="startReview()">
                        {{ 'tezaur.detail.reviews_section.write_review' | t }}
                      </button>
                    }

                    @if (writingReview()) {
                      <form class="td-review-form" (submit)="submitReview($event)">
                        <label class="td-review-form__field">
                          <span>{{ 'tezaur.detail.reviews_section.rating_label' | t }}</span>
                          <select [(ngModel)]="reviewRating" name="rating">
                            @for (n of [5,4,3,2,1]; track n) {
                              <option [value]="n">{{ n }} ★</option>
                            }
                          </select>
                        </label>
                        <label class="td-review-form__field">
                          <span>{{ 'tezaur.detail.reviews_section.body_label' | t }}</span>
                          <textarea
                            rows="6"
                            [(ngModel)]="reviewBody"
                            name="body"
                            [placeholder]="i18n.t('tezaur.detail.reviews_section.body_placeholder')"
                          ></textarea>
                        </label>
                        @if (reviewError()) {
                          <div class="td-review-form__error">{{ reviewError() }}</div>
                        }
                        <div class="td-review-form__row">
                          <button type="submit" sz-button variant="primary" [disabled]="reviewSubmitting()">
                            {{ 'tezaur.detail.reviews_section.submit' | t }}
                          </button>
                          <button type="button" sz-button variant="ghost" (click)="cancelReview()">
                            ×
                          </button>
                        </div>
                      </form>
                    }

                    @if (r.items.length) {
                      @for (review of r.items; track review.id) {
                        <article class="td-review">
                          <header class="td-review__head">
                            <sz-avatar [name]="review.user.username" size="sm" [fallback]="review.user.initials" />
                            <span class="name">@{{ review.user.username }}</span>
                            <span class="stars">{{ stars(review.rating) }}</span>
                            <span class="date">
                              {{ formatDate(review.createdAt) }}
                              @if (review.ownershipMonths) { · deține de {{ review.ownershipMonths }} luni }
                            </span>
                          </header>
                          <p class="td-review__body">{{ review.body }}</p>
                          <footer class="td-review__foot">
                            <span>{{ 'tezaur.detail.reviews_section.helpful' | t: { count: review.helpfulCount } }}</span>
                          </footer>
                        </article>
                      }
                    } @else {
                      <p class="muted">{{ 'tezaur.detail.reviews_section.empty' | t }}</p>
                    }
                  }
                } @else {
                  <p class="muted">{{ 'app.loading' | t }}</p>
                }
              </section>
            }

            <!-- ----- LISTARI ----- -->
            @if (activeTab() === 'listari') {
              <section class="td-panel">
                <div class="td-empty">
                  <p>{{ 'tezaur.detail.listings_section.empty' | t }}</p>
                </div>
              </section>
            }

            <!-- ----- FORUM ----- -->
            @if (activeTab() === 'forum') {
              <section class="td-panel">
                @if (d.officialThread; as ot) {
                  <a
                    class="td-official"
                    [routerLink]="['/forum', 'discutii-echipamente', ot.slug]"
                  >
                    <div class="td-official__head">
                      <span class="td-official__badge">{{ 'tezaur.detail.forum_section.official_badge' | t }}</span>
                      <span class="td-official__meta">
                        {{ ot.postCount }} {{ 'forum.posts_count' | t }}
                        @if (ot.lastPostAt) {
                          · {{ formatRelative(ot.lastPostAt) }}
                        }
                      </span>
                    </div>
                    <h3 class="td-official__title">{{ ot.title }}</h3>
                    <p class="td-official__lede">
                      {{ 'tezaur.detail.forum_section.official_lede' | t }}
                    </p>
                  </a>
                } @else {
                  <div class="td-empty">
                    <p>{{ 'tezaur.detail.forum_section.no_official' | t }}</p>
                  </div>
                }

                <div class="td-related-cta">
                  <a
                    class="td-related-link"
                    [routerLink]="['/forum/cautare']"
                    [queryParams]="{ gearId: d.gear.id }"
                  >
                    🔍
                    {{
                      'tezaur.detail.forum_section.related_cta' | t: { count: d.relatedThreadsCount }
                    }}
                  </a>
                </div>
              </section>
            }
          </div>

          <!-- SIDEBAR -->
          <aside class="td-sidebar">
            <section class="td-sidebar__block">
              <header class="td-sidebar__head">
                {{ 'tezaur.detail.sidebar.stats_title' | t }}
              </header>
              <div class="td-stat-grid">
                <div>
                  <span class="k">// {{ 'tezaur.detail.stats.owners' | t }}</span>
                  <span class="v accent">{{ d.gear.ownersPublicCount }}</span>
                </div>
                <div>
                  <span class="k">// {{ 'tezaur.detail.stats.threads' | t }}</span>
                  <span class="v">—</span>
                </div>
                <div>
                  <span class="k">// {{ 'tezaur.detail.stats.listings' | t }}</span>
                  <span class="v">—</span>
                </div>
              </div>
            </section>

            @if (d.family || d.siblings.length || d.relationships.parent.length || d.relationships.child.length) {
              <section class="td-sidebar__block">
                <header class="td-sidebar__head">{{ 'tezaur.detail.sidebar.family_title' | t }}</header>
                <div class="td-lineage">
                  @for (sib of d.siblings; track sib.id) {
                    <a class="td-lineage__item" [routerLink]="['/tezaur', sib.slug]">
                      <span class="td-lineage__role">→</span>
                      <span>{{ sib.brand }} {{ sib.model }} · {{ sib.yearReleased ?? '—' }}</span>
                    </a>
                  }
                  <div class="td-lineage__item is-current">
                    <span class="td-lineage__role">{{ 'tezaur.detail.family.current' | t }}</span>
                    <span>{{ d.gear.brand }} {{ d.gear.model }} · {{ d.gear.yearReleased ?? '—' }}</span>
                  </div>
                </div>
              </section>
            }

            @if (d.links.length) {
              <section class="td-sidebar__block">
                <header class="td-sidebar__head">{{ 'tezaur.detail.sidebar.buy_title' | t }}</header>
                <div class="td-buy">
                  @for (link of d.links; track link.id) {
                    <a [href]="link.url" target="_blank" rel="noopener" class="td-buy__row">
                      <span>{{ link.vendor ?? link.label ?? link.kind }}</span>
                      <span class="accent">↗</span>
                    </a>
                  }
                  <p class="td-buy__note">{{ 'tezaur.detail.sidebar.affiliate_note' | t }}</p>
                </div>
              </section>
            }
          </aside>
        </div>
      </div>
    } @else if (notFound()) {
      <div class="shell" style="padding: 80px 0;">
        <h1>404</h1>
        <p>Gear not found.</p>
        <a sz-button variant="ghost" routerLink="/tezaur">{{ 'tezaur.detail.back_to_list' | t }}</a>
      </div>
    } @else {
      <div class="shell" style="padding: 80px 0;">
        <p class="muted">{{ 'app.loading' | t }}</p>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }

      .td-crumb {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--fg-muted);
        padding: 24px 0 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .td-crumb a {
        color: var(--fg-muted);
        min-height: auto;
        min-width: auto;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .td-crumb a:hover { color: var(--accent); }
      .td-crumb .sep { opacity: 0.5; }
      .td-crumb .cur { color: var(--fg); }

      .td-hero {
        position: relative;
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 0;
        margin-bottom: 32px;
      }
      .td-gallery {
        display: flex;
        flex-direction: column;
        border-right: var(--grid-line) solid var(--line);
      }
      .td-gallery__main {
        position: relative;
        aspect-ratio: 4/3;
        background: var(--bg-card);
        overflow: hidden;
      }
      .td-gallery__photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .td-gallery__ph {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background:
          repeating-linear-gradient(135deg,
            color-mix(in oklab, var(--fg) 4%, transparent) 0 8px,
            transparent 8px 16px),
          linear-gradient(180deg, var(--bg-card-2), var(--bg-card));
        font-family: var(--font-mono);
        color: var(--fg-muted);
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .td-gallery__counter {
        position: absolute;
        top: 14px;
        left: 14px;
        padding: 4px 10px;
        background: var(--bg);
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        border: 1px solid var(--line-strong);
      }
      .td-gallery__nav {
        position: absolute;
        bottom: 14px;
        right: 14px;
        display: flex;
        gap: 6px;
      }
      .td-gallery__nav button {
        width: 32px;
        height: 32px;
        min-width: 32px;
        min-height: 32px;
        display: grid;
        place-items: center;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        transition: background 0.15s, color 0.15s;
      }
      .td-gallery__nav button:hover {
        background: var(--accent);
        color: var(--accent-fg);
        border-color: var(--accent);
      }
      .td-gallery__thumbs {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0;
        border-top: 1px solid var(--line);
      }
      .td-thumb {
        aspect-ratio: 1;
        background: var(--bg-card);
        border: 0;
        border-right: 1px solid var(--line);
        cursor: pointer;
        padding: 0;
        overflow: hidden;
        min-height: auto;
        min-width: auto;
        transition: background 0.12s;
      }
      .td-thumb:last-child { border-right: 0; }
      .td-thumb img { width: 100%; height: 100%; object-fit: cover; }
      .td-thumb.is-active { background: var(--bg-card-2); outline: 2px solid var(--accent); outline-offset: -2px; }

      .td-info {
        padding: clamp(28px, 4vw, 56px);
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .td-info__brand {
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .td-info__model {
        font-family: var(--font-display);
        font-size: clamp(40px, 5vw, 80px);
        line-height: 0.92;
        text-transform: uppercase;
        margin: 0;
        font-weight: 600;
        text-wrap: balance;
      }
      .td-info__tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .td-info__stat-row {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
        padding: 16px 0;
        border-top: 1px dashed var(--line);
        border-bottom: 1px dashed var(--line);
      }
      .td-info__stat .k {
        display: block;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin-bottom: 4px;
      }
      .td-info__stat .v {
        display: block;
        font-family: var(--font-display);
        font-size: 28px;
        font-weight: 600;
        line-height: 1;
      }
      .td-info__stat .v.accent { color: var(--accent); }

      .td-info__collection {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
      }
      .td-info__collection__label {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .td-info__collection select {
        flex: 1;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        padding: 8px 12px;
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg);
        cursor: pointer;
      }
      .td-info__collection select:focus { outline: none; border-color: var(--accent); }

      .td-info__ctas { display: flex; gap: 12px; flex-wrap: wrap; }

      .td-tabs {
        position: sticky;
        top: 64px;
        z-index: 50;
        display: flex;
        gap: 0;
        overflow-x: auto;
        border-bottom: 1px solid var(--line);
        background: color-mix(in oklab, var(--bg) 92%, transparent);
        backdrop-filter: blur(10px) saturate(140%);
        margin-bottom: 32px;
      }
      .td-tab {
        padding: 14px 22px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
        min-height: auto;
        min-width: auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .td-tab:hover { color: var(--fg); }
      .td-tab.is-active { color: var(--fg); border-bottom-color: var(--accent); }
      .td-tab .count {
        font-size: 10px;
        color: var(--fg-subtle);
      }

      .td-main {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 32px;
        margin-bottom: var(--gutter-y);
      }
      .td-panel {
        padding: 0;
      }

      /* M5-I — official forum thread card */
      .td-official {
        display: block;
        text-decoration: none;
        color: var(--fg);
        padding: 18px 20px;
        background: var(--bg-elev);
        border: 1px solid var(--line-strong);
        border-left: 3px solid var(--accent);
        margin-bottom: 18px;
      }
      .td-official:hover {
        background: color-mix(in oklab, var(--bg-elev) 80%, var(--accent) 20%);
      }
      .td-official__head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .td-official__badge {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        padding: 3px 8px;
        background: var(--accent);
        color: var(--accent-fg);
      }
      .td-official__meta {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
      }
      .td-official__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 20px;
        line-height: 1.2;
        margin: 0 0 6px;
      }
      .td-official__lede {
        margin: 0;
        color: var(--fg-muted);
        font-size: 13px;
      }
      .td-related-cta {
        margin-top: 12px;
      }
      .td-related-link {
        display: inline-block;
        padding: 8px 14px;
        background: transparent;
        border: 1px dashed var(--line-strong);
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-decoration: none;
      }
      .td-related-link:hover {
        background: var(--bg-elev);
      }

      /* prose */
      .td-prose {
        font-size: 16px;
        line-height: 1.65;
        max-width: 70ch;
      }
      .td-prose p { margin: 0 0 16px; color: var(--fg); }
      .td-prose h2 {
        font-family: var(--font-display);
        text-transform: uppercase;
        font-size: clamp(28px, 3vw, 40px);
        margin: 0 0 20px;
      }

      .td-family {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
      }
      .td-family h3 {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin: 0 0 14px;
      }
      .td-family h3::before { content: '// '; color: var(--accent); }
      .td-family__row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 0;
        border-left: 1px solid var(--line);
        border-top: 1px solid var(--line);
      }
      .td-family__card {
        padding: 14px;
        background: var(--bg-card);
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 6px;
        cursor: pointer;
        transition: background 0.15s;
        min-height: auto;
        min-width: auto;
        align-items: stretch;
      }
      .td-family__card:hover { background: var(--bg-card-2); }
      .td-family__brand {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
      }
      .td-family__model {
        font-family: var(--font-display);
        font-size: 18px;
        text-transform: uppercase;
        font-weight: 600;
        line-height: 1;
      }
      .td-family__year {
        margin-top: auto;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
      }

      /* specs */
      .td-specs { display: flex; flex-direction: column; gap: 32px; }
      .td-specs__sec { border-top: 1px solid var(--line); padding-top: 16px; }
      .td-specs__head {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg);
        margin-bottom: 12px;
      }
      .td-specs__head::before { content: '// '; color: var(--accent); }
      .td-specs__rows { display: flex; flex-direction: column; }
      .td-specs__row {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px dashed var(--line);
        font-size: 14px;
      }
      .td-specs__row:last-child { border-bottom: 0; }
      .td-specs__row .k {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        color: var(--fg-muted);
        text-transform: uppercase;
      }
      .td-specs__row .v a { color: var(--accent); display: inline; min-height: 0; min-width: 0; }

      /* reviews */
      .td-reviews__agg {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 32px;
        padding: 24px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        margin-bottom: 24px;
        align-items: center;
      }
      .td-reviews__num {
        font-family: var(--font-display);
        font-size: 64px;
        line-height: 1;
        font-weight: 600;
      }
      .td-reviews__stars {
        color: var(--accent);
        font-size: 18px;
        letter-spacing: 4px;
        margin: 4px 0;
      }
      .td-reviews__count {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        letter-spacing: 0.08em;
      }
      .td-reviews__bars { display: flex; flex-direction: column; gap: 6px; }
      .td-reviews__bar {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
      }
      .td-reviews__bar .track {
        height: 6px;
        background: var(--bg-card-2);
        border: 1px solid var(--line);
        position: relative;
      }
      .td-reviews__bar .fill { display: block; height: 100%; background: var(--accent); }

      .td-review {
        padding: 16px 0;
        border-bottom: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .td-review__head {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        flex-wrap: wrap;
      }
      .td-review__head .stars { color: var(--accent); }
      .td-review__head .name { color: var(--fg); }
      .td-review__body { color: var(--fg); margin: 0; }
      .td-review__foot {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
      }

      .td-review-form {
        background: var(--bg-elev);
        border: 1px solid var(--line);
        padding: 18px;
        margin-bottom: 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .td-review-form__field { display: flex; flex-direction: column; gap: 6px; }
      .td-review-form__field span {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .td-review-form__field select,
      .td-review-form__field textarea {
        padding: 10px 12px;
        background: var(--bg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-ui);
        font-size: 14px;
        color: var(--fg);
        outline: none;
        resize: vertical;
      }
      .td-review-form__field select:focus,
      .td-review-form__field textarea:focus { border-color: var(--accent); }
      .td-review-form__row { display: flex; gap: 8px; }
      .td-review-form__error {
        color: #d93025;
        font-family: var(--font-mono);
        font-size: 12px;
      }

      .td-empty {
        padding: 48px 32px;
        text-align: center;
        background: var(--bg-elev);
        border: 1px solid var(--line);
      }
      .td-empty h3 {
        font-family: var(--font-display);
        text-transform: uppercase;
        font-size: 28px;
        margin: 0 0 12px;
      }
      .td-empty p { color: var(--fg-muted); margin: 0; }

      /* sidebar */
      .td-sidebar {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: sticky;
        top: 130px;
        align-self: start;
      }
      .td-sidebar__block {
        background: var(--bg-elev);
        border: 1px solid var(--line);
      }
      .td-sidebar__head {
        padding: 12px 14px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg);
        border-bottom: 1px dashed var(--line);
      }
      .td-sidebar__head::before { content: '// '; color: var(--accent); }
      .td-stat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
      }
      .td-stat-grid > div {
        padding: 14px;
        border-right: 1px dashed var(--line);
        border-bottom: 1px dashed var(--line);
      }
      .td-stat-grid > div:nth-child(2n) { border-right: 0; }
      .td-stat-grid .k {
        display: block;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        color: var(--fg-muted);
        margin-bottom: 4px;
      }
      .td-stat-grid .v {
        display: block;
        font-family: var(--font-display);
        font-size: 24px;
        line-height: 1;
        font-weight: 600;
      }
      .td-stat-grid .v.accent { color: var(--accent); }

      .td-lineage { display: flex; flex-direction: column; }
      .td-lineage__item {
        padding: 12px 14px;
        border-bottom: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 13px;
        color: var(--fg);
        cursor: pointer;
        min-height: auto;
        min-width: auto;
        align-items: stretch;
      }
      .td-lineage__item:hover { background: var(--bg-card); }
      .td-lineage__item:last-child { border-bottom: 0; }
      .td-lineage__item.is-current {
        background: var(--bg-card);
        cursor: default;
      }
      .td-lineage__item.is-current:hover { background: var(--bg-card); }
      .td-lineage__role {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }

      .td-buy {
        display: flex;
        flex-direction: column;
        padding: 12px;
        gap: 8px;
      }
      .td-buy__row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 14px;
        background: var(--bg-card);
        border: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg);
        transition: border-color 0.12s;
        min-height: auto;
        min-width: auto;
      }
      .td-buy__row:hover { border-color: var(--accent); }
      .td-buy__row .accent { color: var(--accent); }
      .td-buy__note {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        margin: 0;
      }

      .muted { color: var(--fg-muted); margin: 0; }

      @media (max-width: 1100px) {
        .td-hero { grid-template-columns: 1fr; }
        .td-gallery { border-right: 0; border-bottom: 1px solid var(--line); }
        .td-main { grid-template-columns: 1fr; }
        .td-sidebar { position: static; }
      }
    `,
  ],
})
export class TezaurDetailPage {
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly tezaur = inject(TezaurService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  readonly statusFlags = USER_GEAR_STATUS_FLAGS;
  readonly tabKeys = TAB_KEYS;
  readonly ratingStars: (1 | 2 | 3 | 4 | 5)[] = [5, 4, 3, 2, 1];

  readonly detail = signal<TezaurDetail | null>(null);
  readonly notFound = signal(false);
  readonly activeTab = signal<TabKey>('detalii');
  readonly galleryIndex = signal(0);

  readonly reviews = signal<ReviewsResponse | null>(null);
  readonly reviewsLoaded = signal(false);

  readonly writingReview = signal(false);
  reviewRating = 5;
  reviewBody = '';
  readonly reviewError = signal<string | null>(null);
  readonly reviewSubmitting = signal(false);

  readonly galleryImages = computed(() => {
    const d = this.detail();
    if (!d) return [];
    // Pick `landscape_4x3_large` for the hero gallery; fallback to original.
    const groups = new Map<string, { sourceId: string; url: string }>();
    for (const img of d.images) {
      const existing = groups.get(img.sourceId);
      if (!existing || img.variant === 'landscape_4x3_large') {
        groups.set(img.sourceId, {
          sourceId: img.sourceId,
          url: this.tezaur.imageUrl(img.path),
        });
      }
    }
    return Array.from(groups.values());
  });

  readonly galleryCount = computed(() => this.galleryImages().length);
  readonly currentImageUrl = computed(() => {
    const imgs = this.galleryImages();
    return imgs[this.galleryIndex()]?.url ?? null;
  });
  readonly paddedIndex = computed(() => String(this.galleryIndex() + 1).padStart(2, '0'));
  readonly paddedCount = computed(() => String(this.galleryCount()).padStart(2, '0'));

  readonly specsTypeFields = computed(() => {
    const d = this.detail();
    if (!d) return [];
    const out: { key: string; value: string }[] = [];
    for (const [key, val] of Object.entries(d.gear.specs)) {
      if (key === 'type' || val === null || val === undefined) continue;
      out.push({ key, value: String(val) });
    }
    return out;
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      const tab = (params.get('tab') as TabKey | null) ?? 'detalii';
      this.activeTab.set(TAB_KEYS.includes(tab) ? tab : 'detalii');
      if (slug) {
        void this.fetch(slug);
      }
    });
  }

  private async fetch(slug: string): Promise<void> {
    this.notFound.set(false);
    try {
      const d = await this.tezaur.detail(slug);
      this.detail.set(d);
      this.galleryIndex.set(0);
      this.reviewsLoaded.set(false);
      this.reviews.set(null);
      // Pre-load reviews when on that tab.
      if (this.activeTab() === 'recenzii') void this.loadReviews(slug);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      if (httpErr.status === 404) {
        const redirectTo = (httpErr.error as { redirectTo?: string } | null)?.redirectTo;
        if (redirectTo) {
          void this.router.navigateByUrl(redirectTo);
          return;
        }
        this.notFound.set(true);
        this.detail.set(null);
      } else {
        console.error('[tezaur-detail] fetch failed', err);
      }
    }
  }

  async loadReviews(slug: string): Promise<void> {
    if (this.reviewsLoaded()) return;
    try {
      const res = await firstValueFrom(
        this.http.get<ReviewsResponse>(`${this.base}/tezaur/${slug}/reviews`),
      );
      this.reviews.set(res);
    } catch (err) {
      console.error('[tezaur-detail] reviews fetch failed', err);
      this.reviews.set(null);
    } finally {
      this.reviewsLoaded.set(true);
    }
  }

  humanizeCategory(cat: string): string {
    return cat
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  prevImage(): void {
    const total = this.galleryCount();
    if (total < 2) return;
    this.galleryIndex.update((i) => (i - 1 + total) % total);
  }
  nextImage(): void {
    const total = this.galleryCount();
    if (total < 2) return;
    this.galleryIndex.update((i) => (i + 1) % total);
  }
  setGalleryIndex(i: number): void {
    this.galleryIndex.set(i);
  }

  startReview(): void {
    this.reviewError.set(null);
    this.reviewBody = '';
    this.reviewRating = 5;
    this.writingReview.set(true);
  }
  cancelReview(): void {
    this.writingReview.set(false);
    this.reviewError.set(null);
  }
  async submitReview(event: Event): Promise<void> {
    event.preventDefault();
    const d = this.detail();
    if (!d) return;
    if (!this.reviewBody || this.reviewBody.length < 20) {
      this.reviewError.set('Recenzia trebuie să aibă cel puțin 20 caractere.');
      return;
    }
    this.reviewSubmitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          `${this.base}/me/reviews/${d.gear.id}`,
          { rating: this.reviewRating, body: this.reviewBody },
          { withCredentials: true },
        ),
      );
      this.writingReview.set(false);
      this.reviewsLoaded.set(false);
      this.reviews.set(null);
      void this.loadReviews(d.gear.slug);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      if (httpErr.status === 409) {
        this.reviewError.set('Ai deja o recenzie pentru acest gear.');
      } else if (httpErr.status === 401) {
        this.reviewError.set('Trebuie să te autentifici pentru a scrie recenzii.');
      } else {
        this.reviewError.set('Eroare la trimitere. Încearcă mai târziu.');
      }
    } finally {
      this.reviewSubmitting.set(false);
    }
  }

  async onCollectionChange(status: UserGearStatusFlagLiteral | ''): Promise<void> {
    if (!status) return;
    const d = this.detail();
    if (!d) return;
    try {
      await firstValueFrom(
        this.http.post(
          `${this.base}/me/gear-status`,
          { gearId: d.gear.id, status, isPublic: true },
          { withCredentials: true },
        ),
      );
      // Optimistic update for owners count when status=owned.
      if (status === 'owned') {
        this.detail.update((curr) =>
          curr ? { ...curr, gear: { ...curr.gear, ownersPublicCount: curr.gear.ownersPublicCount + 1 } } : curr,
        );
      }
    } catch (err) {
      console.error('[tezaur-detail] collection update failed', err);
    }
  }

  stars(n: number): string {
    const full = Math.round(n);
    return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
  }

  barPercent(count: number, total: number): number {
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const day = Math.round(diff / 86_400_000);
    if (day < 1) return 'azi';
    if (day < 7) return `acum ${day} zile`;
    if (day < 30) return `acum ${Math.round(day / 7)} săpt`;
    return this.formatDate(iso);
  }
}
