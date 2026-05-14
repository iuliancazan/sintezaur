import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  computed,
  signal,
} from '@angular/core';

export type SzAvatarSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Editorial-style square avatar with initials fallback. Used in topbar,
 * bylines, threads, listings sellers, etc. Optional photo; if missing or
 * fails to load, falls back to up to 2 initials derived from `name`.
 */
@Component({
  selector: 'sz-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (photo && !failed()) {
      <img
        [src]="photo"
        [alt]="name ?? ''"
        loading="lazy"
        (error)="failed.set(true)"
      />
    } @else {
      <span>{{ initials() }}</span>
    }
  `,
  host: {
    '[attr.data-size]': 'size',
    class: 'sz-avatar',
  },
  styles: [
    `
      .sz-avatar {
        display: inline-grid;
        place-items: center;
        background: var(--bg-card-2);
        border: 1px solid var(--line-strong);
        color: var(--fg);
        font-family: var(--font-mono);
        font-weight: 600;
        text-transform: uppercase;
        overflow: hidden;
        flex-shrink: 0;
      }
      .sz-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .sz-avatar[data-size='xs'] {
        width: 22px;
        height: 22px;
        font-size: 10px;
      }
      .sz-avatar[data-size='sm'] {
        width: 28px;
        height: 28px;
        font-size: 11px;
      }
      .sz-avatar[data-size='md'] {
        width: 40px;
        height: 40px;
        font-size: 13px;
      }
      .sz-avatar[data-size='lg'] {
        width: 96px;
        height: 96px;
        font-size: 28px;
      }
    `,
  ],
})
export class SzAvatarComponent {
  @Input() name?: string;
  @Input() photo?: string;
  @Input() size: SzAvatarSize = 'sm';
  @Input() fallback?: string;

  readonly failed = signal(false);

  readonly initials = computed(() => {
    if (this.fallback) return this.fallback.slice(0, 2);
    const source = (this.name ?? '').trim();
    if (!source) return '··';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  });
}
