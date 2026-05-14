import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';

export type SzCardVariant =
  | 'article'
  | 'article-big'
  | 'listing'
  | 'gear'
  | 'forum-thread'
  | 'tez';

/**
 * Editorial card shell. The variant decides which slots are rendered
 * and how the layout flows; concrete content is projected via named
 * slots (`[card-media]`, `[card-eyebrow]`, `[card-title]`,
 * `[card-meta]`, `[card-foot]`).
 *
 * The slots are intentionally permissive — different variants surface
 * different combinations on screen. Pages compose the right slots.
 */
@Component({
  selector: 'sz-card, a[sz-card]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="sz-card__media">
      <ng-content select="[card-media]" />
    </div>
    <div class="sz-card__body">
      <div class="sz-card__eyebrow">
        <ng-content select="[card-eyebrow]" />
      </div>
      <div class="sz-card__title">
        <ng-content select="[card-title]" />
      </div>
      <div class="sz-card__excerpt">
        <ng-content select="[card-excerpt]" />
      </div>
      <div class="sz-card__tags">
        <ng-content select="[card-tags]" />
      </div>
      <div class="sz-card__meta">
        <ng-content select="[card-meta]" />
      </div>
      <div class="sz-card__foot">
        <ng-content select="[card-foot]" />
      </div>
    </div>
  `,
  host: {
    '[attr.data-variant]': 'variant',
    class: 'sz-card',
  },
  styles: [
    `
      .sz-card {
        display: flex;
        flex-direction: column;
        background: var(--bg-card);
        border: var(--grid-line) solid var(--line);
        transition: border-color 0.15s ease;
        position: relative;
        text-decoration: none;
        color: inherit;
      }
      .sz-card:hover {
        border-color: var(--line-strong);
      }

      .sz-card__media {
        position: relative;
        background: var(--bg-card-2);
        border-bottom: var(--grid-line) solid var(--line);
      }
      .sz-card__media:empty {
        display: none;
      }

      .sz-card__body {
        padding: 16px 18px 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
      }
      .sz-card__eyebrow:empty,
      .sz-card__excerpt:empty,
      .sz-card__tags:empty,
      .sz-card__meta:empty,
      .sz-card__foot:empty {
        display: none;
      }

      .sz-card__eyebrow {
        font-family: var(--font-mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--fg-muted);
      }

      .sz-card__title {
        font-size: 17px;
        font-weight: 600;
        line-height: 1.25;
        margin: 0;
      }

      .sz-card__excerpt {
        color: var(--fg-muted);
        font-size: 14px;
      }

      .sz-card__tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .sz-card__meta {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        letter-spacing: 0.04em;
      }

      .sz-card__foot {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 8px;
        margin-top: auto;
        padding-top: 8px;
      }

      /* ---------- variants ---------- */

      /* article (default ratio 16/9) */
      .sz-card[data-variant='article'] .sz-card__media {
        aspect-ratio: 16 / 9;
      }
      .sz-card[data-variant='article'] .sz-card__title {
        font-family: var(--font-ui);
        font-size: clamp(18px, 2vw, 22px);
        font-weight: 600;
        line-height: 1.2;
      }

      /* article-big — display headline with stencil font */
      .sz-card[data-variant='article-big'] .sz-card__media {
        aspect-ratio: 16 / 9;
      }
      .sz-card[data-variant='article-big'] .sz-card__body {
        padding: 20px 22px 22px;
        gap: 12px;
      }
      .sz-card[data-variant='article-big'] .sz-card__title {
        font-family: var(--font-display);
        text-transform: uppercase;
        font-size: clamp(28px, 3.4vw, 48px);
        letter-spacing: 0.005em;
        line-height: 0.95;
        font-weight: 600;
      }

      /* listing (Bazar) — 4:3 media + price-row foot */
      .sz-card[data-variant='listing'] .sz-card__media {
        aspect-ratio: 4 / 3;
      }
      .sz-card[data-variant='listing'] .sz-card__body {
        padding: 14px 16px 16px;
        gap: 6px;
      }
      .sz-card[data-variant='listing'] .sz-card__title {
        font-size: 15px;
        font-weight: 600;
      }

      /* gear (Tezaur) — 1:1 media, stencil model */
      .sz-card[data-variant='gear'] .sz-card__media {
        aspect-ratio: 1 / 1;
      }
      .sz-card[data-variant='gear'] .sz-card__title {
        font-family: var(--font-display);
        font-size: 22px;
        font-weight: 600;
        line-height: 1;
        text-transform: uppercase;
      }

      /* tez (large Tezaur card — used on list page) */
      .sz-card[data-variant='tez'] .sz-card__media {
        aspect-ratio: 4 / 3;
      }
      .sz-card[data-variant='tez'] .sz-card__title {
        font-family: var(--font-display);
        font-size: 26px;
        font-weight: 600;
        line-height: 1;
        text-transform: uppercase;
      }
      .sz-card[data-variant='tez'] .sz-card__foot {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--fg-muted);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      /* forum-thread — flat row, not boxed */
      .sz-card[data-variant='forum-thread'] {
        flex-direction: row;
        align-items: center;
        gap: 18px;
        padding: 18px 0;
        background: transparent;
        border-top: 0;
        border-right: 0;
        border-left: 0;
        border-bottom: 1px solid var(--line);
      }
      .sz-card[data-variant='forum-thread']:hover {
        background: var(--bg-card);
        border-color: var(--line);
      }
      .sz-card[data-variant='forum-thread'] .sz-card__media {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        aspect-ratio: 1 / 1;
        border: 0;
      }
      .sz-card[data-variant='forum-thread'] .sz-card__body {
        padding: 0;
        flex-direction: row;
        align-items: center;
        flex: 1;
        gap: 18px;
      }
    `,
  ],
})
export class SzCardComponent {
  @Input() variant: SzCardVariant = 'article';
}
