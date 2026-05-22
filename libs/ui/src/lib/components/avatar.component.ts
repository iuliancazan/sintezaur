import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  computed,
  signal,
} from '@angular/core';

export type SzAvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type SzAvatarShape = 'square' | 'circle';

/**
 * Editorial avatar with initials fallback. Used in topbar, bylines,
 * threads, listings sellers, etc. Optional photo; if missing or fails
 * to load, falls back to up to 2 initials derived from `name`.
 *
 * Defaults to square (the editorial byline look). Set `shape="circle"`
 * for user-identity avatars (account trigger, account menu head) — per
 * V09 design, identity avatars are round + colored, byline avatars are
 * square + neutral.
 *
 * When `seed` is provided (e.g. user id), the initials fallback paints
 * a deterministic hue background so each user gets a stable visual
 * identity even without a photo.
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
      <span [style.backgroundColor]="bgColor()" [style.color]="fgColor()">
        {{ initials() }}
      </span>
    }
  `,
  host: {
    '[attr.data-size]': 'size',
    '[attr.data-shape]': 'shape',
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
      .sz-avatar[data-shape='circle'] {
        border-radius: 999px;
        border: 0;
      }
      .sz-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .sz-avatar > span {
        width: 100%;
        height: 100%;
        display: inline-grid;
        place-items: center;
        line-height: 1;
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
  @Input() shape: SzAvatarShape = 'square';
  @Input() fallback?: string;
  /**
   * Optional deterministic seed (e.g. user id) used to compute the
   * fallback background hue. When absent, falls back to the theme's
   * neutral background tone — preserving legacy call sites.
   */
  @Input() seed?: string;

  readonly failed = signal(false);

  readonly initials = computed(() => {
    if (this.fallback) return this.fallback.slice(0, 2);
    const source = (this.name ?? '').trim();
    if (!source) return '··';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  });

  readonly bgColor = computed(() => {
    const seed = this.seed?.trim();
    if (!seed) return null;
    const hue = hashHue(seed);
    return `oklch(0.55 0.12 ${hue})`;
  });

  readonly fgColor = computed(() => (this.seed ? '#fff' : null));
}

/** Deterministic 0–359 hue from any string (FNV-1a-ish 32-bit). */
function hashHue(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h) % 360;
}
