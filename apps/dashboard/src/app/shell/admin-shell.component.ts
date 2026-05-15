import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminShellService } from './admin-shell.service';
import { AdminSidebarComponent } from './admin-sidebar.component';
import { AdminTopbarComponent } from './admin-topbar.component';

/**
 * Outer two-column grid: sticky sidebar + main column with sticky
 * topbar above the router outlet. Pages render their own
 * `<div class="main__pad">` wrapper so they control padding +
 * max-width per layout (overview vs. list vs. edit).
 */
@Component({
  selector: 'sz-admin-shell',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminTopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-shell" [class.is-collapsed]="shell.collapsed()">
      <sz-admin-sidebar />
      <div class="main">
        <sz-admin-topbar />
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminShellComponent {
  readonly shell = inject(AdminShellService);
}
