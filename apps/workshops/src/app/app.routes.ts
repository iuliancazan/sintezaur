import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  { path: '**', redirectTo: '' },
];
