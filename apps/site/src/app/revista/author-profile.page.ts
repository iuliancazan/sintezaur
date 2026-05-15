import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SzAvatarComponent, SzIconComponent } from '@sintezaur/ui';
import { ForumService, type UserBadgeItem } from '../forum/forum.service';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { clampDescription, uploadUrl } from '../seo/seo.utils';
import { TPipe } from '../i18n/t.pipe';
import {
  RevistaService,
  type AuthorProfile,
} from './revista.service';

@Component({
  selector: 'app-author-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TPipe,
    SzIconComponent,
    SzAvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (profile(); as p) {
      <div class="shell">
        <nav class="ap-crumb">
          <a routerLink="/revista">
            <sz-icon name="back" [size]="14" />
            {{ 'revista.back_to_list' | t }}
          </a>
        </nav>

        <header class="ap-head">
          <sz-avatar
            [name]="p.author.username"
            [photo]="p.author.avatarUrl ?? undefined"
            size="lg"
          />
          <div>
            <h1>{{ p.author.fullName }}</h1>
            <div class="ap-handle">&#64;{{ p.author.username }}</div>
            @if (p.author.bio) {
              <p class="ap-bio">{{ p.author.bio }}</p>
            }
            <div class="ap-socials">
              @if (p.author.websiteUrl) {
                <a [href]="p.author.websiteUrl" target="_blank" rel="noopener">website</a>
              }
              @if (p.author.socialInstagram) {
                <a [href]="p.author.socialInstagram" target="_blank" rel="noopener">instagram</a>
              }
              @if (p.author.socialSoundcloud) {
                <a [href]="p.author.socialSoundcloud" target="_blank" rel="noopener">soundcloud</a>
              }
              @if (p.author.socialBandcamp) {
                <a [href]="p.author.socialBandcamp" target="_blank" rel="noopener">bandcamp</a>
              }
            </div>
            <p class="ap-since">
              {{
                'revista.author.member_since' | t: { date: formatYear(p.author.createdAt) }
              }}
            </p>
          </div>
        </header>

        @if (badges().length > 0) {
          <section class="ap-badges">
            <h2 class="ap-badges__title">// {{ 'forum.badges.title' | t }}</h2>
            <ul class="ap-badges__list">
              @for (b of badges(); track b.key) {
                <li class="ap-badge" [title]="b.descriptionRo ?? b.nameRo">
                  <span class="ap-badge__dot" [attr.data-cat]="b.category"></span>
                  <span class="ap-badge__name">{{ b.nameRo }}</span>
                  <span class="ap-badge__cat">
                    {{ 'forum.badges.cat_' + b.category | t }}
                  </span>
                </li>
              }
            </ul>
          </section>
        }

        <section class="ap-articles">
          <h2 class="ap-articles__title">
            // {{ 'revista.author.articles_title' | t: { count: p.articles.length } }}
          </h2>
          @if (p.articles.length === 0) {
            <p class="ap-empty">{{ 'revista.author.no_articles' | t }}</p>
          } @else {
            <ul>
              @for (a of p.articles; track a.id) {
                <li>
                  <a [routerLink]="['/revista', a.slug]" class="ap-row">
                    @if (a.heroThumb) {
                      <img [src]="revista.imageUrl(a.heroThumb)" [alt]="a.title" />
                    } @else {
                      <div class="ap-row__ph">·</div>
                    }
                    <div>
                      <div class="ap-row__cat">{{ 'revista.cat.' + a.category | t }}</div>
                      <h3>{{ a.title }}</h3>
                      @if (a.excerpt) {
                        <p>{{ a.excerpt }}</p>
                      }
                      @if (a.publishedAt) {
                        <time>{{ formatDate(a.publishedAt) }}</time>
                      }
                    </div>
                  </a>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    } @else if (loading()) {
      <div class="shell">
        <p class="ap-empty">{{ 'app.loading' | t }}</p>
      </div>
    } @else if (notFound()) {
      <div class="shell">
        <p class="ap-empty">{{ 'revista.author.not_found' | t }}</p>
        <a routerLink="/revista">← {{ 'revista.back_to_list' | t }}</a>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .ap-crumb {
        padding: 16px 0;
      }
      .ap-crumb a {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .ap-head {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 28px;
        padding: 28px 0;
        border-bottom: 1px solid var(--line);
        margin-bottom: 28px;
      }
      h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(28px, 5vw, 42px);
        line-height: 1.1;
        margin: 0;
      }
      .ap-handle {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--accent);
        letter-spacing: 0.1em;
        margin-top: 4px;
      }
      .ap-bio {
        font-size: 15px;
        line-height: 1.6;
        color: var(--fg-muted);
        margin: 14px 0 0;
        max-width: 60ch;
      }
      .ap-socials {
        margin: 12px 0 8px;
        display: inline-flex;
        gap: 12px;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .ap-socials a {
        color: var(--accent);
        text-decoration: none;
      }
      .ap-socials a:hover { text-decoration: underline; }
      .ap-since {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin: 8px 0 0;
      }

      .ap-articles__title {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin: 0 0 14px;
      }
      .ap-articles ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-bottom: 60px;
      }
      .ap-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 18px;
        padding: 16px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        text-decoration: none;
        color: var(--fg);
      }
      .ap-row:hover { border-color: var(--accent); }
      .ap-row img {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        display: block;
      }
      .ap-row__ph {
        width: 100%;
        aspect-ratio: 16 / 9;
        display: grid;
        place-items: center;
        background: var(--bg);
        color: var(--fg-subtle);
      }
      .ap-row__cat {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }
      .ap-row h3 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 20px;
        line-height: 1.2;
        margin: 4px 0 6px;
      }
      .ap-row p {
        font-size: 14px;
        line-height: 1.5;
        color: var(--fg-muted);
        margin: 0 0 6px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ap-row time {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--fg-subtle);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .ap-empty {
        text-align: center;
        padding: 40px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
      }

      @media (max-width: 720px) {
        .ap-head { grid-template-columns: 1fr; gap: 14px; }
        .ap-row { grid-template-columns: 1fr; }
      }

      .ap-badges {
        margin: 0 0 32px;
      }
      .ap-badges__title {
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin: 0 0 12px;
      }
      .ap-badges__title::before { content: ''; }
      .ap-badges__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .ap-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid var(--line-strong);
        background: var(--bg-elev);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .ap-badge__dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent);
      }
      .ap-badge__dot[data-cat='activity'] { background: #6ec6ff; }
      .ap-badge__dot[data-cat='content'] { background: #ffd166; }
      .ap-badge__dot[data-cat='membership'] { background: #06d6a0; }
      .ap-badge__dot[data-cat='collection'] { background: #c084fc; }
      .ap-badge__dot[data-cat='trade'] { background: #f59e0b; }
      .ap-badge__dot[data-cat='trust'] { background: #ef4444; }
      .ap-badge__name { color: var(--fg); }
      .ap-badge__cat { color: var(--fg-subtle); font-size: 10px; }
    `,
  ],
})
export class AuthorProfilePage {
  readonly i18n = inject(I18nService);
  readonly revista = inject(RevistaService);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  readonly profile = signal<AuthorProfile | null>(null);
  readonly badges = signal<UserBadgeItem[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const username = p.get('username');
      if (username) void this.load(username);
    });
  }

  private async load(username: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    this.badges.set([]);
    try {
      const [data, badges] = await Promise.all([
        this.revista.author(username),
        this.forum.listBadgesForUsername(username).catch(() => []),
      ]);
      this.profile.set(data);
      this.badges.set(badges);
      this.applySeo(data);
    } catch (err) {
      console.error('[revista] author load failed', err);
      this.notFound.set(true);
      this.profile.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private applySeo(p: AuthorProfile): void {
    const a = p.author;
    const displayName = a.fullName || a.username;
    const description = clampDescription(
      a.bio ??
        `Profil autor pe Sintezaur — ${p.articles.length} articole publicate.`,
    );
    const avatarUrl = uploadUrl(a.avatarUrl);
    this.seo.set({
      title: displayName,
      description,
      ogImage: avatarUrl,
      canonicalPath: `/autor/${a.username}`,
      ogType: 'article',
    });
    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: displayName,
        alternateName: a.username,
        description: a.bio,
        image: avatarUrl,
      },
    });
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
