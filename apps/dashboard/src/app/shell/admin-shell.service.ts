import { Injectable, signal } from '@angular/core';

type AdminTheme = 'light' | 'dark';
type AdminDensity = 'compact' | 'comfortable' | 'spacious';

const KEY_THEME = 'sintezaur-theme';
const KEY_DENSITY = 'sintezaur-admin-density';
const KEY_COLLAPSE = 'sintezaur-admin-side';

const DENSITY_ORDER: AdminDensity[] = ['compact', 'comfortable', 'spacious'];
const DENSITY_LABEL: Record<AdminDensity, string> = {
  compact: 'Compact',
  comfortable: 'Confortabil',
  spacious: 'Spațios',
};

@Injectable({ providedIn: 'root' })
export class AdminShellService {
  readonly theme = signal<AdminTheme>('light');
  readonly density = signal<AdminDensity>('comfortable');
  readonly collapsed = signal<boolean>(false);

  constructor() {
    this.hydrateFromStorage();
    this.applyTheme(this.theme());
    this.applyDensity(this.density());
  }

  toggleTheme(): void {
    const next: AdminTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
    this.persist(KEY_THEME, next);
  }

  cycleDensity(): void {
    const cur = this.density();
    const idx = DENSITY_ORDER.indexOf(cur);
    const next = DENSITY_ORDER[(idx + 1) % DENSITY_ORDER.length];
    this.density.set(next);
    this.applyDensity(next);
    this.persist(KEY_DENSITY, next);
  }

  toggleCollapse(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    this.persist(KEY_COLLAPSE, next ? '1' : '0');
  }

  densityLabel(): string {
    return DENSITY_LABEL[this.density()];
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem(KEY_THEME);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      this.theme.set(storedTheme);
    }
    const storedDensity = window.localStorage.getItem(KEY_DENSITY);
    if (
      storedDensity === 'compact' ||
      storedDensity === 'comfortable' ||
      storedDensity === 'spacious'
    ) {
      this.density.set(storedDensity);
    }
    if (window.localStorage.getItem(KEY_COLLAPSE) === '1') {
      this.collapsed.set(true);
    }
  }

  private applyTheme(t: AdminTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', t);
  }

  private applyDensity(d: AdminDensity): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-density', d);
  }

  private persist(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage may be unavailable (private mode); ignore.
    }
  }
}
