import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminIconsComponent } from './shell/admin-icons.component';

/**
 * Dashboard root. The actual chrome (sidebar + topbar) lives in
 * AdminShellComponent and is wrapped around the authenticated
 * routes via the route tree (see app.routes.ts). The root component
 * only renders the SVG sprite + outlet so /login can fall through
 * without inheriting any admin layout.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AdminIconsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sz-admin-icons />
    <router-outlet />
  `,
})
export class App {}
