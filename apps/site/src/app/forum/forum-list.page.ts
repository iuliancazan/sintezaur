import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { SeoService } from '../seo/seo.service';
import { TPipe } from '../i18n/t.pipe';
import { ForumCategory, ForumService } from './forum.service';

@Component({
  selector: 'app-forum-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <section class="fr-header crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div>
          <p class="fr-header__sub">{{ 'forum.page_eyebrow' | t }}</p>
          <h1 class="fr-header__title">
            {{ 'forum.page_title' | t }}<span class="dot">.</span>
          </h1>
        </div>
        <div>
          <p class="fr-header__lede">{{ 'forum.page_lede' | t }}</p>
          <a class="fr-header__cta" routerLink="/forum/cautare">
            🔍 {{ 'forum.search.go' | t }}
          </a>
        </div>
      </section>

      @if (loading()) {
        <p class="fr-empty">{{ 'app.loading' | t }}</p>
      } @else if (error()) {
        <p class="fr-empty">{{ 'forum.load_error' | t }}</p>
      } @else {
        @if (userCats().length > 0) {
          <ul class="fr-list">
            @for (c of userCats(); track c.id) {
              <li>
                <a class="fr-card" [routerLink]="['/forum', c.slug]">
                  <span class="fr-card__bullet">▌</span>
                  <span class="fr-card__body">
                    <span class="fr-card__name">{{ c.name }}</span>
                    @if (c.description) {
                      <span class="fr-card__desc">{{ c.description }}</span>
                    }
                  </span>
                  <span class="fr-card__chev">›</span>
                </a>
              </li>
            }
          </ul>
        }

        @if (systemCats().length > 0) {
          <div class="fr-sep">
            <span class="accent">//</span>
            {{ 'forum.system_section' | t }}
          </div>
          <ul class="fr-list fr-list--sys">
            @for (c of systemCats(); track c.id) {
              <li>
                <a class="fr-card" [routerLink]="['/forum', c.slug]">
                  <span class="fr-card__bullet">▌</span>
                  <span class="fr-card__body">
                    <span class="fr-card__name">
                      {{ c.name }}
                      <span class="fr-badge">
                        {{
                          (c.key === 'anunturi'
                            ? 'forum.badge_admin'
                            : 'forum.badge_auto'
                          ) | t
                        }}
                      </span>
                    </span>
                    @if (c.description) {
                      <span class="fr-card__desc">{{ c.description }}</span>
                    }
                  </span>
                  <span class="fr-card__chev">›</span>
                </a>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .fr-header {
        position: relative;
        padding: clamp(40px, 6vw, 72px) clamp(20px, 3vw, 36px) clamp(28px, 4vw, 44px);
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
        margin: var(--gutter-y) 0 24px;
        display: grid;
        grid-template-columns: 1.6fr 1fr;
        gap: 32px;
        align-items: end;
      }
      .fr-header__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: clamp(70px, 11vw, 160px);
        line-height: 0.85;
        text-transform: uppercase;
        margin: 0;
        padding-top: 0.22em;
        letter-spacing: 0.005em;
      }
      .fr-header__title .dot { color: var(--accent); }
      .fr-header__sub {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin: 0 0 14px;
      }
      .fr-header__sub::before { content: '* '; color: var(--accent); }
      .fr-header__cta {
        display: inline-block;
        margin-top: 10px;
        padding: 10px 16px;
        background: var(--accent);
        color: var(--accent-fg);
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        text-decoration: none;
        border: 1px solid var(--accent);
      }
      .fr-header__cta:hover { filter: brightness(1.1); }
      .fr-header__lede {
        color: var(--fg-muted);
        font-size: 15px;
        max-width: 42ch;
        margin: 0;
        text-wrap: pretty;
      }

      .fr-list {
        list-style: none;
        margin: 0 0 24px;
        padding: 0;
        display: grid;
        gap: 0;
        border: var(--grid-line) solid var(--line);
      }
      .fr-list li + li { border-top: var(--grid-line) solid var(--line); }

      .fr-card {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 18px 20px;
        background: var(--bg-elev);
        color: var(--fg);
        text-decoration: none;
        transition: background 0.15s ease;
      }
      .fr-card:hover {
        background: color-mix(in oklab, var(--bg-elev) 80%, var(--accent) 20%);
      }
      .fr-card__bullet {
        color: var(--accent);
        font-size: 24px;
        line-height: 1;
      }
      .fr-card__body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .fr-card__name {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 18px;
        letter-spacing: 0.005em;
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .fr-card__desc {
        color: var(--fg-muted);
        font-size: 13px;
        line-height: 1.4;
      }
      .fr-card__chev {
        color: var(--fg-subtle);
        font-size: 20px;
        font-family: var(--font-mono);
      }

      .fr-badge {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        padding: 2px 6px;
        border: 1px solid var(--line-strong);
        color: var(--fg-muted);
        background: var(--bg);
      }

      .fr-sep {
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
        margin: 8px 0 12px;
      }
      .fr-sep .accent { color: var(--accent); margin-right: 8px; }

      .fr-list--sys .fr-card { opacity: 0.92; }

      .fr-empty {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 40px 20px;
        text-align: center;
      }

      @media (max-width: 1100px) {
        .fr-header { grid-template-columns: 1fr; gap: 18px; }
      }
      @media (max-width: 720px) {
        .fr-card { grid-template-columns: auto 1fr; padding: 14px 16px; }
        .fr-card__chev { display: none; }
        .fr-card__name { font-size: 16px; flex-wrap: wrap; }
      }
    `,
  ],
})
export class ForumListPage {
  readonly i18n = inject(I18nService);
  private readonly forum = inject(ForumService);
  private readonly seo = inject(SeoService);

  readonly categories = signal<ForumCategory[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly userCats = computed(() =>
    this.categories().filter((c) => c.kind === 'user'),
  );
  readonly systemCats = computed(() =>
    this.categories().filter((c) => c.kind === 'system'),
  );

  constructor() {
    this.seo.set({
      title: 'Forum — discuții despre producția muzicală',
      description:
        'Comunitatea producătorilor de muzică din România: gear, producție, live, business. Discuții pe categorii, fără spam, fără marketing.',
      canonicalPath: '/forum',
    });
    void this.fetch();
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const cats = await this.forum.listCategories();
      this.categories.set(cats);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
