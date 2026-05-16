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
import { LocaleService } from '../i18n/locale.service';
import { SeoService } from '../seo/seo.service';
import { clampDescription, stripHtml, uploadUrl } from '../seo/seo.utils';
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
              <button sz-button variant="primary" (click)="quickListOnBazar(d.gear.id)">
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
            <button
              type="button"
              [class.is-active]="activeTab() === key"
              class="td-tab"
              (click)="selectTab(key, d.gear.slug)"
            >
              {{ 'tezaur.detail.tabs.' + key | t }}
              @if (key === 'recenzii' && d.gear.reviewCount > 0) {
                <span class="count">{{ d.gear.reviewCount }}</span>
              }
            </button>
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
      /* All .td-* / .bd-* / .bz-* structural classes are provided
         globally by v05.css — page-locals below cover only extras:
         buy panel, official-thread teaser, empty state, muted helper,
         gallery photo/placeholder when no V05 .gear-fill wrapper. */
      .muted {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .td-empty {
        padding: 48px;
        text-align: center;
        color: var(--fg-muted);
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .td-gallery__photo {
        position: absolute;
        inset: 0;
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
        font-size: 12px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }
      .td-buy {
        display: flex;
        flex-direction: column;
        padding: 12px;
        gap: 8px;
      }
      .td-buy__row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .td-buy__row a {
        flex: 1;
        min-width: 0;
      }
      .td-buy__note {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-muted);
        letter-spacing: 0.04em;
        margin: 0;
      }
      .td-official {
        display: block;
        padding: 18px 20px;
        text-decoration: none;
        color: var(--fg);
        background: var(--bg-elev);
        border: 1px solid var(--line);
        margin-top: 16px;
        transition: background 0.15s ease;
      }
      .td-official:hover {
        background: color-mix(in oklab, var(--bg-elev) 80%, var(--accent) 20%);
      }
      .td-official__head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .td-official__badge {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        padding: 2px 6px;
        border: 1px solid var(--accent);
        color: var(--accent);
      }
      .td-official__meta {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
      .td-official__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 18px;
        line-height: 1.15;
      }
    `,
  ],
})
export class TezaurDetailPage {
  readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  readonly auth = inject(AuthService);
  readonly tezaur = inject(TezaurService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private readonly seo = inject(SeoService);

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
      this.applySeo(d);
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

  private applySeo(d: TezaurDetail): void {
    const g = d.gear;
    const title = `${g.brand} ${g.model}`;
    const yearStr =
      g.yearReleased
        ? ` (${g.yearReleased}${g.yearDiscontinued ? `–${g.yearDiscontinued}` : ''})`
        : '';
    const descSource =
      d.description?.bodyHtml
        ? stripHtml(d.description.bodyHtml)
        : `${title}${yearStr} — specificații, fotografii, recenzii, prețuri și anunțuri pe Sintezaur.`;
    const description = clampDescription(descSource);
    const hero = d.images[0]?.path;
    const ogImage = uploadUrl(hero);
    const origin = window.location.origin;

    this.seo.set({
      title,
      description,
      ogImage,
      canonicalPath: `/tezaur/${g.slug}`,
      ogType: 'product',
    });

    const productData: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: title,
      brand: { '@type': 'Brand', name: g.brand },
      model: g.model,
      category: g.category,
      url: `${origin}/tezaur/${g.slug}`,
    };
    if (ogImage) productData['image'] = [ogImage];
    if (g.yearReleased) productData['releaseDate'] = String(g.yearReleased);
    if (g.reviewCount > 0 && g.avgRating) {
      productData['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: g.avgRating,
        reviewCount: g.reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }
    if (g.msrpAtLaunchEur) {
      productData['offers'] = {
        '@type': 'AggregateOffer',
        priceCurrency: 'EUR',
        lowPrice: g.msrpAtLaunchEur,
        availability:
          g.yearDiscontinued != null
            ? 'https://schema.org/Discontinued'
            : 'https://schema.org/InStock',
      };
    }
    this.seo.setJsonLd([
      productData,
      SeoService.breadcrumbList([
        { name: 'Acasă', path: '/' },
        { name: 'Tezaur', path: '/tezaur' },
        { name: title, path: `/tezaur/${g.slug}` },
      ]),
    ]);
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

  /**
   * Quick-list this gear on Bazar (spec §6.2 / §8.2). Navigates to the
   * new-listing form with `?gear=<id>` so the form can preselect the
   * Tezaur reference. The form falls back to a blank dropdown if the
   * id isn't recognised — degrades gracefully.
   */
  quickListOnBazar(gearId: string): void {
    void this.router.navigateByUrl(
      this.locale.localizeUrl(`/bazar/nou?gear=${encodeURIComponent(gearId)}`),
    );
  }

  /**
   * Switch the active tab. The tab slug is mirrored to the URL so the
   * page is deep-linkable, but the global router config has
   * `scrollPositionRestoration: 'top'` which would otherwise jump the
   * page to the header on every tab click — we save the current
   * scroll position before navigating and restore it on the next
   * frame.
   */
  selectTab(key: TabKey, slug: string): void {
    this.activeTab.set(key);
    const y = window.scrollY;
    void this.router
      .navigateByUrl(this.locale.localizeUrl(`/tezaur/${slug}/${key}`), {
        replaceUrl: true,
      })
      .then(() => {
        window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
      });
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
