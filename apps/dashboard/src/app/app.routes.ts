import { Route } from '@angular/router';
import { staffGuard } from './auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tezaur',
    pathMatch: 'full',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./tezaur/tezaur-list.page').then((m) => m.TezaurAdminListPage),
  },
  {
    path: 'tezaur/new',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./tezaur/tezaur-edit.page').then((m) => m.TezaurAdminEditPage),
  },
  {
    path: 'tezaur/:id/edit',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./tezaur/tezaur-edit.page').then((m) => m.TezaurAdminEditPage),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [staffGuard],
    loadComponent: () => import('./home.page').then((m) => m.HomePage),
  },
];
