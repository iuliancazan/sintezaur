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
    path: 'bazar',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./bazar/bazar-admin.page').then((m) => m.BazarAdminPage),
  },
  {
    path: 'revista',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./revista/revista-admin.page').then((m) => m.RevistaAdminPage),
  },
  {
    path: 'useri',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./users/users-admin.page').then((m) => m.UsersAdminPage),
  },
  {
    path: 'badges',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./badges/badges-admin.page').then((m) => m.BadgesAdminPage),
  },
  {
    path: 'rapoarte',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./reports/reports-admin.page').then((m) => m.ReportsAdminPage),
  },
  {
    path: 'forum-queue',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./forum-queue/forum-queue.page').then((m) => m.ForumQueuePage),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [staffGuard],
    loadComponent: () => import('./home.page').then((m) => m.HomePage),
  },
];
