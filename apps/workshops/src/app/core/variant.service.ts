import { effect, Injectable, signal } from '@angular/core';
import type { CourseVariant } from '../content/types';

const STORAGE_KEY = 'ws_variant';

/**
 * Which cut of the course is on: `extended` (90') or `short` (60'). One
 * signal for the deck and the presenter script — the handbook has no
 * variants. Persisted per browser; pages that take a `?v=` deep link apply
 * it themselves (the PDF renderer relies on that), default extended.
 */
@Injectable({ providedIn: 'root' })
export class VariantService {
  readonly variant = signal<CourseVariant>(this.initial());

  constructor() {
    effect(() => {
      const variant = this.variant();
      try {
        localStorage.setItem(STORAGE_KEY, variant);
      } catch {
        // Storage can be unavailable (private mode) — the switch still works.
      }
    });
  }

  set(variant: CourseVariant) {
    this.variant.set(variant);
  }

  /** Applies a `?v=` query value; anything else is ignored. */
  applyParam(value: string | null) {
    if (value === 'extended' || value === 'short') {
      this.variant.set(value);
    }
  }

  private initial(): CourseVariant {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'extended' || stored === 'short') {
        return stored;
      }
    } catch {
      // fall through to default
    }
    return 'extended';
  }
}
