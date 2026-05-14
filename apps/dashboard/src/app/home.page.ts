import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TPipe } from './i18n/t.pipe';
import { AuthService } from './auth/auth.service';

/**
 * M1 dashboard landing — confirms the staff session and surfaces a
 * logout. Real admin modules (gear, users, content, moderation)
 * land in M2/M3/M5.
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="home">
      <h1>{{ 'dashboard.home.title' | t }}</h1>
      <p class="muted">{{ 'dashboard.home.subtitle' | t }}</p>

      @if (auth.currentUser(); as user) {
        <p class="who">
          {{ 'dashboard.home.logged_in_as' | t: { email: user.email, role: user.role } }}
        </p>
      }

      <button class="logout" (click)="logout()">
        {{ 'dashboard.home.logout' | t }}
      </button>
    </main>
  `,
  styles: [
    `
      .home {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px var(--gutter-x);
      }
      h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 40px);
        margin: 0 0 8px;
        color: var(--fg);
      }
      .muted {
        color: var(--fg-muted);
        font-family: var(--font-mono);
        font-size: 13px;
        margin: 0 0 32px;
      }
      .who {
        background: var(--bg-card);
        border: var(--grid-line) solid var(--line);
        padding: 16px;
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--fg);
        margin: 0 0 32px;
      }
      .logout {
        padding: 14px 24px;
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
