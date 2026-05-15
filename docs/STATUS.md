# Sintezaur — execution status

Single source of truth pentru hand-off între sesiuni. Convenție: ultimul pas în
fiecare commit de sub-fază este actualizarea acestui fișier (linia + "Next up").
Niciodată nu poate diverge de git log dacă regula e respectată.

## Current state

**Last shipped:** **M13-A** — site design import v05, foundation.
V05 `styles.css` copiat la `apps/site/src/v05.css` (4503 linii) cu
dark tokens swapped la valorile v2-neutral hex per design decision
(`#0a0a0b`/`#131314`/`#181819`/...). Light theme rămâne warm cream
din v05. `apps/site/src/styles.scss` migrat de pe
`libs/ui/tokens/tokens.css` pe noul `v05.css`. SVG sprite component
nou — `V05SpriteComponent` în `apps/site/src/app/ui/` cu 58 simboluri
lifted 1:1 din toate paginile v05 (search, bell, sun, moon, heart,
pin, arrow, mail, burger, plus, check, alert, info, flag, eye, link,
image, list, grid, archive, book, bookmark, tag, chat, reply, quote,
share, external, doc, log, code, play, upload, download, cog, coins,
truck, users, sliders, density, shield, logout, etc.). Sprite mount
în app.ts root; footer markup aliniat la clasele V05 (`.foot` /
`.foot__grid` / `.foot__col` / `.brand` / `.locale`) — stilurile
inline din app.ts eliminate, livrate acum global de `v05.css`.
`libs/ui` și `apps/dashboard` neatinse. Build OK (CSS bundle 30→31 kB).

M12 anterior (dashboard design import v04) rămâne deployment ultimului
commit pe dashboard. Re-skin
complet al `apps/dashboard`: shell nou inline (sidebar + admin
topbar + SVG sprite în `apps/dashboard/src/app/shell/`), tokens
oklch din `docs/design-imports/2026-05-16-v04` override-uiți peste
`libs/ui/tokens/tokens.css` (scope dashboard only, site neatins).
Theme + density + sidebar-collapse persistate via
`AdminShellService` în signals + localStorage (`sintezaur-theme`,
`sintezaur-admin-density`, `sintezaur-admin-side`). Pagini noi:
`/` (DashboardPage cu KPI strip + alerts + activity feed +
quick actions + section pulse), `/useri/:id` (UserEditPage cu
breadcrumb + sticky save bar + 4 tabs + role radio-grid + danger
zone). `/useri` re-skin: filter bar sticky + bulk actions strip +
PrimeNG TableModule peste design tokens. Login decuplat de shell
(centered card pe `.auth-shell`). Restul paginilor admin (Tezaur,
Bazar, Revistă, Forum-queue, Rapoarte, Badges, Audit, Currency,
Storage, Legal, Contact, Feedback) păstrează template-ul vechi
dar inherit shell + tokens via fallback global `main.admin`.
Light = default. `home.page.ts` șters (înlocuit de
`dashboard.page.ts`). Acest milestone a fost executat
out-of-order — M11 (Tezaur contributor) rămâne next.

**Next up:** **M13-B** — Home page re-skin (Guest + Logat variants per
`docs/design-imports/2026-05-16-v05/Home - Guest.html` + `Home -
Logat.html`). Hero rotator + revista grid + bazar scroll +
forum-with-pulse + tezaur spotlight + catalog + cta-strip + newsletter.
Auth-aware conditional shell (welcome strip pentru logați). După M13-G
și închiderea M13 completă, revenim la **M11** — Tezaur contributor
flow per spec §7.2: rol
`contributor` (auto-promote la 100 forum posts) și `curator` (manual
de admin) primesc capacitatea de a propune / edita echipamente direct
de pe site (`/tezaur/propune`, „Editează" inline pe `/tezaur/:slug`),
cu coadă moderare pentru status `pending_review`. Cod existent
pe API: `@RolesAllowed('curator','admin','superadmin')` — trebuie
relaxat la `contributor` cu guard own-only pe update / delete.

**Active milestone:** M13 — site design import v05; sub-faze
A (foundation) ✅ / B (Home) / C (Bazar) / D (Tezaur) /
E (Revistă) / F (Forum) / G (Cont + close).

## Milestones

### M0 — Scaffold

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| —   | `e4de783` | done | Nx monorepo skeleton |
| —   | `d4c9cbf` | done | Claude Design v01 import |

### M1 — Auth

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| backend  | `6099aef` | done | schema + cookie-JWT endpoints |
| frontend | `83851c0` | done | site auth pages + dashboard login + first-admin seed |

### M2 — Tezaur

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `dcdecc2` | done | backend: schema, FT search, image pipeline, CRUD, 109 seed entries |
| B   | `ed91d90` | done | design infra: tokens, 7 atomic components, PrimeNG preset, topbar |
| C1  | `56a16fe` | done | site `/tezaur` list page |
| C2  | `d6f6d21` | done | site `/tezaur/:slug` detail page (6 URL-routed tabs) |
| C3  | `f1952b2` | done | dashboard `/tezaur` admin |

### M3 — Bazar

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `9d4465b` | done | schema: listings/photos/threads/messages/transactions/reviews/notifications |
| B   | `c872825` | done | SzEditor în libs/ui + listings backend CRUD + photos + quick-list |
| C+D | `a0f7b0e` | done | saved-search/watch/expiry crons + realtime chat/offers/transactions/reviews |
| E1  | `af36af9` | done | site `/bazar` list page |
| E2  | `6b136e9` | done | site `/bazar/:slug` detail |
| E3  | `4e5c205` | done | site `/bazar/nou` + `/bazar/:slug/editare` form |
| E4a | `20b54ae` | done | site inbox + chat thread |
| E4b | `33d70e0` | done | structured offers cu 5-round cap |
| E4c | `2dc0567` | done | bilateral transaction confirm + review submission |
| E5a | `bb4bc91` | done | my-listings + my-watches dashboards |
| E5b | `8b6ca82` | done | saved-searches manager + "save current filters" CTA |
| E5c | `6444894` | done | notification bell + drop-down panel în topbar |
| E6  | `ea35e0f` | done | dashboard Bazar moderation |
| EWS | `f728db7` | done | Socket.io client — live notifications + live chat |

### M3.5 — Cross-cutting

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| roles | `8603848` | done | 8-role system, multi-valued via user_roles, superadmin gate |
| spec  | `3045a87` | done | forum categories locked v0.3 + 2-level hybrid threading |

### M4 — Revista

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `c04660e` | done | schema: articles + article_gear + article_images + minimal forum_categories/threads |
| B   | `69fb01b` | done | backend ArticleModule: editor CRUD + publish auto-thread + image pipeline + admin moderation |
| C   | `952d49c` | done | site `/revista` list + detail + `/autor/:username` profile |
| D   | `bca979e` | done | inline composer pe `/revista/nou` + `/revista/:slug/editare` cu Tiptap rich |
| E   | `553821b` | done | dashboard moderare articole + grant roluri (editor/curator/moderator) |
| F   | `49b520a` | done | revista category follow + publish fan-out (`revista_article_in_followed_category` §7.5) |

### M5 — Forum

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `dcf95d0` | done | schema: forum_posts + likes + mentions + 3-way subscriptions + badges; 9 categorii seed |
| B   | `eb57245` | done | backend: 3 services (Categories/Threads/Posts) + 3 controllers (Public/Auth/Mod) |
| C   | `31b5b99` | done | site read pages: `/forum` index + `/forum/:category` listă + `/forum/:category/:slug` thread cu 2-level threading + sourceLink pentru system threads |
| D   | `b204883` | done | posting (new thread page + inline reply + general reply + edit window + delete) + `@mention` autocomplete (server parsing) + pending state UI + mention-search endpoint |
| E   | `7395179` | done | likes toggle + 4-level subscriptions (thread + category) + bell dropdown UI + auto-watch on reply + notification fan-out (mention > revista-author > thread-watcher) + `/cont/abonamente` |
| F   | `a2fcd23` | done | badge awarding (3 kinds: post_count / account_age_days / likes_received) + instant hooks (post / like) + nightly cron sweep 04:00 UTC + dashboard CRUD + 6 seeded badges + `forum_badge_earned` notify + secțiune badges pe `/autor/:username` |
| G   | `6899eb3` | done | mod inline kebab (hide/lock/pin/delete/approve/reject) + report dialog cu 5 categorii + content_reports CRUD + `/rapoarte` queue cu acțiuni combinate (hide+resolve / lock+resolve / delete+resolve) + audit_log per acțiune + notify (`forum_mod_action_on_my_content` + `forum_report_resolved`) |
| H   | `1417fce` | done | faceted search `/forum/cautare` (text + category + author + date + tags + gear_tag, ts_headline snippets cu `<mark>`) + tags + gear_tag schema (migration 0010) + tag input + gear picker pe thread form + anti-spam stack (honeypot + time-on-form + IP rate-limit per-process) + dashboard `/forum-queue` first-post approval |
| I   | `efd6b1c` | done | thread oficial per echipament (Tezaur toggle integration, reverse FK migration 0011) + auto-OP + toggle ON/OFF cu reuse pe re-enable + audit log + card oficial + listă related threads pe `/tezaur/:slug` forum tab + checkbox „Thread oficial" în dashboard tezaur edit |

### M6 — Polish + Soft-launch prep + MVP foundation closure

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `83c6ba4` | done | pagini legale (6 slug-uri seed RO) + admin `/legal` CRUD + formular contact public cu honeypot + admin `/contact-messages` queue + cookies banner + footer extins + migration `0012_legal_pages` + seed `9009_legal_pages_seed` + `marked` lib pentru render markdown |
| B   | `4f786ad` | done | SEO mediu: `SeoService` global (title+description+OG+Twitter+canonical) cablat pe Home/Tezaur/Bazar/Revista/Forum/Autor/Legal + JSON-LD per tip (Product/Article/ClassifiedAd/DiscussionForumPosting/ProfilePage/WebSite) + `GET /sitemap.xml` dinamic (129 URL baseline) + `GET /robots.txt` dinamic + `docs/seo-todo.md` |
| C   | `0f08502` | done | polish UI pass: ToastService + ToastContainer + HttpErrorInterceptor global (network/5xx/429/403) + NotFoundPage brand-aware pentru 404 + 410 catch-all + EmptyStateComponent cablat pe 9 spoturi (Tezaur/Bazar/Revista lists, Forum cautare + category, 5 account pages) + SkeletonComponent CSS-only aplicat pe legal page |
| D   | `e663622` | done | schema `user_feedback` (migration 0013) + backend `FeedbackModule` (POST auth-only cu throttle + email notify operator, GET/PATCH admin) + site FeedbackService + FeedbackModal (mount root shell, link declanșator în `/cont`, auto-capture pathname+search) + dashboard `/feedback` queue cu filtre status+kind + expand-row + auto-mark-read |
| E1  | `5e36ec7` | done | profil public: `users.location` (migration `9010`) + `AuthUserPublic` extins (bio/location/avatar/website/3× social) + `PATCH /auth/me/profile` + `POST/DELETE /auth/me/avatar` (256×256 WebP dedicat) + site `/cont/profil` cu uploader + form complet + link „Profil" în meniul `/cont` + `/autor/:username` afișează location |
| E2  | `ff5ef8c` | done | block + report UI cablat: backend `BlocksModule` (`/me/blocks` GET/POST/DELETE) + `ContentReportsService.verifyTarget` + `snapshot` extins pe `listing`/`message`/`gear_review`/`user_profile` + `listings.listPublic` filtrează vânzători blocați; site `BlocksService` + `<app-block-button>` + `<app-report-button>` reusable, wired pe bazar detail (seller card), chat thread (header), `/autor/:username` (safety actions); `/cont/blocuri` list page; dashboard `/rapoarte` queue extins cu 4 target options noi + link-uri |
| E3  | `0668be0` | done | MVP foundation closure: backend `AuditLogService.list` cu filtre + `AdminClosureModule` (`GET /admin/audit-log`, `GET/POST /admin/currency-rates`) + `CurrencyRatesService` cu audit logging; seed `9011_currency_rate_eur_seed` (EUR→RON 5.0700); dashboard `/audit-log` viewer (filter action/target/perioadă + expand JSON), `/currency-rates` admin (form + istoric); home: 2 module noi (Audit log activ înlocuiește placeholder „Land în M2.5", Curs valutar) |
| E4  | `2cc2ceb` | done | pre-launch hardening: GDPR `GET /auth/me/export` (JSON dump 19 secțiuni) + `DELETE /auth/me/account` (PII anonymize + soft-delete listings + hide forum posts + clear cookies); site `/cont/date` cu magic-phrase confirm; slug_redirect INSERT pe rename article publicat + lookup pe revista 404 (gone vs redirect); Tezaur lookup returnează `expired` (410 path); `user_email_history` INSERT pe verifyEmail când email schimbat; nou `gdpr_self_delete` audit action (migration `9012`) |

### M7 — Storage Refactor (Local → Cloudflare R2)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `6341d09` | done | StorageDriver interface (libs/shared) + Local/S3 drivers (apps/api/storage) + StorageModule env-driven; schema migration `9013` (storage_limits + user_upload_quota + storage_events + storage_folder_stats + forum_post_attachments + revista_article_attachments + 4 enums); seed migration `9014` (limite default per spec, idempotent); StorageService refactat la driver I/O cu chei content-addressed (`<module>/<resource>/<source>/<variant>-<hash12>.jpg`); refactor callers Tezaur/Bazar/Revista la `deleteObjects(keys[])`; avatar pipeline pe driver cu cache mutable; env nou (`STORAGE_DRIVER` + `STORAGE_PUBLIC_BASE_URL` + `R2_*`); `@aws-sdk/client-s3@^3.1047.0` adăugat; smoke script `tools/scripts/smoke-storage.ts` |
| B   | `d23661f` | done | Magic-byte detector (8 formats, zero-dep); `StorageLimitsService` (wildcard fallback + cache 5min); `UploadQuotaService` (`check()` 413/429 pre-upload + `track()` storage_events/user_upload_quota/storage_folder_stats + lifetime alert notification); StorageService extins cu `processAudio`/`processPdf`/`processZip` + integrare quota pe image/avatar; public `GET /api/storage/limits` (cache 300s); migration `9015` adaugă `storage_quota_lifetime_reached` în `notification_kind`; pg-boss crons în worker — `storage:reset-daily-quota` @ 00:00 UTC + `storage:reconcile` @ 03:00 UTC (paginat 1000 keys/page + 200ms sleep, no-op pe LocalDriver); DB type rename `StorageFileType` → `StorageFileTypeValue`; smoke check extins cu 10 cazuri magic-byte |
| C   | `e246332` | done | Forum attachments backend (`POST/DELETE /forum/posts/:postId/attachments` cu max 3 enforce + `GET /forum/threads/:slug/attachments` public) + Revista attachments backend (uncapped, optional caption); site `AttachmentsService` HTTP client cu cache 5min limite + wildcard fallback; site `AttachmentBoxComponent` (uploader + delete) + `AttachmentListComponent` (audio `<audio controls>` inline / PDF link / ZIP download); wire pe `forum-thread.page` (per post pentru autor) + `revista-detail.page` (sub article body pentru autor/editor/admin); i18n key `revista.attachments_label`; `StorageDriver` interface: `Buffer` → `Uint8Array` ca să rămână libs/shared browser-safe |
| D   | `a81b883` | done | Backend `AdminStorageService` + `AdminStorageController` cu 7 endpoints (GET limits/overview/folders/trends/users + PUT limits/:id + POST reconcile + GET users/:id/quota); admin-gated `@RolesAllowed('admin','superadmin')`; PUT invalidează cache-ul `StorageLimitsService`; reconcile fires pg-boss one-shot. Dashboard `/storage` cu 5 tabs (Limits editabil cu inline number input + Salvează + toast / Overview 2 metric cards + per-modul + per-tip / Folders drill-down + module filter / Trends granularity+date range / Top users limit 50) + buton „Reconcile acum". Card „Storage" pe home dashboard. `docs/devops/storage-r2.md` (10 pași cutover R2). `docs/testing/m7-testing.md` (5 secțiuni manual test plan + debugging appendix). Director nou `docs/testing/`. |

### M8 — MVP gap closure

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| —   | `931561c` | done | Notification preferences UI `/cont/preferinte` (§7.5) cu matrix grupat pe modul × 2 channels (in-app/email); backend `GET/PUT /me/notifications/preferences` cu DEFAULT_PREFS merged + bulk upsert. Toggle public/privat colecție §11 (`users.collection_public` migration `9016` default true, expus pe AuthUserPublic + authorProfile, checkbox în `/cont/profil` sub Confidențialitate). Umami Cloud analytics §M6 — `UmamiService` la APP_INITIALIZER injectează script tag când env-urile populate (no-op pe dev). i18n: 20 kind labels noi + grupuri + col headers + common.loading/saving. AuthUser type extins cu collectionPublic. |

### M9 — SEO closure + unified search + observability

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `4e2103c` | done | Forum 410 Gone (§7.13 — `ForumThreadsService.lookupSlugRedirect` + `handleSlugMiss` helper în controller + site honor pe `forum-thread.page`); BreadcrumbList JSON-LD pe 4 detail pages via `SeoService.breadcrumbList()` static helper + array form `setJsonLd([primary, breadcrumb])`; homepage Organization + WebSite SearchAction (sitelinks search box); brand placeholders generate via `tools/scripts/generate-brand-assets.ts` (Sharp) — `og-default.png` 1200×630 + `logo.png` 512×512; warnings cleanup (NG8107/8102 bio.value, 2× NG8113 imports nefolosite, bundle budget 1500kb/2500kb) |
| B   | `9f0e604` | done | Unified cross-module search `/cautare` (§7.6) — backend `UnifiedSearchService` fan-out paralel cu try/catch per section + public `GET /api/search?q=&limit=` (min 2 chars, max 20/section); site `SearchPage` cu debounce 300ms + URL param sync + 4 grouped sections (top 5 + „Vezi toate" deep-links); app shell topbar search button cablat; homepage SearchAction target swap `/forum/cautare` → `/cautare`; i18n `search.*` block nou; ForumModule.exports extended cu ForumSearchService |
| C   | `1b5762a` | done | Observability M6 deliverables. **Sentry** `@sentry/nestjs@^10.53.1` + `@sentry/node@^10.53.1` — `instrument.ts` (side-effect init before NestFactory) + `SentryModule.forRoot()` în api + worker AppModule. Worker tagged `service: 'worker'`. 4 env vars opționale (`SENTRY_DSN/ENVIRONMENT/TRACES_SAMPLE_RATE/RELEASE`), no-op pe dev. **Daily pg_dump**: `PgDumpBackupJob` cron `backup:pg-dump` @ 02:30 UTC, `pg_dump --format=custom --compress=9` la `BACKUP_DIR` (default `./storage/backups`) + prune > `BACKUP_RETAIN_DAYS` (default 14). `docs/devops/backups.md` cu 3 layers (local + Hetzner Storage Box rclone + restore drill trimestrial). |

### M12 — Dashboard design import v04 (out-of-order before M11)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| —   | `b641f85` | done | Re-skin complet apps/dashboard la `docs/design-imports/2026-05-16-v04`. **Shell** inline în `apps/dashboard/src/app/shell/` (AdminShellComponent + AdminSidebarComponent + AdminTopbarComponent + AdminIconsComponent SVG sprite + AdminShellService cu theme/density/collapse persisted via signals + localStorage). **Tokens v04 oklch** override peste `libs/ui/tokens/tokens.css` în `apps/dashboard/src/styles.scss` (scope dashboard only — site neatins, alt agent lucra paralel pe M10 site UX). **Pagini noi:** `/` DashboardPage (KPI strip, alerts, activity feed, quick actions, section pulse), `/useri/:id` UserEditPage (breadcrumb, sticky save bar, 4 tabs, role radio-grid, danger zone). **Re-skin Useri list** cu filter bar sticky + bulk actions + PrimeNG TableModule peste design tokens. **Login** decuplat de shell (centered `.auth-shell` + `.auth-card`). **Restul paginilor** admin inherit shell + tokens via fallback global `main.admin` din `styles.scss`. Default theme = `light`, density = `comfortable`. `home.page.ts` șters. `app.routes.ts` mutat la shell-wrapped child route tree. `docs/testing/m12-testing.md` cu plan complet de testare manual. |

### M13 — Site design import v05 (out-of-order before M11)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | _TBD_ | in progress | Foundation: V05 `styles.css` copiat la `apps/site/src/v05.css` (4503 linii) cu dark tokens swapped la valorile v2-neutral hex per design decision (`#0a0a0b`/`#131314`/`#181819`/...). Light theme rămâne warm cream. `apps/site/src/styles.scss` migrat de pe `libs/ui/tokens/tokens.css` pe `v05.css`. Nou `V05SpriteComponent` (`apps/site/src/app/ui/v05-sprite.component.ts`) cu 58 simboluri SVG lifted 1:1 din toate paginile v05. Sprite mount în `app.ts` root. Footer markup aliniat la clasele V05 (`.foot` / `.foot__grid` / `.foot__col` / `.brand` / `.locale`) — stilurile inline din app.ts eliminate (livrate global de v05.css). `libs/ui` și `apps/dashboard` neatinse. Build OK (CSS bundle 30→31 kB). |
| B   | _TBD_ | pending | Home page re-skin (Guest + Logat conditional shell). |
| C   | _TBD_ | pending | Bazar list + detail. |
| D   | _TBD_ | pending | Tezaur list + detail. |
| E   | _TBD_ | pending | Revista list + detail. |
| F   | _TBD_ | pending | Forum (list, thread, category, new, search). |
| G   | _TBD_ | pending | Cont pages (Favorite, Mesaje, Setari) + `docs/testing/m13-testing.md` + close. |

### M10 — Post-launch UX iteration #1 (cont reorg)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `f7a1008` | done | Topbar avatar dropdown role-gated înlocuiește butonul „CONT". `SzAvatarComponent` cu `seed` (oklch hue determinist din `user.id`); `SzTopbarComponent` cu accountClick emit + accountMenuOpen border-state. Nouă `AccountMenuComponent` în site (fixed panel à la notifications, outside-click + Esc, item-uri: Setări, Anunțurile mele, Trimite feedback, Dashboard pentru admin/superadmin, Ieși din cont). i18n: 3 chei. Dashboard wired la goHome ca să păstreze comportamentul vechi. |
| B   | `ee939ac` | done | Iconițe ❤️ ✉️ în topbar + burger mobile. Sprite gains `mail` icon; topbar primește 3 inputs (showFavorites/Messages/Burger) + badge slot pe ✉️ + class `.sz-icon-btn--collapsible` care ascunde iconițele sub 640px. Nouă `MobileMenuComponent` slide-in din dreapta cu favorite/mesaje/theme/setări/anunțuri/feedback/dashboard/logout. App shell juggle 3 panouri mutually exclusive. |
| C   | `0227d3d` | done | `/cont/setari` shell cu 6 tab-uri peste paginile existente (Profil/Parolă/Email/Datele mele/Preferințe notificări/Utilizatori blocați). `AuthShell.embedded` mode pentru change-password / change-email când sunt în shell. 6 redirect-uri vechi (`/cont/profil` etc.) → noile tab-uri. i18n: `account.settings.*`. |
| D   | `0627544` | done | `/cont/favorite` shell cu 3 tab-uri (Anunțuri salvate, Căutări salvate, Abonamente forum) peste paginile existente. 3 redirect-uri vechi. Heart click în topbar → `/cont/favorite`. i18n: `account.favorites.*`. |
| E   | `25e8fba` | done | `/cont/mesaje` shell cu tab Bazar (inbox live) + Forum (placeholder „În curând" pentru viitoare PM-uri Forum). Threadul `:threadId` rămâne pe URL-ul vechi (acum copil al shell-ului). Default tab redirect la `bazar`. i18n: `account.messages_shell.*`. Future dev notat: unified inbox Bazar+Forum cu badge pe sursă. |
| F   | `ea1f957` | done | Cleanup: `account-home.page.ts` șters, `/cont` redirect → `/cont/setari`, chei i18n orfane curățate (`my_watches`, `saved_searches`). `docs/testing/m10-testing.md` cu plan manual pentru toate 6 sub-faze + regresie + bookmark-uri vechi + known limitations. |

## Conventions (recap from memory)

- **Spec-first:** rundă de 5-8 întrebări înainte de cod, plan aprobat, apoi implement.
- **Code în engleză, UI în română** (i18n strict).
- **Commit & push între sub-faze.** Ultimul pas în fiecare commit:
  bifează linia în acest fișier + actualizează "Next up".
- **Spec autoritativ:** `docs/spec/spec.md` (citează § când iei decizii).
- **Migrations:** drizzle-kit generează cu nume aleator — redenumesc manual la
  `<idx>_<descriptive>.sql` + actualizez `meta/_journal.json` ca să nu colidă
  prefixele.
