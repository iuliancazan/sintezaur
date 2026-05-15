import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AdminShellService } from './admin-shell.service';

@Component({
  selector: 'sz-admin-topbar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="atop">
      <label class="atop__search" for="admin-search">
        <svg><use href="#i-search" /></svg>
        <input
          id="admin-search"
          type="text"
          placeholder="Caută user, gear, listing, articol, thread… (ID sau text)"
        />
        <kbd>⌘K</kbd>
      </label>
      <div class="atop__tools">
        <button class="atop__btn" type="button" aria-label="Notificări">
          <svg><use href="#i-bell" /></svg>
          <span class="dot-warn"></span>
        </button>
        <button
          class="atop__btn"
          type="button"
          aria-label="Schimbă tema"
          [title]="'Temă: ' + shell.theme()"
          (click)="shell.toggleTheme()"
        >
          <svg class="icon-sun"><use href="#i-sun" /></svg>
          <svg class="icon-moon"><use href="#i-moon" /></svg>
        </button>
        <button
          class="atop__btn atop__density"
          type="button"
          [attr.aria-label]="'Densitate: ' + shell.densityLabel()"
          [title]="'Densitate: ' + shell.densityLabel() + ' · click pentru următoarea'"
          (click)="shell.cycleDensity()"
        >
          <svg><use href="#i-density" /></svg>
          <span class="atop__density-dot"></span>
        </button>
        <a
          class="atop__btn"
          href="https://sintezaur.ro"
          target="_blank"
          rel="noopener"
          title="Vezi site-ul public"
        >
          <svg><use href="#i-external" /></svg>
        </a>
        <button class="atop__avatar" type="button" (click)="logout()" [title]="logoutTitle()">
          <span class="avt">{{ initials() }}</span>
          <span style="text-align:left">
            <span class="name">{{ displayName() }}</span>
            <span class="role">{{ primaryRole() }}</span>
          </span>
          <span class="chev">▾</span>
        </button>
      </div>
    </header>
  `,
})
export class AdminTopbarComponent {
  readonly shell = inject(AdminShellService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly displayName = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return '—';
    return u.fullName || u.username;
  });

  readonly initials = computed(() => {
    const u = this.auth.currentUser();
    const source = u?.fullName || u?.username || '?';
    const parts = source.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  readonly primaryRole = computed(() => {
    const u = this.auth.currentUser();
    if (!u || u.roles.length === 0) return '—';
    if (u.roles.includes('superadmin')) return 'superadmin';
    if (u.roles.includes('admin')) return 'admin';
    return u.roles[0];
  });

  readonly logoutTitle = computed(() => `Deconectează ${this.displayName()}`);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
