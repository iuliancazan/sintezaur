import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SzAvatarComponent } from '@sintezaur/ui';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { clampDescription, stripHtml, uploadUrl } from '../seo/seo.utils';
import { TPipe } from '../i18n/t.pipe';
import {
  RevistaService,
  type ArticleDetail,
} from './revista.service';
import {
  AttachmentBoxComponent,
  AttachmentListComponent,
  AttachmentsService,
  type AttachmentItem,
} from '../storage';

@Component({
  selector: 'app-revista-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TPipe,
    SzAvatarComponent,
    AttachmentListComponent,
    AttachmentBoxComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (detail(); as d) {
      <article class="rd">
        <!-- BREADCRUMB -->
        <nav class="rd-crumb" aria-label="Breadcrumb">
          <a routerLink="/revista" style="display:inline-flex;align-items:center;gap:6px;">
            <svg width="14" height="14"><use href="#i-back"/></svg>
            {{ 'revista.back_to_list' | t }}
          </a>
          <span class="sep">·</span>
          <a [routerLink]="['/revista']" [queryParams]="{ category: d.article.category }">
            {{ 'revista.cat.' + d.article.category | t }}
          </a>
        </nav>

        <!-- HEADER -->
        <header class="rd-head">
          <h1>{{ d.article.title }}</h1>
          @if (d.article.excerpt) {
            <p class="rd-lede">{{ d.article.excerpt }}</p>
          }
          <div class="rd-meta">
            <a class="rd-author" [routerLink]="['/autor', d.author.username]">
              <sz-avatar
                [name]="d.author.username"
                [photo]="d.author.avatarUrl ?? undefined"
              />
              <div>
                <div class="rd-author__name">{{ d.author.fullName }}</div>
                <div class="rd-author__handle">&#64;{{ d.author.username }}</div>
              </div>
            </a>
            <div class="rd-meta__chips">
              @if (d.article.publishedAt) {
                <span>{{ formatDate(d.article.publishedAt) }}</span>
                <span class="sep">·</span>
              }
              <span>{{ d.article.viewCount }} {{ 'revista.views' | t }}</span>
              @if (canEdit()) {
                <span class="sep">·</span>
                <a [routerLink]="['/revista', d.article.slug, 'editare']">
                  {{ 'revista.edit' | t }}
                </a>
              }
            </div>
          </div>
        </header>

        @if (d.heroImage) {
          <figure class="rd-hero">
            <img
              [src]="revista.imageUrl(d.heroImage.path)"
              [alt]="d.article.title"
            />
          </figure>
        }

        <!-- BODY -->
        <div class="rd-body" [innerHTML]="d.article.bodyHtml"></div>

        @if (attachments().length > 0) {
          <section class="rd-attachments">
            <h3>// {{ 'revista.attachments_label' | t }}</h3>
            <app-attachment-list [items]="attachments()" />
          </section>
        }

        @if (canEdit()) {
          <app-attachment-box
            [target]="{ kind: 'revista-article', articleId: d.article.id }"
            [initial]="attachments()"
            (changed)="onAttachmentsChanged($event)"
          />
        }

        @if (d.article.tags.length > 0) {
          <div class="rd-tags">
            @for (tag of d.article.tags; track tag) {
              <a
                class="rd-tag"
                [routerLink]="['/revista']"
                [queryParams]="{ tag }"
              >#{{ tag }}</a>
            }
          </div>
        }

        @if (d.gear.length > 0) {
          <aside class="rd-gear-sidebar">
            <h3>// {{ 'revista.gear_sidebar' | t }}</h3>
            <ul>
              @for (g of d.gear; track g.id) {
                <li>
                  <a [routerLink]="['/tezaur', g.slug]">
                    <span class="rd-gear__brand">{{ g.brand }}</span>
                    <span class="rd-gear__model">{{ g.model }}</span>
                  </a>
                </li>
              }
            </ul>
          </aside>
        }

        <!-- AUTHOR CARD -->
        <section class="rd-author-card">
          <sz-avatar
            [name]="d.author.username"
            [photo]="d.author.avatarUrl ?? undefined"
            size="lg"
          />
          <div>
            <h4>{{ d.author.fullName }}</h4>
            @if (d.author.bio) {
              <p>{{ d.author.bio }}</p>
            }
            <a class="rd-author-card__more" [routerLink]="['/autor', d.author.username]">
              {{ 'revista.see_all_by_author' | t: { name: d.author.fullName } }} →
            </a>
          </div>
        </section>

        <!-- COMMENTS / FORUM THREAD -->
        <section class="rd-comments">
          <h3>// {{ 'revista.comments_title' | t }}</h3>
          @if (d.thread) {
            <p class="rd-comments__hint">
              {{
                'revista.comments_thread_hint'
                  | t: { count: d.thread.postCount }
              }}
            </p>
          } @else {
            <p class="rd-comments__hint">
              {{ 'revista.comments_no_thread' | t }}
            </p>
          }
          <div class="rd-comments__placeholder">
            <p>{{ 'revista.comments_placeholder' | t }}</p>
            <a class="rd-comments__signup" routerLink="/forum">
              {{ 'revista.comments_signup_cta' | t }} →
            </a>
          </div>
        </section>
      </article>
    } @else if (loading()) {
      <div class="shell">
        <p class="rd-loading">{{ 'app.loading' | t }}</p>
      </div>
    } @else if (notFound()) {
      <div class="shell">
        <p class="rd-empty">{{ 'revista.not_found' | t }}</p>
        <a routerLink="/revista" class="rd-empty__back">← {{ 'revista.back_to_list' | t }}</a>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .rd {
        max-width: 760px;
        margin: 0 auto;
        padding: 24px var(--gutter-x) 80px;
      }
      .rd-crumb {
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
      .rd-crumb a {
        color: var(--accent);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .rd-crumb a:hover { text-decoration: underline; }
      .rd-crumb .sep { color: var(--fg-subtle); }

      .rd-head { margin-bottom: 22px; }
      h1 {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(34px, 5vw, 54px);
        line-height: 1.06;
        letter-spacing: -0.01em;
        margin: 0 0 14px;
      }
      .rd-lede {
        font-size: 19px;
        line-height: 1.5;
        color: var(--fg-muted);
        margin: 0 0 22px;
        max-width: 56ch;
      }

      .rd-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 0;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        flex-wrap: wrap;
      }
      .rd-author {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: var(--fg);
      }
      .rd-author__name {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 15px;
      }
      .rd-author__handle {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--accent);
        letter-spacing: 0.08em;
      }
      .rd-meta__chips {
        display: inline-flex;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--fg-muted);
      }
      .rd-meta__chips a { color: var(--accent); text-decoration: none; }
      .rd-meta__chips .sep { color: var(--fg-subtle); }

      .rd-hero {
        margin: 24px 0;
        overflow: hidden;
      }
      .rd-hero img { width: 100%; display: block; height: auto; }

      .rd-body {
        font-family: var(--font-text, var(--font-ui));
        font-size: 18px;
        line-height: 1.7;
        color: var(--fg);
      }
      .rd-body :is(h2, h3, h4) {
        font-family: var(--font-display);
        font-weight: 600;
        margin: 36px 0 12px;
        line-height: 1.2;
      }
      .rd-body h2 { font-size: 28px; }
      .rd-body h3 { font-size: 22px; }
      .rd-body h4 { font-size: 18px; }
      .rd-body p { margin: 0 0 18px; }
      .rd-body :is(ul, ol) { margin: 0 0 18px; padding-left: 26px; }
      .rd-body li { margin-bottom: 8px; }
      .rd-body a { color: var(--accent); text-decoration: underline; text-underline-offset: 4px; }
      .rd-body img { max-width: 100%; height: auto; display: block; margin: 24px auto; }
      .rd-body blockquote {
        margin: 24px 0;
        padding: 12px 18px;
        border-left: 3px solid var(--accent);
        background: var(--bg-elev);
        font-style: italic;
        color: var(--fg-muted);
      }
      .rd-body iframe {
        max-width: 100%;
        aspect-ratio: 16 / 9;
        height: auto;
        margin: 24px 0;
        border: 1px solid var(--line);
      }
      .rd-body pre {
        background: var(--bg-elev);
        padding: 12px 14px;
        overflow-x: auto;
        font-size: 14px;
        line-height: 1.45;
      }
      .rd-body code { font-family: var(--font-mono); font-size: 0.9em; }

      .rd-tags {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 30px 0;
        padding-top: 22px;
        border-top: 1px dashed var(--line);
      }
      .rd-tag {
        padding: 4px 10px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        text-decoration: none;
        letter-spacing: 0.06em;
      }
      .rd-tag:hover { color: var(--accent); border-color: var(--accent); }

      .rd-gear-sidebar {
        padding: 16px 20px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        margin: 28px 0;
      }
      .rd-gear-sidebar h3 {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin: 0 0 10px;
      }
      .rd-gear-sidebar ul { list-style: none; margin: 0; padding: 0; }
      .rd-gear-sidebar li + li { margin-top: 6px; }
      .rd-gear-sidebar a {
        text-decoration: none;
        color: var(--fg);
        display: flex;
        gap: 8px;
        align-items: baseline;
        padding: 6px 0;
      }
      .rd-gear-sidebar a:hover { color: var(--accent); }
      .rd-gear__brand {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .rd-gear__model { font-family: var(--font-display); font-weight: 500; }

      .rd-author-card {
        display: grid;
        grid-template-columns: 96px 1fr;
        gap: 18px;
        margin: 40px 0;
        padding: 22px;
        border: 1px solid var(--line);
        background: var(--bg-elev);
      }
      .rd-author-card h4 {
        font-family: var(--font-display);
        font-size: 20px;
        margin: 0 0 6px;
      }
      .rd-author-card p { font-size: 14px; line-height: 1.55; color: var(--fg-muted); margin: 0 0 10px; }
      .rd-author-card__more {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--accent);
        text-decoration: none;
      }
      .rd-author-card__more:hover { text-decoration: underline; }

      .rd-comments {
        margin: 48px 0 0;
        padding-top: 26px;
        border-top: 1px solid var(--line);
      }
      .rd-comments h3 {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin: 0 0 10px;
      }
      .rd-comments__hint { color: var(--fg-muted); font-size: 14px; margin: 0 0 12px; }
      .rd-comments__placeholder {
        padding: 28px 24px;
        background: var(--bg-elev);
        border: 1px dashed var(--line);
        text-align: center;
      }
      .rd-comments__placeholder p {
        margin: 0 0 8px;
        font-family: var(--font-mono);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }
      .rd-comments__signup {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--accent);
        text-decoration: none;
      }
      .rd-comments__signup:hover { text-decoration: underline; }

      .rd-loading,
      .rd-empty {
        text-align: center;
        padding: 60px 20px;
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
      }
      .rd-empty__back { color: var(--accent); display: block; text-align: center; }

      @media (max-width: 720px) {
        .rd-author-card { grid-template-columns: 64px 1fr; gap: 12px; }
        h1 { font-size: 30px; }
        .rd-body { font-size: 17px; }
      }
    `,
  ],
})
export class RevistaDetailPage {
  readonly i18n = inject(I18nService);
  readonly revista = inject(RevistaService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly attachmentsApi = inject(AttachmentsService);

  readonly detail = signal<ArticleDetail | null>(null);
  readonly attachments = signal<AttachmentItem[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  onAttachmentsChanged(items: AttachmentItem[]): void {
    this.attachments.set(items);
  }

  readonly canEdit = computed(() => {
    const u = this.auth.currentUser();
    const d = this.detail();
    if (!u || !d) return false;
    if (u.id === d.article.authorId) return true;
    return u.roles.some((r) => r === 'admin' || r === 'superadmin');
  });

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const slug = p.get('slug');
      if (slug) void this.load(slug);
    });
  }

  private async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    try {
      const d = await this.revista.detail(slug);
      this.detail.set(d);
      this.applySeo(d);
      this.attachments.set([]);
      void this.loadAttachments(slug);
    } catch (err) {
      // Spec §7.13: backend signals slug redirect via 404 body
      // `{ redirectTo, message: 'redirect' | 'gone' }`. Honor it
      // client-side (no SSR 301 yet — site is SPA-first).
      const body = (err as { error?: { redirectTo?: string; message?: string } })?.error;
      if (body?.redirectTo) {
        if (body.message === 'gone') {
          void this.router.navigate(['/gone']);
        } else {
          void this.router.navigateByUrl(body.redirectTo, { replaceUrl: true });
        }
        return;
      }
      console.error('[revista] detail failed', err);
      this.notFound.set(true);
      this.detail.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAttachments(slug: string): Promise<void> {
    try {
      const items = await this.attachmentsApi.listRevistaAttachmentsBySlug(slug);
      this.attachments.set(items);
    } catch {
      // Non-fatal — leave list empty if the network blips.
    }
  }

  private applySeo(d: ArticleDetail): void {
    const a = d.article;
    const description = clampDescription(a.excerpt ?? stripHtml(a.bodyHtml));
    const heroUrl = uploadUrl(d.heroImage?.path);
    const origin = window.location.origin;
    this.seo.set({
      title: a.title,
      description,
      ogImage: heroUrl,
      canonicalPath: `/revista/${a.slug}`,
      ogType: 'article',
    });
    this.seo.setJsonLd([
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description,
        image: heroUrl ? [heroUrl] : undefined,
        datePublished: a.publishedAt ?? a.createdAt,
        dateModified: a.updatedAt,
        author: {
          '@type': 'Person',
          name: d.author.fullName || d.author.username,
          url: `${origin}/autor/${d.author.username}`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Sintezaur',
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/assets/branding/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${origin}/revista/${a.slug}`,
        },
        articleSection: a.category,
        keywords: a.tags.join(', '),
      },
      SeoService.breadcrumbList([
        { name: 'Acasă', path: '/' },
        { name: 'Revista', path: '/revista' },
        { name: a.title, path: `/revista/${a.slug}` },
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
}
