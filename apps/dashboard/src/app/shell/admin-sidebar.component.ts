import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminShellService } from './admin-shell.service';

interface SideItem {
  label: string;
  routerLink: string;
  icon: string;
  badge?: { count: number | string; tone?: 'warn' | 'danger' };
  exact?: boolean;
}

interface SideGroup {
  group: string;
  items: SideItem[];
}

/**
 * Left navigation per v04 design: 3 sectioned groups (Operare /
 * Conținut / Sistem) plus an "Altele" bucket for modules that ship
 * before they get formal sidebar slots. Collapse state lives in
 * AdminShellService.
 */
@Component({
  selector: 'sz-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="side">
      <a class="side__brand" href="https://sintezaur.ro" target="_blank" rel="noopener" title="Vezi site public">
        <img src="/assets/brand/logo-white.png" alt="" />
        <span class="side__brand-text">Sintezaur</span>
      </a>

      <div class="side__scroll">
        @for (g of groups; track g.group) {
          <div class="side__group">{{ g.group }}</div>
          @for (item of g.items; track item.routerLink) {
            <a
              class="side__item"
              [routerLink]="item.routerLink"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
            >
              <svg><use [attr.href]="'#' + item.icon" /></svg>
              <span class="side__item-label">{{ item.label }}</span>
              @if (item.badge) {
                <span
                  class="side__item-badge"
                  [class.is-warn]="item.badge.tone === 'warn'"
                >{{ item.badge.count }}</span>
              }
            </a>
          }
        }
      </div>

      <div class="side__foot">
        <button class="side__collapse" type="button" (click)="shell.toggleCollapse()">
          <svg><use href="#i-chev-l" /></svg>
          <span>Restrânge</span>
        </button>
      </div>
    </aside>
  `,
})
export class AdminSidebarComponent {
  readonly shell = inject(AdminShellService);

  readonly groups: SideGroup[] = [
    {
      group: 'Operare',
      items: [
        { label: 'Dashboard', routerLink: '/', icon: 'i-grid', exact: true },
        { label: 'Useri', routerLink: '/useri', icon: 'i-users' },
      ],
    },
    {
      group: 'Conținut',
      items: [
        { label: 'Tezaur', routerLink: '/tezaur', icon: 'i-archive' },
        { label: 'Familii Tezaur', routerLink: '/tezaur/families', icon: 'i-stack' },
        { label: 'Bazar', routerLink: '/bazar', icon: 'i-tag' },
        { label: 'Revistă', routerLink: '/revista', icon: 'i-book' },
        { label: 'Forum', routerLink: '/forum-queue', icon: 'i-chat' },
      ],
    },
    {
      group: 'Sistem',
      items: [
        { label: 'Rapoarte', routerLink: '/rapoarte', icon: 'i-flag' },
        { label: 'Audit log', routerLink: '/audit-log', icon: 'i-log' },
        { label: 'Currency rates', routerLink: '/currency-rates', icon: 'i-coins' },
        { label: 'Badges', routerLink: '/badges', icon: 'i-badge' },
        { label: 'Storage', routerLink: '/storage', icon: 'i-folder' },
      ],
    },
    {
      group: 'Altele',
      items: [
        { label: 'Pagini legale', routerLink: '/legal', icon: 'i-sliders' },
        { label: 'Mesaje contact', routerLink: '/contact-messages', icon: 'i-mail' },
        { label: 'Feedback', routerLink: '/feedback', icon: 'i-alert' },
      ],
    },
  ];
}
