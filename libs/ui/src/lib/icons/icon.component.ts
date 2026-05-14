import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import type { SintezaurIconName } from './sintezaur-icons';

@Component({
  selector: 'sz-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      aria-hidden="true"
      focusable="false"
    >
      <use [attr.href]="'#sz-i-' + name" />
    </svg>
  `,
  styles: [
    `
      sz-icon {
        display: inline-grid;
        place-items: center;
        line-height: 0;
      }
      sz-icon svg {
        width: 1em;
        height: 1em;
        fill: none;
        stroke: currentColor;
      }
    `,
  ],
})
export class SzIconComponent {
  @Input({ required: true }) name!: SintezaurIconName;
  @Input() size: number | string = 18;
}
