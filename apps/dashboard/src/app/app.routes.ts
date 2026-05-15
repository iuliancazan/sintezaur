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
    path: 'legal',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./legal/legal-admin.page').then((m) => m.LegalAdminPage),
  },
  {
    path: 'contact-messages',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./legal/contact-messages.page').then(
        (m) => m.ContactMessagesPage,
      ),
  },
  {
    path: 'feedback',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./feedback/feedback-admin.page').then(
        (m) => m.FeedbackAdminPage,
      ),
  },
  {
    path: 'audit-log',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./admin-closure/audit-log.page').then((m) => m.AuditLogPage),
  },
  {
    path: 'currency-rates',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./admin-closure/currency-rates.page').then(
        (m) => m.CurrencyRatesPage,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [staffGuard],
    loadComponent: () => import('./home.page').then((m) => m.HomePage),
  },
];
