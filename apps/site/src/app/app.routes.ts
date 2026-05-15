import { Route } from '@angular/router';
import { authGuard, editorGuard } from './auth/auth.guard';

/**
 * Site routes. M1 ships auth + a stub home; section routes
 * (`/tezaur`, `/bazar`, `/revista`, `/forum`) land in M2/M3/M4/M5.
 */
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home.page').then((m) => m.HomePage),
  },
  {
    path: 'tezaur',
    pathMatch: 'full',
    loadComponent: () =>
      import('./tezaur/tezaur-list.page').then((m) => m.TezaurListPage),
  },
  {
    path: 'tezaur/:slug',
    loadComponent: () =>
      import('./tezaur/tezaur-detail.page').then((m) => m.TezaurDetailPage),
  },
  {
    path: 'tezaur/:slug/:tab',
    loadComponent: () =>
      import('./tezaur/tezaur-detail.page').then((m) => m.TezaurDetailPage),
  },
  {
    path: 'bazar',
    pathMatch: 'full',
    loadComponent: () =>
      import('./bazar/bazar-list.page').then((m) => m.BazarListPage),
  },
  {
    path: 'bazar/nou',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./bazar/bazar-form.page').then((m) => m.BazarFormPage),
  },
  {
    path: 'bazar/:slug/editare',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./bazar/bazar-form.page').then((m) => m.BazarFormPage),
  },
  {
    path: 'bazar/:slug',
    loadComponent: () =>
      import('./bazar/bazar-detail.page').then((m) => m.BazarDetailPage),
  },
  {
    path: 'revista',
    pathMatch: 'full',
    loadComponent: () =>
      import('./revista/revista-list.page').then((m) => m.RevistaListPage),
  },
  {
    path: 'revista/nou',
    canActivate: [editorGuard],
    loadComponent: () =>
      import('./revista/revista-form.page').then((m) => m.RevistaFormPage),
  },
  {
    path: 'revista/:slug/editare',
    canActivate: [editorGuard],
    loadComponent: () =>
      import('./revista/revista-form.page').then((m) => m.RevistaFormPage),
  },
  {
    path: 'revista/:slug',
    loadComponent: () =>
      import('./revista/revista-detail.page').then((m) => m.RevistaDetailPage),
  },
  {
    path: 'autor/:username',
    loadComponent: () =>
      import('./revista/author-profile.page').then((m) => m.AuthorProfilePage),
  },
  {
    path: 'forum',
    pathMatch: 'full',
    loadComponent: () =>
      import('./forum/forum-list.page').then((m) => m.ForumListPage),
  },
  {
    path: 'forum/cautare',
    pathMatch: 'full',
    loadComponent: () =>
      import('./forum/forum-search.page').then((m) => m.ForumSearchPage),
  },
  {
    path: 'forum/:category',
    pathMatch: 'full',
    loadComponent: () =>
      import('./forum/forum-category.page').then((m) => m.ForumCategoryPage),
  },
  {
    path: 'forum/:category/nou',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./forum/forum-form.page').then((m) => m.ForumFormPage),
  },
  {
    path: 'forum/:category/:slug',
    loadComponent: () =>
      import('./forum/forum-thread.page').then((m) => m.ForumThreadPage),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./auth/pages/signup.page').then((m) => m.SignupPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./auth/pages/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./auth/pages/reset-password.page').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./auth/pages/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'cont',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./account/account-home.page').then((m) => m.AccountHomePage),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./account/profile-edit.page').then(
            (m) => m.ProfileEditPage,
          ),
      },
      {
        path: 'parola',
        loadComponent: () =>
          import('./account/change-password.page').then(
            (m) => m.ChangePasswordPage,
          ),
      },
      {
        path: 'email',
        loadComponent: () =>
          import('./account/change-email.page').then((m) => m.ChangeEmailPage),
      },
      {
        path: 'mesaje',
        pathMatch: 'full',
        loadComponent: () =>
          import('./account/messages-inbox.page').then(
            (m) => m.MessagesInboxPage,
          ),
      },
      {
        path: 'mesaje/:threadId',
        loadComponent: () =>
          import('./account/messages-thread.page').then(
            (m) => m.MessagesThreadPage,
          ),
      },
      {
        path: 'anunturi',
        loadComponent: () =>
          import('./account/my-listings.page').then((m) => m.MyListingsPage),
      },
      {
        path: 'salvate',
        loadComponent: () =>
          import('./account/my-watches.page').then((m) => m.MyWatchesPage),
      },
      {
        path: 'cautari-salvate',
        loadComponent: () =>
          import('./account/saved-searches.page').then(
            (m) => m.SavedSearchesPage,
          ),
      },
      {
        path: 'abonamente',
        loadComponent: () =>
          import('./account/forum-subscriptions.page').then(
            (m) => m.ForumSubscriptionsPage,
          ),
      },
      {
        path: 'blocuri',
        loadComponent: () =>
          import('./account/blocks-list.page').then(
            (m) => m.BlocksListPage,
          ),
      },
      {
        path: 'date',
        loadComponent: () =>
          import('./account/account-data.page').then(
            (m) => m.AccountDataPage,
          ),
      },
      {
        path: 'preferinte',
        loadComponent: () =>
          import('./account/notification-preferences.page').then(
            (m) => m.NotificationPreferencesPage,
          ),
      },
    ],
  },
  // Legal & informational static pages (M6-A). Five share one component;
  // the slug travels via route `data`. Contact has its own component
  // because it hosts the submit form.
  {
    path: 'termeni',
    data: { slug: 'termeni' },
    loadComponent: () =>
      import('./legal/legal-page.component').then((m) => m.LegalPage),
  },
  {
    path: 'confidentialitate',
    data: { slug: 'confidentialitate' },
    loadComponent: () =>
      import('./legal/legal-page.component').then((m) => m.LegalPage),
  },
  {
    path: 'cookies',
    data: { slug: 'cookies' },
    loadComponent: () =>
      import('./legal/legal-page.component').then((m) => m.LegalPage),
  },
  {
    path: 'regulament-forum',
    data: { slug: 'regulament-forum' },
    loadComponent: () =>
      import('./legal/legal-page.component').then((m) => m.LegalPage),
  },
  {
    path: 'despre',
    data: { slug: 'despre' },
    loadComponent: () =>
      import('./legal/legal-page.component').then((m) => m.LegalPage),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./legal/contact-page.component').then((m) => m.ContactPage),
  },
  // 410 Gone (M6-C) — wired for the post-redirect-expiry flow described
  // in docs/seo-todo.md. Currently used manually by components that want
  // to surface a definitive "this used to exist but won't again" page.
  {
    path: 'gone',
    data: { variant: 'gone' },
    loadComponent: () =>
      import('./ui/not-found.page').then((m) => m.NotFoundPage),
  },
  // Catch-all 404 (M6-C). MUST stay last in this list.
  {
    path: '**',
    loadComponent: () =>
      import('./ui/not-found.page').then((m) => m.NotFoundPage),
  },
];
