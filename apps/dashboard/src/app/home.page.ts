import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from './i18n/t.pipe';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="home">
      <h1>{{ 'dashboard.home.title' | t }}</h1>
      @if (auth.currentUser(); as user) {
        <p class="who">
          {{ 'dashboard.home.logged_in_as' | t: { email: user.email, role: user.roles.join(', ') } }}
        </p>
      }

      <nav class="modules">
        <a class="module" routerLink="/tezaur">
          <span class="module__name">Tezaur</span>
          <span class="module__desc">Catalog gear · admin CRUD</span>
        </a>
        <a class="module" routerLink="/bazar">
          <span class="module__name">Bazar</span>
          <span class="module__desc">Moderare anunțuri · elimină / restaurează</span>
        </a>
        <a class="module" routerLink="/revista">
          <span class="module__name">Revista</span>
          <span class="module__desc">Moderare articole · status + dezarhivare</span>
        </a>
        <a class="module" routerLink="/useri">
          <span class="module__name">Useri</span>
          <span class="module__desc">Roluri · grant editor / curator / moderator</span>
        </a>
        <a class="module" routerLink="/badges">
          <span class="module__name">Badges</span>
          <span class="module__desc">Definiții badge-uri · cron nightly + sweep manual</span>
        </a>
        <span class="module is-disabled">
          <span class="module__name">Audit log</span>
          <span class="module__desc">Land în M2.5 (vizualizare audit_log)</span>
        </span>
      </nav>

      <button class="logout" (click)="logout()">
        {{ 'dashboard.home.logout' | t }}
      </button>
    </main>
  `,
  styles: [
    `
      .home {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px var(--gutter-x);
      }
      h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 48px);
        text-transform: uppercase;
        margin: 0 0 12px;
        color: var(--fg);
      }
      .who {
        background: var(--bg-card);
        border: var(--grid-line) solid var(--line);
        padding: 14px 16px;
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--fg);
        margin: 0 0 32px;
        letter-spacing: 0.06em;
      }
      .modules {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }
      .module {
        background: var(--bg-elev);
        border: 1px solid var(--line);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border-color 0.15s, background 0.15s;
        min-height: auto;
        min-width: auto;
        align-items: stretch;
        justify-content: flex-start;
      }
      .module:hover:not(.is-disabled) {
        background: var(--bg-card);
        border-color: var(--accent);
      }
      .module.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .module__name {
        font-family: var(--font-display);
        font-size: 24px;
        text-transform: uppercase;
        font-weight: 600;
        line-height: 1;
      }
      .module__desc {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        letter-spacing: 0.06em;
      }
      .logout {
        padding: 12px 22px;
        background: transparent;
        color: var(--fg);
        border: 1px solid var(--line-strong);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .logout:hover {
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
    await this.router.navigateByUrl('/login');
  }
}
