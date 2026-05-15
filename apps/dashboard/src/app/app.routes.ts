import { Route } from '@angular/router';
import { staffGuard } from './auth/auth.guard';
import { AdminShellComponent } from './shell/admin-shell.component';

/**
 * All authenticated admin routes hang off a single shell route — the
 * AdminShellComponent renders the sidebar + topbar around a nested
 * <router-outlet>. /login stays outside the shell so the auth flow
 * doesn't inherit the chrome.
 */
export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [staffGuard],
    canActivateChild: [staffGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'useri',
        pathMatch: 'full',
        loadComponent: () =>
          import('./users/users-admin.page').then((m) => m.UsersAdminPage),
      },
      {
        path: 'useri/:id',
        loadComponent: () =>
          import('./users/user-edit.page').then((m) => m.UserEditPage),
      },
      {
        path: 'tezaur',
        pathMatch: 'full',
        loadComponent: () =>
          import('./tezaur/tezaur-list.page').then((m) => m.TezaurAdminListPage),
      },
      {
        path: 'tezaur/new',
        loadComponent: () =>
          import('./tezaur/tezaur-edit.page').then((m) => m.TezaurAdminEditPage),
      },
      {
        path: 'tezaur/:id/edit',
        loadComponent: () =>
          import('./tezaur/tezaur-edit.page').then((m) => m.TezaurAdminEditPage),
      },
      {
        path: 'bazar',
        loadComponent: () =>
          import('./bazar/bazar-admin.page').then((m) => m.BazarAdminPage),
      },
      {
        path: 'revista',
        loadComponent: () =>
          import('./revista/revista-admin.page').then((m) => m.RevistaAdminPage),
      },
      {
        path: 'badges',
        loadComponent: () =>
          import('./badges/badges-admin.page').then((m) => m.BadgesAdminPage),
      },
      {
        path: 'rapoarte',
        loadComponent: () =>
          import('./reports/reports-admin.page').then(
            (m) => m.ReportsAdminPage,
          ),
      },
      {
        path: 'forum-queue',
        loadComponent: () =>
          import('./forum-queue/forum-queue.page').then((m) => m.ForumQueuePage),
      },
      {
        path: 'legal',
        loadComponent: () =>
          import('./legal/legal-admin.page').then((m) => m.LegalAdminPage),
      },
      {
        path: 'contact-messages',
        loadComponent: () =>
          import('./legal/contact-messages.page').then(
            (m) => m.ContactMessagesPage,
          ),
      },
      {
        path: 'feedback',
        loadComponent: () =>
          import('./feedback/feedback-admin.page').then(
            (m) => m.FeedbackAdminPage,
          ),
      },
      {
        path: 'audit-log',
        loadComponent: () =>
          import('./admin-closure/audit-log.page').then((m) => m.AuditLogPage),
      },
      {
        path: 'currency-rates',
        loadComponent: () =>
          import('./admin-closure/currency-rates.page').then(
            (m) => m.CurrencyRatesPage,
          ),
      },
      {
        path: 'storage',
        loadComponent: () =>
          import('./storage/storage-admin.page').then((m) => m.StorageAdminPage),
      },
    ],
  },
];
