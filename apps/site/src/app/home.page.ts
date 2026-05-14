import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  SzAvatarComponent,
  SzBadgeComponent,
  SzButtonComponent,
} from '@sintezaur/ui';
import { AuthService } from './auth/auth.service';
import { I18nService } from './i18n/i18n.service';
import { TPipe } from './i18n/t.pipe';

/**
 * Home page — first surface to land the v2-neutral design.
 *
 * For M2 we ship hero + a "from the catalog" placeholder strip. The
 * full set of homepage blocks (pulse strip, revista grid, bazar hot
 * scroller, forum recent, spotlight, etc.) lands as the relevant
 * milestones (M3/M4/M5) populate their sections with real data.
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TPipe,
    SzButtonComponent,
    SzBadgeComponent,
    SzAvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- HERO -->
      <section class="hero crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <div class="hero__grid">
          <div class="hero__media">
            <div class="hero__media-frame">
              <span class="hero__media-label">{{ 'app.name' | t }}</span>
            </div>
          </div>
          <div class="hero__body">
            <div>
              <div class="hero__meta">
                <sz-badge variant="accent">{{ 'home.hero.eyebrow' | t }}</sz-badge>
                <sz-badge variant="live">M2 · Tezaur</sz-badge>
              </div>
              <h1 class="hero__title">
                {{ 'home.hero.title_line_1' | t }}<br />
                {{ 'home.hero.title_line_2' | t }}<br />
                {{ 'home.hero.title_line_3' | t }}
              </h1>
              <p class="hero__lede">{{ 'home.hero.lede' | t }}</p>
            </div>
            <div class="hero__footer">
              @if (auth.isLoggedIn() && auth.currentUser(); as user) {
                <div class="hero__byline">
                  <sz-avatar [name]="user.username" size="sm" />
                  <span>{{ user.username }}</span>
                </div>
                <a sz-button variant="primary" routerLink="/tezaur">
                  {{ 'home.hero.cta_explore' | t }}
                </a>
              } @else {
                <div class="hero__cta-pair">
                  <a sz-button variant="primary" routerLink="/tezaur">
                    {{ 'home.hero.cta_explore' | t }}
                  </a>
                  <a sz-button variant="ghost" routerLink="/signup">
                    {{ 'home.hero.cta_signup' | t }}
                  </a>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- FROM THE CATALOG (live link, real data lands in Faza C) -->
      <section class="block crosses">
        <span class="crosses-tl"></span><span class="crosses-tr"></span>
        <header class="block__head">
          <div>
            <span class="block__sub">{{ 'home.sections.tezaur_eyebrow' | t }}</span>
            <h2 class="block__title">
              {{ 'home.sections.tezaur_title' | t }}<span class="dot">.</span>
            </h2>
          </div>
          <a sz-button variant="cta" routerLink="/tezaur">
            {{ 'home.sections.tezaur_cta' | t }}
          </a>
        </header>
        <div class="block__body">
          <p class="muted">
            {{ 'tezaur.page_lede' | t }}
          </p>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* HERO — lifted from docs/design-imports/2026-05-14-v01/styles.css */
      .hero {
        position: relative;
        margin: var(--gutter-y) 0;
        border: var(--grid-line) solid var(--line);
        background: var(--bg-elev);
      }
      .hero__grid {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
      }
      .hero__media {
        position: relative;
        background: var(--bg-card);
        border-right: var(--grid-line) solid var(--line);
        overflow: hidden;
        aspect-ratio: 4/3;
      }
      .hero__media-frame {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background:
          repeating-linear-gradient(
            135deg,
            color-mix(in oklab, var(--fg) 4%, transparent) 0 8px,
            transparent 8px 16px
          ),
          linear-gradient(180deg, var(--bg-card-2), var(--bg-card));
      }
      .hero__media-label {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-muted);
        padding: 4px 8px;
        border: 1px solid var(--line-strong);
        background: var(--bg);
      }
      .hero__body {
        padding: clamp(28px, 4vw, 56px);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 32px;
      }
      .hero__meta {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .hero__title {
        font-family: var(--font-display);
        font-size: clamp(40px, 5vw, 76px);
        line-height: 0.92;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.005em;
        margin: 0 0 18px;
        text-wrap: balance;
      }
      .hero__lede {
        font-size: clamp(15px, 1.2vw, 17px);
        color: var(--fg-muted);
        max-width: 46ch;
        margin: 0;
        text-wrap: pretty;
      }
      .hero__footer {
        display: flex;
        justify-content: space-between;
        align-items: end;
        flex-wrap: wrap;
        gap: 16px;
      }
      .hero__cta-pair {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .hero__byline {
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: var(--font-mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--fg-muted);
      }

      .muted {
        color: var(--fg-muted);
        max-width: 70ch;
        margin: 0;
        font-size: 15px;
      }

      @media (max-width: 1100px) {
        .hero__grid {
          grid-template-columns: 1fr;
        }
        .hero__media {
          aspect-ratio: 16/9;
          border-right: 0;
          border-bottom: var(--grid-line) solid var(--line);
        }
      }
      @media (max-width: 640px) {
        .hero__title {
          font-size: 40px;
        }
      }
    `,
  ],
})
export class HomePage {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
}
