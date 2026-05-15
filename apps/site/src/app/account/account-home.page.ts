import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from '../i18n/t.pipe';
import { AuthService } from '../auth/auth.service';
import { FeedbackService } from '../feedback/feedback.service';

/**
 * Minimal "/cont" landing for M1 — confirms the session, links to
 * change-password + change-email, exposes logout. The full
 * account/profile UI (preferences, notifications, personal
 * collection) lands in M2.
 */
@Component({
  selector: 'app-account-home-page',
  standalone: true,
  imports: [RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="account">
      <header class="account__head">
        <h1>{{ 'account.title' | t }}</h1>
        @if (auth.currentUser(); as user) {
          <p class="account__greeting">
            {{ 'account.logged_in_as' | t: { email: user.email } }}
          </p>
        }
      </header>

      <nav class="account__menu">
        <a routerLink="/cont/profil" class="account__link">
          {{ 'account.menu.profile' | t }}
        </a>
        <a routerLink="/cont/mesaje" class="account__link">
          {{ 'account.menu.messages' | t }}
        </a>
        <a routerLink="/cont/anunturi" class="account__link">
          {{ 'account.menu.my_listings' | t }}
        </a>
        <a routerLink="/cont/salvate" class="account__link">
          {{ 'account.menu.my_watches' | t }}
        </a>
        <a routerLink="/cont/cautari-salvate" class="account__link">
          {{ 'account.menu.saved_searches' | t }}
        </a>
        <a routerLink="/cont/abonamente" class="account__link">
          {{ 'account.menu.forum_subscriptions' | t }}
        </a>
        <a routerLink="/cont/preferinte" class="account__link">
          {{ 'account.menu.notification_preferences' | t }}
        </a>
        <a routerLink="/cont/blocuri" class="account__link">
          Utilizatori blocați
        </a>
        <a routerLink="/cont/date" class="account__link">
          Datele tale (RGPD)
        </a>
        <a routerLink="/cont/parola" class="account__link">
          {{ 'account.menu.password' | t }}
        </a>
        <a routerLink="/cont/email" class="account__link">
          {{ 'account.menu.email' | t }}
        </a>
        <button
          type="button"
          class="account__link account__link--feedback"
          (click)="openFeedback()"
        >
          {{ 'account.menu.feedback' | t }}
        </button>
        <button class="account__logout" (click)="logout()">
          {{ 'account.menu.logout' | t }}
        </button>
      </nav>
    </main>
  `,
  styles: [
    `
      .account {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px var(--gutter-x);
      }
      .account__head {
        margin-bottom: 32px;
      }
      h1 {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 40px);
        letter-spacing: 0.02em;
        margin: 0 0 8px;
        color: var(--fg);
      }
      .account__greeting {
        color: var(--fg-muted);
        margin: 0;
        font-family: var(--font-mono);
        font-size: 13px;
      }
      .account__menu {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .account__link,
      .account__logout {
        display: flex;
        align-items: center;
        padding: 16px 18px;
        background: var(--bg-elev);
        border: var(--grid-line) solid var(--line);
        color: var(--fg);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        transition: background 0.15s ease, border-color 0.15s ease;
        text-align: left;
        justify-content: flex-start;
        min-height: 56px;
      }
      .account__link:hover,
      .account__logout:hover {
        background: var(--bg-card-2);
        border-color: var(--fg-muted);
      }
      .account__logout {
        margin-top: 24px;
        color: var(--fg-muted);
      }
    `,
  ],
})
export class AccountHomePage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }

  openFeedback(): void {
    this.feedback.open();
  }
}
