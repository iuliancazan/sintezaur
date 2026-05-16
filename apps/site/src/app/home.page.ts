import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppConfigService } from '@sintezaur/ui';
import { AuthService } from './auth/auth.service';
import { BazarService, BazarListItem } from './bazar/bazar.service';
import { I18nService } from './i18n/i18n.service';
import { TPipe } from './i18n/t.pipe';
import { ForumService, ThreadListItem } from './forum/forum.service';
import { ArticleListItem, RevistaService } from './revista/revista.service';
import { SeoService } from './seo/seo.service';
import { TezaurListItem, TezaurService } from './tezaur/tezaur.service';

/**
 * Home — site landing page, V05 design 1:1 (M13-B).
 *
 * Shell-aware: when `auth.isLoggedIn()`, a welcome strip renders
 * between topbar and hero. The CTA strip swaps its left tile:
 * - Guest: "Fă-ți cont" + signup CTA
 * - Logged-in: "Postează" with three quick-action ghost buttons
 *   (anunț nou / thread nou / propune articol)
 *
 * Data sources (lazy, no blocking):
 * - Revista: latest 4 articles (`revista.list({sort:'newest', pageSize:4})`)
 *   → hero (article[0]) + grid big (article[1]) + 2 side smalls.
 * - Bazar: latest 8 listings (`bazar.list({pageSize:8})`) → horizontal
 *   scroll carousel.
 * - Tezaur: popular 1 (`{sort:'popular', pageSize:1}`) → spotlight;
 *   popular 6 (skipping spotlight pick) → catalog grid.
 * - Forum threads + pulse cells: static stubs (no "recent across all
 *   categories" endpoint yet — issue tracked for M13-F backend follow-up).
 *
 * Each section falls back to graceful `—` placeholders when loading or
 * when its endpoint returns empty (matches M12 dashboard pattern).
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      /* Forum recent — list view for the home page "Se vorbește" block.
         Lives in the component (not v05.css) since it's home-specific. */
      .forum-recent {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        border-top: 1px solid var(--line);
      }
      .forum-recent__item {
        padding: 14px 20px;
        border-bottom: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .forum-recent__item:hover { background: var(--bg-card-2); }
      .forum-recent__title {
        font-family: var(--font-display);
        font-size: 18px;
        color: var(--fg);
        text-decoration: none;
        line-height: 1.3;
      }
      .forum-recent__title:hover { color: var(--accent); }
      .forum-recent__meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.04em;
        color: var(--fg-muted);
      }
      .forum-recent__meta .avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        border: 1px solid var(--line);
        color: var(--fg);
        font-family: var(--font-mono);
        text-transform: uppercase;
        margin-right: 4px;
        vertical-align: middle;
      }
      .forum-recent__cat {
        color: var(--accent);
        text-decoration: none;
      }
      .forum-recent__meta .sep { opacity: 0.4; }

      /* Pattern-only fallback when the image hides itself (onerror) keeps
         the label readable instead of collapsing the tile. */
      .gear-fill__photo:not([src]) { display: none; }

      /* Long hero titles overflow the column at the default clamp
         (max 88px). When the title exceeds ~30 chars we switch to a
         tighter scale so the lede + footer stay visible above the fold. */
      :host .hero__title--compact {
        font-size: clamp(28px, 3vw, 44px);
        line-height: 1.05;
      }

      /* Hero photo: stop cropping. Show the whole image with
         object-fit:contain, and fill the surrounding letterbox with a
         heavily-blurred copy of the same photo so we keep a fixed-size
         media tile without dead pixels. Scope is .hero__media only —
         every other card keeps its cover-crop. */
      :host .hero__media { position: relative; overflow: hidden; }
      :host .hero__bg-blur {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        /* Scale up so the blur doesn't bleed transparent edges in, and
           drop saturation/brightness so the foreground stays the focus. */
        transform: scale(1.15);
        filter: blur(28px) saturate(1.15) brightness(0.75);
        z-index: 0;
        pointer-events: none;
        user-select: none;
      }
      /* .gear-fill ships with its own striped/gradient background — fine
         on card thumbnails (pattern shows when no photo loads), but
         inside the hero it covers our blurred backdrop. Strip the
         background in this scope so layers stack: blur → photo. */
      :host .hero__media .gear-fill {
        z-index: 1;
        background: transparent;
        padding: 0;
      }
      :host .gear-fill__photo--contain {
        object-fit: contain;
        background: transparent;
      }

      /* Hero rotator (prev / counter / next) — align to the bottom-right
         corner mirroring the ELEKTRON label pill at bottom-left. All
         three controls share the label's height so the cluster reads as
         a row of equal-height pills. */
      :host .hero__media .hero__rotator {
        bottom: 10px;
        right: 10px;
        gap: 6px;
      }
      :host .hero__media .hero__rotator button {
        width: 30px;
        height: 30px;
        padding: 0;
        line-height: 1;
      }
      :host .hero__media .hero__counter {
        padding: 4px 8px;
        font-size: 10px;
        line-height: 1.3;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

    `,
  ],
  template: `
    <div class="shell">
      <!-- ============== HERO (featured article + rotator) ============== -->
      <section class="hero crosses" aria-labelledby="hero-title">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div class="hero__grid">
          <div class="hero__media">
            @if (heroArticle(); as a) {
              @if (a.heroThumb) {
                <img
                  class="hero__bg-blur"
                  [src]="mediaUrl(a.heroThumb)"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  (error)="onImageError($event)"
                />
              }
              <div class="gear-fill" [attr.data-gear]="a.slug">
                @if (a.heroThumb) {
                  <img
                    class="gear-fill__photo gear-fill__photo--contain"
                    [src]="mediaUrl(a.heroThumb)"
                    [alt]="a.title"
                    loading="lazy"
                    (error)="onImageError($event)"
                  />
                }
                <span class="gear-fill__label">{{ a.tags[0] || ('home.featured_chip' | t) }}</span>
              </div>
            } @else {
              <div class="gear-fill">
                <span class="gear-fill__label">{{ 'home.featured_chip' | t }}</span>
              </div>
            }

            @if (heroPool().length > 1) {
              <div class="hero__rotator">
                <button type="button" [attr.aria-label]="'home.hero_prev' | t" (click)="heroPrev()">
                  ‹
                </button>
                <span class="hero__counter">{{ heroCounter() }}</span>
                <button type="button" [attr.aria-label]="'home.hero_next' | t" (click)="heroNext()">
                  ›
                </button>
              </div>
            }
          </div>

          <div class="hero__body">
            <div>
              <div class="hero__meta">
                <span class="pill is-accent">{{ 'home.featured_pill' | t }}</span>
                <span class="pill is-live">{{ 'home.live_pill' | t }}</span>
                <span>{{ formatShortDate(heroPublishedAt()) }}</span>
              </div>
              @if (heroArticle(); as a) {
                <h1 [class]="heroTitleClass()" id="hero-title">{{ a.title }}</h1>
                <p class="hero__lede">{{ a.excerpt || ('home.featured_no_excerpt' | t) }}</p>
              } @else {
                <h1 class="hero__title" id="hero-title">{{ 'home.hero_title_fallback' | t }}</h1>
                <p class="hero__lede">{{ 'home.hero_lede_fallback' | t }}</p>
              }
            </div>

            <div class="hero__footer">
              @if (heroAuthor(); as au) {
                <div class="hero__byline">
                  <span class="avatar">{{ initials(au.fullName || au.username) }}</span>
                  <span>{{ au.fullName || au.username }}</span>
                  <span style="opacity:.5">·</span>
                  <span>{{ heroReadMinutes() }} min citire</span>
                </div>
              } @else {
                <div class="hero__byline">
                  <span class="avatar">SI</span>
                  <span>Sintezaur</span>
                </div>
              }
              <a class="block__cta" [routerLink]="heroArticle() ? ['/revista', heroArticle()!.slug] : ['/revista']">
                {{ 'home.hero_cta' | t }}
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- ============== LATEST IN REVISTA ============== -->
      <section class="block crosses" aria-labelledby="revista-title">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <header class="block__head">
          <div>
            <span class="block__sub">{{ 'home.revista_eyebrow' | t }}</span>
            <h2 class="block__title" id="revista-title">
              {{ 'home.revista_title' | t }}<span class="dot">.</span>
            </h2>
          </div>
          <a class="block__cta" routerLink="/revista">{{ 'home.revista_cta' | t }}</a>
        </header>

        <div class="block__body">
          <div class="revista-grid">
            @if (revistaBig(); as big) {
              <a class="article is-big" [routerLink]="['/revista', big.slug]">
                <div class="article__media">
                  <div class="gear-fill" [attr.data-gear]="big.slug">
                    @if (big.heroThumb) {
                      <img
                        class="gear-fill__photo"
                        [src]="mediaUrl(big.heroThumb)"
                        [alt]="big.title"
                        loading="lazy"
                        (error)="onImageError($event)"
                      />
                    }
                    <span class="gear-fill__label">{{ big.tags[0] || ('home.revista_no_tag' | t) }}</span>
                  </div>
                </div>
                <div class="article__body">
                  <span class="article__pill">// {{ categoryLabel(big.category) }}</span>
                  <h3 class="article__title">{{ big.title }}</h3>
                  <p class="article__excerpt">{{ big.excerpt || '' }}</p>
                  <div class="article__byline">
                    <span class="avatar">{{ initials(big.author.fullName || big.author.username) }}</span>
                    <span>{{ big.author.fullName || big.author.username }}</span>
                    <span class="sep">·</span>
                    <span>{{ formatShortDate(big.publishedAt) }}</span>
                  </div>
                </div>
              </a>
            } @else {
              <a class="article is-big" routerLink="/revista">
                <div class="article__media">
                  <div class="gear-fill">
                    <span class="gear-fill__label">{{ 'home.revista_empty' | t }}</span>
                  </div>
                </div>
                <div class="article__body">
                  <h3 class="article__title">—</h3>
                </div>
              </a>
            }

            <div class="revista-side">
              @for (a of revistaSide(); track a.id) {
                <a class="article is-small" [routerLink]="['/revista', a.slug]">
                  <div class="article__media">
                    <div class="gear-fill" [attr.data-gear]="a.slug">
                      @if (a.heroThumb) {
                        <img
                    class="gear-fill__photo"
                    [src]="mediaUrl(a.heroThumb)"
                    [alt]="a.title"
                    loading="lazy"
                    (error)="onImageError($event)"
                  />
                      }
                      <span class="gear-fill__label">{{ a.tags[0] || categoryLabel(a.category) }}</span>
                    </div>
                  </div>
                  <div class="article__body">
                    <span class="article__pill">// {{ categoryLabel(a.category) }}</span>
                    <h3 class="article__title">{{ a.title }}</h3>
                    <div class="article__byline">
                      <span class="avatar">{{ initials(a.author.fullName || a.author.username) }}</span>
                      <span>{{ a.author.fullName || a.author.username }}</span>
                      <span class="sep">·</span>
                      <span>{{ formatShortDate(a.publishedAt) }}</span>
                    </div>
                  </div>
                </a>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- ============== HOT IN BAZAR (horizontal scroll) ============== -->
      <section class="block crosses" aria-labelledby="bazar-title">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <header class="block__head">
          <div>
            <span class="block__sub">{{ 'home.bazar_eyebrow' | t }}</span>
            <h2 class="block__title" id="bazar-title">
              {{ 'home.bazar_title' | t }}<span class="dot">.</span>
            </h2>
          </div>
          <a class="block__cta" routerLink="/bazar">{{ 'home.bazar_cta' | t }}</a>
        </header>

        <div class="block__body">
          <div class="bazar-scroll">
            @for (l of bazarListings(); track l.id) {
              <a class="listing" [routerLink]="['/bazar', l.slug]" style="text-decoration:none; color:inherit;">
                <div class="listing__media">
                  <div class="gear-fill" [attr.data-gear]="l.gearSlug ?? l.slug">
                    @if (l.thumb) {
                      <img
                        class="gear-fill__photo"
                        [src]="mediaUrl(l.thumb)"
                        [alt]="l.title"
                        loading="lazy"
                        (error)="onImageError($event)"
                      />
                    }
                    <span class="gear-fill__label">{{ l.brand || '' }} · {{ l.model || l.title }}</span>
                  </div>
                  <span class="listing__chip" [attr.data-cond]="l.condition">{{ conditionLabel(l.condition) }}</span>
                </div>
                <div class="listing__body">
                  <div class="listing__brand">// {{ l.brand || '—' }}</div>
                  <div class="listing__title">{{ l.model || l.title }}</div>
                  <div class="listing__row">
                    <div class="listing__price">
                      {{ formatPrice(l.price) }}<small>{{ l.currency }}</small>
                    </div>
                    <div class="listing__loc">
                      <svg width="11" height="11" viewBox="0 0 24 24"><use href="#i-pin"/></svg>
                      {{ l.location }}
                    </div>
                  </div>
                  <div class="listing__seller">
                    <span class="avatar" style="width:22px;height:22px;font-size:10px">{{ initials(l.seller.username) }}</span>
                    @if (l.seller.avgRating) {
                      <span><span class="star">★</span> {{ l.seller.avgRating }}</span>
                      <span style="opacity:.5">·</span>
                    }
                    <span>{{ l.seller.transactionCount }} {{ 'home.listing_tx' | t }}</span>
                  </div>
                </div>
              </a>
            }
            @if (!bazarListings().length && !bazarLoading()) {
              <div class="listing" style="display:grid;place-items:center;min-height:200px;color:var(--fg-muted);">
                {{ 'home.bazar_empty' | t }}
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ============== FORUM RECENT ============== -->
      <section class="block crosses" aria-labelledby="forum-title">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <header class="block__head">
          <div>
            <span class="block__sub">{{ 'home.forum_eyebrow' | t }}</span>
            <h2 class="block__title" id="forum-title">
              {{ 'home.forum_title' | t }}<span class="dot">.</span>
            </h2>
          </div>
          <a class="block__cta" routerLink="/forum">{{ 'home.forum_cta' | t }}</a>
        </header>

        <div class="block__body">
          @if (forumThreads().length > 0) {
            <ul class="forum-recent">
              @for (t of forumThreads(); track t.id) {
                <li class="forum-recent__item">
                  <a
                    class="forum-recent__title"
                    [routerLink]="['/forum', t.categorySlug, t.slug]"
                  >
                    {{ t.title }}
                  </a>
                  <div class="forum-recent__meta">
                    <a
                      class="forum-recent__cat"
                      [routerLink]="['/forum', t.categorySlug]"
                    >
                      // {{ t.categorySlug }}
                    </a>
                    <span class="sep">·</span>
                    <span>
                      <b>{{ t.postCount }}</b>
                      {{
                        t.postCount === 1
                          ? ('home.forum_post_one' | t)
                          : ('home.forum_post_many' | t)
                      }}
                    </span>
                    @if (t.lastPostAt || t.createdAt) {
                      <span class="sep">·</span>
                      <span>{{ formatShortDate(t.lastPostAt ?? t.createdAt) }}</span>
                    }
                    @if (t.authorUsername) {
                      <span class="sep">·</span>
                      <span>
                        <span class="avatar" style="width:18px;height:18px;font-size:9px">{{
                          initials(t.authorFullName || t.authorUsername)
                        }}</span>
                        {{ t.authorFullName || t.authorUsername }}
                      </span>
                    }
                  </div>
                </li>
              }
            </ul>
          } @else {
            <div
              style="padding:40px 20px;text-align:center;color:var(--fg-muted);font-family:var(--font-mono);font-size:12px;letter-spacing:0.06em;"
            >
              {{ 'home.forum_empty' | t }}
            </div>
          }
        </div>
      </section>

      <!-- ============== TEZAUR SPOTLIGHT ============== -->
      <section class="block crosses" aria-labelledby="spotlight-title">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <header class="block__head">
          <div>
            <span class="block__sub">{{ 'home.spotlight_eyebrow' | t }}</span>
            <h2 class="block__title" id="spotlight-title">
              {{ 'home.spotlight_title' | t }}<span class="dot">.</span>
            </h2>
          </div>
          <a class="block__cta" routerLink="/tezaur">{{ 'home.spotlight_cta' | t }}</a>
        </header>

        <div class="spotlight">
          <div class="spotlight__media">
            @if (spotlight(); as g) {
              <div class="gear-fill" [attr.data-gear]="g.slug">
                @if (g.thumb) {
                  <img
                  class="gear-fill__photo"
                  [src]="mediaUrl(g.thumb)"
                  [alt]="g.brand + ' ' + g.model"
                  loading="lazy"
                  (error)="onImageError($event)"
                />
                }
                <span class="gear-fill__label">{{ g.brand }} {{ g.model }}</span>
              </div>
            } @else {
              <div class="gear-fill">
                <span class="gear-fill__label">{{ 'home.spotlight_empty' | t }}</span>
              </div>
            }
          </div>

          <div class="spotlight__body">
            @if (spotlight(); as g) {
              <span class="spotlight__brand">// {{ g.brand }}</span>
              <h3 class="spotlight__model">{{ g.model }}</h3>
              <p class="spotlight__desc">{{ spotlightDesc() }}</p>

              <div class="spec-table">
                <div class="spec-table__cell"><span class="k">// {{ 'home.spotlight_year' | t }}</span><span class="v">{{ g.yearReleased ?? '—' }}</span></div>
                <div class="spec-table__cell"><span class="k">// {{ 'home.spotlight_category' | t }}</span><span class="v">{{ g.category }}</span></div>
                <div class="spec-table__cell"><span class="k">// {{ 'home.spotlight_form' | t }}</span><span class="v">{{ g.formFactor ?? '—' }}</span></div>
                <div class="spec-table__cell"><span class="k">// {{ 'home.spotlight_rating' | t }}</span><span class="v">{{ g.avgRating ?? '—' }}</span></div>
                <div class="spec-table__cell"><span class="k">// {{ 'home.spotlight_reviews' | t }}</span><span class="v">{{ g.reviewCount }}</span></div>
                <div class="spec-table__cell"><span class="k">// {{ 'home.spotlight_type' | t }}</span><span class="v">{{ g.type ?? '—' }}</span></div>
              </div>

              <div class="spotlight__row">
                <div class="spotlight__own">
                  <b>{{ g.ownersPublicCount }}</b> &nbsp;{{ 'home.spotlight_owners' | t }}
                </div>
              </div>
            } @else {
              <span class="spotlight__brand">// —</span>
              <h3 class="spotlight__model">—</h3>
            }
          </div>
        </div>
      </section>

      <!-- ============== CATALOG (random selection) ============== -->
      <section class="block crosses" aria-labelledby="catalog-title">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <header class="block__head">
          <div>
            <span class="block__sub">{{ 'home.catalog_eyebrow' | t }}</span>
            <h2 class="block__title" id="catalog-title">
              {{ 'home.catalog_title' | t }}<span class="dot">.</span>
            </h2>
          </div>
          <a class="block__cta" routerLink="/tezaur">{{ 'home.catalog_cta' | t }}</a>
        </header>

        <div class="catalog">
          @for (g of catalog(); track g.id) {
            <a class="gear" [routerLink]="['/tezaur', g.slug]">
              <div class="gear__media">
                <div class="gear-fill" [attr.data-gear]="g.slug">
                  @if (g.thumb) {
                    <img
                  class="gear-fill__photo"
                  [src]="mediaUrl(g.thumb)"
                  [alt]="g.brand + ' ' + g.model"
                  loading="lazy"
                  (error)="onImageError($event)"
                />
                  }
                  <span class="gear-fill__label">{{ g.brand }} · {{ g.model }}</span>
                </div>
              </div>
              <div class="gear__brand">// {{ g.brand }}</div>
              <div class="gear__model">{{ g.model }}</div>
              <div class="gear__tags">
                <span class="tag">{{ g.category }}</span>
                @if (g.type) {
                  <span class="tag">{{ g.type }}</span>
                }
              </div>
              <div class="gear__own"><b>{{ g.ownersPublicCount }}</b> {{ 'home.catalog_own' | t }}</div>
            </a>
          }
        </div>
      </section>

      <!-- ============== CTA STRIP (auth-aware) ============== -->
      <section class="cta-strip crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        @if (auth.isLoggedIn()) {
          <div class="cta-strip__a">
            <h2 class="cta-strip__title">{{ 'home.cta_logged_title' | t }}</h2>
            <p>{{ 'home.cta_logged_body' | t }}</p>
            <div class="cta-strip__actions" style="display:flex;gap:10px;flex-wrap:wrap;">
              <a class="btn-ghost" routerLink="/bazar/nou">{{ 'home.cta_action_listing' | t }} →</a>
              <a class="btn-ghost" routerLink="/forum">{{ 'home.cta_action_thread' | t }} →</a>
              <a class="btn-ghost" routerLink="/revista/nou">{{ 'home.cta_action_article' | t }} →</a>
            </div>
          </div>
        } @else {
          <div class="cta-strip__a">
            <h2 class="cta-strip__title">{{ 'home.cta_guest_title' | t }}</h2>
            <p>{{ 'home.cta_guest_body' | t }}</p>
            <a class="btn-ghost" routerLink="/signup">{{ 'home.cta_guest_action' | t }} →</a>
          </div>
        }
        <div class="cta-strip__b">
          <div class="newsletter">
            <span class="newsletter__label">// {{ 'home.newsletter_label' | t }}</span>
            <div class="newsletter__row">
              <input type="email" [placeholder]="'home.newsletter_placeholder' | t" />
              <button type="button">{{ 'home.newsletter_action' | t }}</button>
            </div>
            <p style="margin:0; font-size:12px; color:var(--fg-muted)">
              {{ 'home.newsletter_note' | t }}
            </p>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class HomePage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly revista = inject(RevistaService);
  private readonly bazar = inject(BazarService);
  private readonly tezaur = inject(TezaurService);
  private readonly seo = inject(SeoService);
  private readonly appConfig = inject(AppConfigService);
  private readonly forum = inject(ForumService);

  readonly revistaArticles = signal<ArticleListItem[]>([]);
  readonly bazarListings = signal<BazarListItem[]>([]);
  readonly bazarLoading = signal(true);
  readonly tezaurList = signal<TezaurListItem[]>([]);
  readonly forumThreads = signal<ThreadListItem[]>([]);

  /**
   * Hero rotator — cycles through up to 4 of the freshest articles
   * (mirrors the v07 design). The rotator is purely client-side: the
   * `loadRevista()` call already fetches 4, so prev/next swap which
   * one is the hero subject. The first article (newest) is the
   * default landing slide.
   */
  readonly heroIndex = signal(0);
  readonly heroPool = computed<ArticleListItem[]>(() =>
    this.revistaArticles().slice(0, 4),
  );
  readonly heroArticle = computed<ArticleListItem | null>(
    () => this.heroPool()[this.heroIndex()] ?? null,
  );
  readonly heroPublishedAt = computed<string | null>(
    () => this.heroArticle()?.publishedAt ?? null,
  );
  readonly heroAuthor = computed(() => this.heroArticle()?.author ?? null);

  /** "01 / 04" counter — 1-based for humans. */
  readonly heroCounter = computed(() => {
    const total = this.heroPool().length;
    const current = total > 0 ? this.heroIndex() + 1 : 0;
    return `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  });

  /**
   * Long titles overflow the hero column when rendered at the default
   * display-font clamp (max 88px). Drop to roughly half the size when
   * the title is over 30 chars so it still fits next to the photo
   * without pushing the lede off-screen.
   */
  readonly heroTitleClass = computed(() =>
    (this.heroArticle()?.title.length ?? 0) > 30
      ? 'hero__title hero__title--compact'
      : 'hero__title',
  );

  heroPrev(): void {
    const total = this.heroPool().length;
    if (total === 0) return;
    this.heroIndex.update((i) => (i - 1 + total) % total);
  }
  heroNext(): void {
    const total = this.heroPool().length;
    if (total === 0) return;
    this.heroIndex.update((i) => (i + 1) % total);
  }

  /**
   * "Ultimele citite" — pick the next 4 articles after the hero. When
   * fewer than 4 articles exist we re-use the hero (better to show one
   * article twice than to render an empty-state next to a populated
   * hero, which made the page look like nothing was published). Order:
   * first non-hero article goes into the big tile; the rest into the
   * side rail.
   */
  readonly revistaSecondary = computed<ArticleListItem[]>(() => {
    const all = this.revistaArticles();
    if (all.length === 0) return [];
    return all.length >= 2 ? all.slice(1) : all;
  });
  readonly revistaBig = computed<ArticleListItem | null>(
    () => this.revistaSecondary()[0] ?? null,
  );
  readonly revistaSide = computed(() => this.revistaSecondary().slice(1, 4));

  readonly spotlight = computed(() => this.tezaurList()[0] ?? null);
  readonly catalog = computed(() => this.tezaurList().slice(1, 7));

  constructor() {
    this.seo.set({
      title: 'Sintezaur — gear, bazar, revista, forum',
      description:
        'Enciclopedia, bazarul, revista și forumul producției muzicale în limba română. Cont gratuit, comunitate de producători din România.',
      canonicalPath: '/',
    });
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sintezaur.ro';
    this.seo.setJsonLd([
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Sintezaur',
        alternateName: 'Sintezaur.ro',
        url: origin,
        inLanguage: 'ro-RO',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${origin}/cautare?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Sintezaur',
        url: origin,
        logo: `${origin}/assets/branding/logo.png`,
      },
    ]);
  }

  ngOnInit(): void {
    void this.loadRevista();
    void this.loadBazar();
    void this.loadTezaur();
    void this.loadForum();
  }

  private async loadForum(): Promise<void> {
    try {
      const res = await this.forum.listRecent(5);
      this.forumThreads.set(res);
    } catch {
      this.forumThreads.set([]);
    }
  }

  private async loadRevista(): Promise<void> {
    try {
      const res = await this.revista.list({ sort: 'newest', pageSize: 4 });
      this.revistaArticles.set(res.items);
    } catch {
      this.revistaArticles.set([]);
    }
  }

  private async loadBazar(): Promise<void> {
    this.bazarLoading.set(true);
    try {
      const res = await this.bazar.list({ pageSize: 8 });
      this.bazarListings.set(res.items);
    } catch {
      this.bazarListings.set([]);
    } finally {
      this.bazarLoading.set(false);
    }
  }

  private async loadTezaur(): Promise<void> {
    try {
      const res = await this.tezaur.list({ sort: 'popular', pageSize: 7 });
      this.tezaurList.set(res.items);
    } catch {
      this.tezaurList.set([]);
    }
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '—';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  formatShortDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  formatPrice(p: string): string {
    const n = Number(p);
    if (!isFinite(n)) return p;
    return n.toLocaleString('ro-RO', { maximumFractionDigits: 0 });
  }

  conditionLabel(c: string): string {
    return this.i18n.t(`home.condition.${c}`) || c;
  }

  categoryLabel(c: string): string {
    return this.i18n.t(`home.category.${c}`) || c;
  }

  /** Delegate to AppConfigService so storage URLs go through `imageBaseUrl`
   *  (files.sintezaur.ro on prod, /uploads on local) instead of the API
   *  host. The previous in-line builder used `apiBaseUrl` and forgot the
   *  joining slash, producing 404s like `api.sintezaur.rolisting/...jpg`. */
  mediaUrl(path: string | null | undefined): string {
    return this.appConfig.imageUrl(path);
  }

  /** Hide the <img> element when its src fails to load. Each card has a
   *  layered placeholder (`gear-fill` pattern + label) underneath the
   *  photo, so collapsing the img reveals it instead of leaving a blank
   *  rectangle covering the brand text. */
  onImageError(event: Event): void {
    const el = event.target as HTMLImageElement | null;
    if (el) el.style.display = 'none';
  }

  heroReadMinutes(): number {
    return 8;
  }

  spotlightDesc(): string {
    const g = this.spotlight();
    if (!g) return '';
    return this.i18n.t('home.spotlight_generic_desc', { brand: g.brand, model: g.model });
  }
}
