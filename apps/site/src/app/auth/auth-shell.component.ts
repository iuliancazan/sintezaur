import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../i18n/t.pipe';

/**
 * Shared chrome for auth pages — title block on top, slotted card
 * with the form, optional back-link at the bottom. Keeps the seven
 * auth screens visually consistent without dragging in the
 * marketing nav / footer (those are reserved for /tezaur and
 * friends, M2+).
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth">
      <header class="auth__brand">
        <a routerLink="/" class="auth__logo">SINTEZAUR</a>
      </header>

      <section class="auth__card">
        <h1 class="auth__title">{{ title }}</h1>
        @if (subtitle) {
          <p class="auth__subtitle">{{ subtitle }}</p>
        }
        <ng-content />
      </section>

      <footer class="auth__back">
        <a routerLink="/">{{ 'auth.shared.back_home' | t }}</a>
      </footer>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .auth {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px var(--gutter-x);
        gap: 32px;
      }
      .auth__brand {
        width: 100%;
        max-width: 480px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .auth__logo {
        font-family: var(--font-display);
        font-size: clamp(28px, 6vw, 40px);
        letter-spacing: 0.04em;
        color: var(--fg);
      }
      .auth__card {
        width: 100%;
        max-width: 480px;
        background: var(--bg-elev);
        border: var(--grid-line) solid var(--line);
        padding: 32px 28px;
      }
      .auth__title {
        font-family: var(--font-display);
        font-size: clamp(28px, 5vw, 36px);
        letter-spacing: 0.02em;
        margin: 0 0 8px;
        color: var(--fg);
      }
      .auth__subtitle {
        font-size: 14px;
        color: var(--fg-muted);
        margin: 0 0 24px;
      }
      .auth__back {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .auth__back a {
        color: var(--fg-muted);
        min-height: 0;
      }
      .auth__back a:hover {
        color: var(--fg);
      }
      @media (max-width: 540px) {
        .auth__card {
          padding: 24px 16px;
        }
      }
    `,
  ],
})
export class AuthShellComponent {
  @Input() title = '';
  @Input() subtitle?: string;
}
