import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LangToggleComponent } from './lang-toggle.component';
import { ThemeToggleComponent } from './theme-toggle.component';

export interface PortalCrumb {
  label: string;
  /** In-app route (e.g. '/'). */
  link?: string;
  /** External href (e.g. the main Sintezaur site). */
  href?: string;
}

/**
 * The 76px portal navbar (hub + login): SINTEZAUR / WORKSHOPS / … breadcrumb
 * on the left, EN|RO toggle plus projected extras (role pill, log out) on
 * the right — 2026-08-26-v02 "Workshop Portal" turn 1.
 */
@Component({
  selector: 'ws-portal-nav',
  imports: [RouterLink, LangToggleComponent, ThemeToggleComponent],
  template: `
    <header class="nav" [class.nav--underline]="underline()">
      <nav class="nav__crumbs">
        @for (crumb of crumbs(); track $index; let last = $last; let first = $first) {
          @if (!first) {
            <span class="nav__sep">/</span>
          }
          @if (crumb.href) {
            <a
              class="nav__crumb"
              [class.nav__crumb--brand]="first"
              [href]="crumb.href"
              >{{ crumb.label }}</a
            >
          } @else if (crumb.link) {
            <a
              class="nav__crumb"
              [class.nav__crumb--brand]="first"
              [routerLink]="crumb.link"
              >{{ crumb.label }}</a
            >
          } @else {
            <span
              class="nav__crumb nav__crumb--static"
              [class.nav__crumb--brand]="first"
              [class.nav__crumb--current]="last && !first"
              >{{ crumb.label }}</span
            >
          }
        }
      </nav>
      <div class="nav__right">
        <ws-lang-toggle />
        <ws-theme-toggle />
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      height: 76px;
      padding: 0 clamp(16px, 4vw, 48px);
      background: var(--ws-nav-bg);
    }
    .nav--underline {
      border-bottom: 1px solid var(--ws-line);
    }
    .nav__crumbs {
      display: flex;
      align-items: baseline;
      gap: 14px;
      font-family: var(--ws-font-mono);
      font-size: 13px;
      letter-spacing: 3px;
      white-space: nowrap;
      min-width: 0;
      overflow: hidden;
    }
    .nav__sep {
      color: var(--ws-crumb-sep);
    }
    .nav__crumb {
      min-height: 0;
      color: var(--ws-text-faint);
    }
    a.nav__crumb:hover {
      color: var(--ws-text);
    }
    .nav__crumb--brand {
      color: var(--ws-text);
      font-weight: 500;
    }
    a.nav__crumb--brand:hover {
      color: var(--ws-accent-bright);
    }
    .nav__crumb--current {
      color: var(--ws-accent-bright);
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .nav__right {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    /* Phones: crumbs on their own line, controls wrap underneath. */
    @media (max-width: 640px) {
      .nav {
        height: auto;
        min-height: 76px;
        flex-wrap: wrap;
        row-gap: 10px;
        padding-top: 12px;
        padding-bottom: 12px;
        align-content: center;
      }
      .nav__crumbs {
        flex: 1 1 100%;
        letter-spacing: 2px;
        gap: 10px;
      }
      .nav__right {
        gap: 10px;
        flex-wrap: wrap;
      }
    }
  `,
})
export class PortalNavComponent {
  readonly crumbs = input.required<PortalCrumb[]>();
  /** The hub draws a hairline under the bar; the login page does not. */
  readonly underline = input(true);
}
