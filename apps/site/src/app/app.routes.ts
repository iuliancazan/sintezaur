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
    path: 'cautare',
    loadComponent: () =>
      import('./search/search.page').then((m) => m.SearchPage),
  },
  {
    path: 'tezaur',
    pathMatch: 'full',
    loadComponent: () =>
      import('./tezaur/tezaur-list.page').then((m) => m.TezaurListPage),
  },
  {
    path: 'tezaur/adauga',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./tezaur/tezaur-add.page').then((m) => m.TezaurAddPage),
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
      // M10-F: the old per-link grid landing is retired. Hitting
      // `/cont` now lands on the first Setări tab.
      { path: '', redirectTo: 'setari', pathMatch: 'full' },
      // M10-C: legacy paths redirect into the new /cont/setari shell.
      { path: 'profil', redirectTo: 'setari/profil', pathMatch: 'full' },
      { path: 'parola', redirectTo: 'setari/parola', pathMatch: 'full' },
      { path: 'email', redirectTo: 'setari/email', pathMatch: 'full' },
      { path: 'date', redirectTo: 'setari/date', pathMatch: 'full' },
      { path: 'preferinte', redirectTo: 'setari/preferinte', pathMatch: 'full' },
      { path: 'blocuri', redirectTo: 'setari/blocuri', pathMatch: 'full' },
      {
        path: 'setari',
        loadComponent: () =>
          import('./account/settings-shell.page').then(
            (m) => m.SettingsShellPage,
          ),
        children: [
          { path: '', redirectTo: 'profil', pathMatch: 'full' },
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
              import('./account/change-email.page').then(
                (m) => m.ChangeEmailPage,
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
          {
            path: 'blocuri',
            loadComponent: () =>
              import('./account/blocks-list.page').then(
                (m) => m.BlocksListPage,
              ),
          },
        ],
      },
      {
        path: 'mesaje',
        loadComponent: () =>
          import('./account/messages-shell.page').then(
            (m) => m.MessagesShellPage,
          ),
        children: [
          { path: '', redirectTo: 'bazar', pathMatch: 'full' },
          {
            path: 'bazar',
            pathMatch: 'full',
            loadComponent: () =>
              import('./account/messages-inbox.page').then(
                (m) => m.MessagesInboxPage,
              ),
          },
          {
            path: 'forum',
            loadComponent: () =>
              import('./account/forum-messages-placeholder.page').then(
                (m) => m.ForumMessagesPlaceholderPage,
              ),
          },
          // Legacy /cont/mesaje/:threadId — kept inside the shell so
          // bookmarks and notification deep-links keep working.
          {
            path: ':threadId',
            loadComponent: () =>
              import('./account/messages-thread.page').then(
                (m) => m.MessagesThreadPage,
              ),
          },
        ],
      },
      {
        path: 'anunturi',
        loadComponent: () =>
          import('./account/my-listings.page').then((m) => m.MyListingsPage),
      },
      {
        path: 'contributii-tezaur',
        loadComponent: () =>
          import('./account/my-tezaur-drafts.page').then(
            (m) => m.MyTezaurDraftsPage,
          ),
      },
      // M10-D: legacy favorites paths redirect into the new shell.
      { path: 'salvate', redirectTo: 'favorite/anunturi', pathMatch: 'full' },
      {
        path: 'cautari-salvate',
        redirectTo: 'favorite/cautari',
        pathMatch: 'full',
      },
      { path: 'abonamente', redirectTo: 'favorite/abonamente', pathMatch: 'full' },
      {
        path: 'favorite',
        loadComponent: () =>
          import('./account/favorites-shell.page').then(
            (m) => m.FavoritesShellPage,
          ),
        children: [
          { path: '', redirectTo: 'anunturi', pathMatch: 'full' },
          {
            path: 'anunturi',
            loadComponent: () =>
              import('./account/my-watches.page').then((m) => m.MyWatchesPage),
          },
          {
            path: 'cautari',
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
        ],
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
