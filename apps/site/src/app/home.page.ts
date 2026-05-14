import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from './i18n/t.pipe';
import { AuthService } from './auth/auth.service';

/**
 * M1 home stub — confirms the i18n bundle resolves, surfaces a CTA
 * to login / signup for anonymous visitors, and a "merg la cont"
 * shortcut once logged in. The real Home component (hero, featured
 * Tezaur cards, latest Revista articles, etc.) lands in M2 with the
 * design imports.
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="home">
      <h1 class="home__title">{{ 'app.name' | t }}</h1>
      <p class="home__tagline">{{ 'app.tagline' | t }}</p>

      @if (auth.isLoggedIn()) {
        <p class="home__welcome">
          {{ 'account.logged_in_as' | t: { email: auth.currentUser()!.email } }}
        </p>
        <div class="home__cta">
          <a routerLink="/cont" class="home__btn home__btn--primary">
            {{ 'account.title' | t }}
          </a>
          <button class="home__btn home__btn--ghost" (click)="logout()">
            {{ 'account.menu.logout' | t }}
          </button>
        </div>
      } @else {
        <div class="home__cta">
          <a routerLink="/login" class="home__btn home__btn--primary">
            {{ 'auth.login.title' | t }}
          </a>
          <a routerLink="/signup" class="home__btn home__btn--ghost">
            {{ 'auth.signup.title' | t }}
          </a>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .home {
        max-width: 720px;
        margin: 0 auto;
        padding: 64px var(--gutter-x);
        text-align: center;
      }
      .home__title {
        font-family: var(--font-display);
        font-size: clamp(56px, 14vw, 140px);
        letter-spacing: 0.02em;
        margin: 0 0 8px;
        color: var(--fg);
      }
      .home__tagline {
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--fg-muted);
        margin: 0 0 32px;
      }
      .home__welcome {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        margin: 0 0 24px;
      }
      .home__cta {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .home__btn {
        padding: 14px 24px;
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 600;
        border-radius: var(--radius);
        transition: filter 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      }
      .home__btn--primary {
        background: var(--accent);
        color: var(--accent-fg);
      }
      .home__btn--primary:hover {
        filter: brightness(1.08);
      }
      .home__btn--ghost {
        background: transparent;
        color: var(--fg);
        border: 1px solid var(--line-strong);
      }
      .home__btn--ghost:hover {
        background: var(--bg-elev);
        border-color: var(--fg-muted);
      }
    `,
  ],
})
export class HomePage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
