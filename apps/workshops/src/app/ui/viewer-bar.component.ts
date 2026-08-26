import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from './theme-toggle.component';

/**
 * Slim 56px viewer bar shared by the deck and the document viewers:
 * `← WORKSHOP / DOC` breadcrumb left, per-viewer controls projected right
 * (2026-08-26-v02 "Workshop Portal" turns 3–4).
 */
@Component({
  selector: 'ws-viewer-bar',
  imports: [RouterLink, ThemeToggleComponent],
  template: `
    <header class="vbar">
      <nav class="vbar__crumbs">
        <a class="vbar__back" [routerLink]="backLink()" aria-label="Back">←</a>
        <a class="vbar__crumb" [routerLink]="backLink()">{{ crumb() }}</a>
        <span class="vbar__sep">/</span>
        <span class="vbar__title">{{ title() }}</span>
      </nav>
      <div class="vbar__right">
        <ng-content />
        <ws-theme-toggle size="sm" />
      </div>
    </header>
  `,
  styles: `
    .vbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      height: 56px;
      padding: 0 24px 0 20px;
      border-bottom: 1px solid var(--ws-line);
      flex: none;
    }
    .vbar__crumbs {
      display: flex;
      align-items: baseline;
      gap: 12px;
      font-family: var(--ws-font-mono);
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
      white-space: nowrap;
      min-width: 0;
      overflow: hidden;
    }
    .vbar__back {
      min-height: 0;
      color: var(--ws-accent-bright);
    }
    .vbar__crumb {
      min-height: 0;
      color: var(--ws-text-faint);

      &:hover {
        color: var(--ws-text);
      }
    }
    .vbar__sep {
      color: var(--ws-crumb-sep);
    }
    .vbar__title {
      color: var(--ws-text);
    }
    .vbar__right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    /* Phones: the bar wraps into rows instead of overflowing. */
    @media (max-width: 720px) {
      .vbar {
        height: auto;
        min-height: 56px;
        flex-wrap: wrap;
        row-gap: 8px;
        padding-top: 10px;
        padding-bottom: 10px;
        align-content: center;
      }
      .vbar__right {
        flex-wrap: wrap;
        row-gap: 8px;
      }
    }
    @media (max-width: 640px) {
      .vbar__crumb {
        display: none;
      }
      .vbar__sep {
        display: none;
      }
      .vbar__right {
        gap: 10px;
      }
    }
    @media print {
      .vbar {
        display: none;
      }
    }
  `,
})
export class ViewerBarComponent {
  readonly backLink = input.required<string[]>();
  /** Workshop title (already uppercased by the mono chrome). */
  readonly crumb = input.required<string>();
  readonly title = input.required<string>();
}
