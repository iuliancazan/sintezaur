import { Route } from '@angular/router';
import { roleGuard, workshopGuard } from './core/guards';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'panel',
    canActivate: [roleGuard('superadmin')],
    loadComponent: () =>
      import('./pages/panel/panel.page').then((m) => m.PanelPage),
  },
  {
    path: 'w/:slug',
    canActivate: [workshopGuard],
    loadComponent: () => import('./pages/hub/hub.page').then((m) => m.HubPage),
  },
  {
    path: 'w/:slug/slides',
    canActivate: [workshopGuard],
    loadComponent: () =>
      import('./pages/deck/deck.page').then((m) => m.DeckPage),
  },
  { path: '**', redirectTo: '' },
];
