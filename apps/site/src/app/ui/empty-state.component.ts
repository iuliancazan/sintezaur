import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Reusable empty-state primitive (M6-C). Used wherever a list comes
 * back with zero rows — keeps the look + tone consistent across
 * Tezaur / Bazar / Revista / Forum and the account section.
 *
 * Usage:
 *   <app-empty-state
 *     icon="🪐"
 *     title="Nu există anunțuri pentru filtrele alese."
 *     lede="Încearcă alte categorii sau resetează filtrele."
 *     ctaLabel="Resetează filtre"
 *     ctaRouterLink="/bazar"
 *   />
 *
 * The icon slot is intentionally a string (emoji / single char) rather
 * than an SVG component — empty states are scaffolding, not focal
 * artwork. If we want bespoke illustrations later, swap to a slot.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="es" [class.es--compact]="compact()">
      <div class="es__icon" aria-hidden="true">{{ icon() || '∅' }}</div>
      <h3 class="es__title">{{ title() }}</h3>
      @if (lede()) {
        <p class="es__lede">{{ lede() }}</p>
      }
      @if (ctaLabel() && ctaRouterLink()) {
        <a
          class="es__cta"
          [routerLink]="ctaRouterLink()"
          [queryParams]="ctaQueryParams()"
        >
          {{ ctaLabel() }}
        </a>
      } @else if (ctaLabel() && ctaHref()) {
        <a class="es__cta" [href]="ctaHref()">{{ ctaLabel() }}</a>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .es {
        text-align: center;
        padding: 56px 24px;
        max-width: 480px;
        margin: 0 auto;
      }
      .es--compact { padding: 28px 16px; }
      .es__icon {
        font-size: 44px;
        line-height: 1;
        margin-bottom: 16px;
        opacity: 0.6;
      }
      .es--compact .es__icon { font-size: 32px; margin-bottom: 10px; }
      .es__title {
        margin: 0 0 8px;
        font-size: 20px;
        line-height: 1.3;
        color: var(--ink);
      }
      .es--compact .es__title { font-size: 16px; }
      .es__lede {
        margin: 0 0 20px;
        font-size: 14px;
        line-height: 1.55;
        color: var(--ink-soft);
      }
      .es--compact .es__lede { font-size: 13px; margin-bottom: 14px; }
      .es__cta {
        display: inline-block;
        padding: 9px 18px;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        background: var(--accent);
        color: var(--accent-ink, #fff);
        border-radius: 6px;
      }
      .es__cta:hover { opacity: 0.9; }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input<string | null>(null);
  readonly title = input.required<string>();
  readonly lede = input<string | null>(null);
  readonly ctaLabel = input<string | null>(null);
  readonly ctaRouterLink = input<string | string[] | null>(null);
  readonly ctaQueryParams = input<Record<string, unknown> | null>(null);
  readonly ctaHref = input<string | null>(null);
  readonly compact = input<boolean>(false);
}
