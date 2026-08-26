import { Component, effect, ElementRef, input, output, viewChild } from '@angular/core';

export interface RailItem {
  label: string;
  /** Right-aligned meta: slide number, page number, clock time… */
  meta: string;
}

/**
 * 248px contents rail shared by the deck and the document viewers: heading +
 * label/meta rows, active row highlighted orange, bottom fade
 * (2026-08-26-v02 "Workshop Portal" turns 3–4).
 */
@Component({
  selector: 'ws-viewer-rail',
  template: `
    <aside class="rail">
      <div class="rail__heading">{{ heading() }}</div>
      <div class="rail__scroll" #scroller>
        @for (item of items(); track $index) {
          <button
            type="button"
            class="rail__row"
            [class.rail__row--active]="$index === activeIndex()"
            [attr.data-rail-index]="$index"
            (click)="rowSelect.emit($index)"
          >
            <span class="rail__label">{{ item.label }}</span>
            <span class="rail__meta">{{ item.meta }}</span>
          </button>
        }
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .rail {
      width: 248px;
      height: 100%;
      min-height: 0;
      border-right: 1px solid var(--ws-line);
      padding: 20px 14px 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .rail__heading {
      font-family: var(--ws-font-mono);
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: var(--ws-text-muted);
      padding: 0 12px 12px;
      flex: none;
    }
    .rail__scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-bottom: 40px;
      scrollbar-width: none;
      mask-image: linear-gradient(#000 calc(100% - 70px), transparent);
    }
    .rail__row {
      min-height: 0;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: none;
      cursor: pointer;
      text-align: left;
      flex: none;
    }
    .rail__row:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .rail__row--active {
      background: var(--ws-accent-row-bg);
      border-color: var(--ws-accent-row-border);
    }
    .rail__label {
      font-family: var(--ws-font-mono);
      font-size: 11px;
      text-transform: uppercase;
      color: var(--ws-text-label);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rail__meta {
      font-family: var(--ws-font-mono);
      font-size: 10px;
      color: var(--ws-text-muted);
      flex: none;
    }
    .rail__row--active .rail__label,
    .rail__row--active .rail__meta {
      color: var(--ws-accent-bright);
    }
    @media print {
      :host {
        display: none;
      }
    }
  `,
})
export class ViewerRailComponent {
  readonly heading = input.required<string>();
  readonly items = input.required<RailItem[]>();
  readonly activeIndex = input(0);
  readonly rowSelect = output<number>();

  private readonly scroller =
    viewChild.required<ElementRef<HTMLDivElement>>('scroller');

  constructor() {
    // Keep the active row in view while presenting/scrolling.
    effect(() => {
      const idx = this.activeIndex();
      this.scroller()
        .nativeElement.querySelector(`[data-rail-index="${idx}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }
}
