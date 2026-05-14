import { Route } from '@angular/router';
import { staffGuard } from './auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [staffGuard],
    loadComponent: () => import('./home.page').then((m) => m.HomePage),
  },
];
