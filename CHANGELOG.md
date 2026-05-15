# Changelog

User-facing log al feature-urilor livrate, organizat pe milestones (M0–M6).
Pentru hand-off între sesiuni de dev → `docs/STATUS.md`.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versionare pe milestone până la public launch (M6).

## [Unreleased]

### M9 — SEO closure + unified search + observability

#### M9-C — Observability: Sentry + daily pg_dump backup (`1b5762a`)

Spec §M6 deliverable — error tracking + offsite-able backup pipeline,
left over după soft-launch deploy.

- **Sentry** — `@sentry/nestjs@^10.53.1` + `@sentry/node@^10.53.1`
  adăugate la root package.json.
  - `apps/api/src/instrument.ts` + `apps/worker/src/instrument.ts` —
    side-effect-only imports care fac `Sentry.init` ÎNAINTE de
    `NestFactory.create`, ca să prindă erorile de boot.
  - Worker variant tagged `service: 'worker'` ca dashboard să poată
    split events.
  - `SentryModule.forRoot()` în api + worker AppModule pentru
    per-request integration (Nest exception filter chain).
  - 4 env vars opționale: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`,
    `SENTRY_TRACES_SAMPLE_RATE` (default 0.1), `SENTRY_RELEASE`.
    DSN gol = SDK init no-op (dev / CI no-warnings).
- **Daily pg_dump backup**:
  - `apps/worker/src/app/jobs/pg-dump.job.ts` — rulează
    `pg_dump --format=custom --compress=9` la `BACKUP_DIR` (default
    `./storage/backups`) cu nume timestamped, apoi prune fișiere
    mai vechi de `BACKUP_RETAIN_DAYS` (default 14).
  - Cron pg-boss `backup:pg-dump` @ `30 2 * * *` (02:30 UTC, before
    storage:reconcile la 03:00).
  - Necesită `postgresql-client` în imaginea worker — vezi
    `docs/devops/backups.md`.
- Env vars (.env.example + .env): `BACKUP_DIR`, `BACKUP_RETAIN_DAYS`,
  `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`,
  `SENTRY_RELEASE`.
- `docs/devops/backups.md` (nou) — 3-layer strategy:
  - Layer 1 (automatic): pg-boss cron de mai sus.
  - Layer 2 (manual offsite): rclone/rsync zilnic la Hetzner Storage
    Box BX11 (~€3.20/lună), configurat pe Coolify host cron.
  - Layer 3 (quarterly restore drill): checklist verificare că
    dump-ul cel mai recent poate fi restaurat pe un DB fresh.
  - Retention policy + security notes + open follow-ups.
- `docs/devops/tech-stack.md` — Sentry section nou cu cele 2 packages.
- `docs/testing/m9-testing.md` (nou) — plan manual pentru toate 3
  sub-faze (SEO closure / unified search / observability), 5
  secțiuni + appendix debugging commands.
- Verificări:
  - `nx run-many --target=typecheck --projects=api,worker,site,dashboard`
    — clean across all 4 apps.

**M9 ✅ complet** (A/B/C). Spec MVP feature-complete per gap
analysis. Mai rămân doar operational items pe Coolify (populate
SENTRY_DSN, configurează rclone, rulează manual test plan).

#### M9-B — Unified cross-module search `/cautare` (`9f0e604`)

Spec §7.6 — „One unified search page + per-section filtered search".

- Backend (`apps/api/src/app/search/`):
  - `UnifiedSearchService.search(q, limit)` fan-out paralel via
    `Promise.all` la 4 module:
    - `TezaurService.listPublic({ q, pageSize })`
    - `ListingsService.listPublic({ q, pageSize })`
    - `ArticlesService.listPublic({ q, pageSize })`
    - `ForumSearchService.search({ q, pageSize })`
  - Fiecare fan-out wrapped în try/catch — un section slow / broken
    nu pică toată request-ul.
  - Min query 2 caractere; max limit 20 / section.
  - Returnează native per-section item shapes (no projection) ca
    frontend să poată face render cu cards specifici per modul.
  - `UnifiedSearchController` `GET /api/search?q=&limit=`, `@Public()`.
  - `SearchModule` importă Tezaur/Bazar/Revista/Forum modules.
  - `ForumModule.exports` extins cu `ForumSearchService`.
- Site (`apps/site/src/app/search/`):
  - `UnifiedSearchService` HTTP client (providedIn root).
  - `SearchPage` la `/cautare`:
    - Input sync la `?q=` URL param (back-button friendly, shareable
      links).
    - Debounce 300ms pe input → `router.navigate({ q })` →
      `queryParamMap` subscription declanșează fetch-ul.
    - 4 grouped sections (Tezaur / Bazar / Revista / Forum), top 5 hits
      + „Vezi toate {N}" deep-link per section.
    - States complete i18n: empty / loading / too-short / no-results.
    - SEO meta setat la init.
  - App shell topbar search button cablat la `goToSearch()` →
    `router.navigate(['/cautare'])`. Înainte emitea `searchClick`
    fără handler.
  - Homepage `WebSite` JSON-LD `SearchAction` target swap
    `/forum/cautare?q=` → `/cautare?q=` — sitelinks search box
    Google → pagina unificată.
- i18n (`ro.json`) — block top-level nou `search.*`:
  - title, intro, placeholder, too_short, start_typing, no_results,
    totals, see_all, section_count, section.{tezaur,bazar,revista,forum}.
- Verificări:
  - `nx run api:typecheck` + `site:typecheck` — clean.
  - `nx run site:build --configuration=production` — zero warnings.

#### M9-A — SEO closure (`4e2103c`)

Final polish pass pe SEO surface promise în spec §7.7/§7.13 + items
deferred în `docs/seo-todo.md`. Plus build warnings cleanup.

- **Forum 410 Gone path** (spec §7.13):
  - `ForumThreadsService.lookupSlugRedirect(oldSlug)` mirror la
    Tezaur + Revista — returnează `{ newSlug, targetId, expired }`
    din `slug_redirects` pentru `targetType='forum_thread'`.
  - `PublicForumController.handleSlugMiss` helper — catch
    NotFoundException pe `findBySlug`, lookup redirect, throw 404
    cu body `{ message: 'gone'|'redirect', redirectTo }`.
  - Site `forum-thread.page.ts` honor redirect — `/gone` pe expired,
    `replaceUrl('/forum')` pe active.
- **BreadcrumbList JSON-LD** pe 4 detail pages (Tezaur / Bazar /
  Revista / Forum).
  - Nou `SeoService.breadcrumbList(items)` static helper.
  - `setJsonLd([primary, breadcrumb])` array form emite ambele
    blocks într-un singur `<script>` tag.
  - Unlock breadcrumb snippets în Google SERPs.
- **Homepage Organization + WebSite SearchAction**:
  - `WebSite` JSON-LD extins cu `potentialAction` SearchAction →
    `/forum/cautare?q={search_term_string}` (Google sitelinks
    search box unlock).
  - `Organization` JSON-LD nou cu `logo` + `sameAs` placeholder.
- **Brand placeholders**:
  - `tools/scripts/generate-brand-assets.ts` — Sharp-based generator
    pentru `og-default.png` (1200×630) + `logo.png` (512×512), brand
    color + wordmark. Idempotent.
  - Files commit-uite: `apps/site/public/assets/branding/og-default.png`
    (22.5 KB) + `logo.png` (7.7 KB). Fix dead-link path în
    `SeoService.DEFAULT_OG_IMAGE` + Revista publisher logo.
- **Build warnings cleanup**:
  - NG8107/NG8102 pe `form.controls.bio.value` — drop `??`, direct
    `.value.length`.
  - NG8113 `TPipe` neutilizat în `subscribe-bell.component.ts`.
  - NG8113 `SzIconComponent` neutilizat în `editor.component.ts`
    (libs/ui).
  - Bundle budget 1mb→1500kb warning / 2mb→2500kb error
    (Angular CLI parser trunchiază "1.5mb" → "1mb"; kb units
    funcționează corect).
- Verificări:
  - `nx run-many --target=typecheck --projects=api,worker,site,dashboard`
    — clean.
  - `nx run site:build --configuration=production` — zero warnings.

### M8 — MVP gap closure

#### M8 — Notification prefs UI + collection toggle + Umami (`931561c`)

Închide cele 3 items promise în spec dar nelivrate în M6.

- Backend `users.collection_public` boolean (migration `9016`,
  default `true` ca user-ii existenți să rămână opted-in). Expus pe:
  - `AuthUserPublic` (returnat din `/auth/me`).
  - `authorProfile()` din `ArticlesService` (în payload-ul
    `/autor/:username`).
  - `UpdateProfileDto.collectionPublic?: boolean` + auth.service
    patch via `PATCH /auth/me/profile`.
- `NotificationsService` extins:
  - `DEFAULT_PREFS` exportat (era privat).
  - `getPreferences(userId)` — returnează full matrix cu fallback
    la default merged server-side. Doar `in_app` + `email` channels
    expuse user-ului; `both` rămâne service-internal.
  - `setPreferences(userId, updates[])` — bulk UPSERT pe
    `(user_id, kind, channel)`. Missing rows = reset la default la
    resolve time.
- `NotificationsController` endpoints noi (auth-required):
  - `GET  /me/notifications/preferences`
  - `PUT  /me/notifications/preferences` — DTO validează toate 20
    kinds + 3 modes + 2 channels via `@IsIn`.
- Site `/cont/preferinte` page (`NotificationPreferencesPage`):
  - Matrix grupat pe modul (Bazar / Tezaur / Revista / Forum /
    Sistem), one row per kind + checkbox per channel.
  - Local edit buffer; Save batește toate change-urile într-un PUT.
  - Toast pe success; error message pe failure.
  - `NotificationPreferencesService` HTTP client (providedIn root).
- Site `/cont/profil`:
  - Fieldset nou „Confidențialitate" cu checkbox
    `collectionPublic` + help text.
  - `AuthUser` + `UpdateProfilePayload` types extinse cu
    `collectionPublic`.
- Site account-home menu: link nou la `/cont/preferinte` între
  „Abonamente forum" și „Feedback".
- `UmamiService` analytics (apps/site/src/app/analytics/):
  - Inject script tag la APP_INITIALIZER, idempotent.
  - Citește `environment.umamiWebsiteId` + `environment.umamiScriptUrl`.
  - No-op dacă oricare e gol — dev nu poluează prod stats.
  - Fire-and-forget; boot-ul nu așteaptă script load.
  - `environment.ts` + `environment.prod.ts` extinse cu cele două
    field-uri (goale by default).
- i18n (`ro.json`) extins:
  - `account.menu.notification_preferences = "Preferințe notificări"`.
  - `account.back` shared back-arrow.
  - `common.loading` + `common.saving`.
  - `prefs.*` block: title, intro, save, col headers (trigger / in_app
    / email), 5 group labels (bazar / tezaur / revista / forum /
    system), 20 kind labels (matching `NotificationKind` enum exact).
- Verificări locale:
  - `pnpm migrate` aplică `9016` curat, idempotent.
  - `nx run-many --target=typecheck --projects=api,worker,site,dashboard`
    — clean across all 4 apps.
- Notă: `userGearStatuses.is_public` (per-row) preservat
  ne-modificat — noul toggle la nivel de user e controlul MVP
  simplu per spec §11. Rendering-ul colecției pe `/autor/:username`
  e în afara scope-ului M8 (câmpul e expus în API pentru cine îl ia
  ulterior).

### M7 — Storage Refactor (Local → Cloudflare R2)

#### M7-D — Admin /admin/storage panel + R2 setup docs + testing plan (`a81b883`)

Închide M7. Admin-ii au vizibilitate + control complet asupra layer-ului
storage din dashboard, iar Iulian are playbook pas-cu-pas pentru
cutover R2.

- Backend (`apps/api/src/app/admin-storage/`):
  - `AdminStorageService` — toate agregările hit Postgres only
    (niciodată R2), deci dashboard-ul rămâne ieftin + snappy:
    - `listLimits()` cu join pe `users` pentru `updatedByUsername`.
    - `updateLimit(id, maxBytes, actorId)` — single PUT, invalidează
      cache-ul `StorageLimitsService` post-update.
    - `overview()` — totalBytes/totalEvents + per-module + per-fileType
      breakdowns din `storage_events`.
    - `folders(module?, limit?)` — top resurse după bytes din
      `storage_folder_stats`.
    - `trends(granularity, from?, to?)` — `date_trunc` bucketed serie
      temporală (day/week/month).
    - `topUsers(from?, to?, limit?)` — sum per user + join pe `users`.
    - `triggerReconcile()` — fires pg-boss one-shot `storage:reconcile`,
      returnează `jobId`.
    - `getUserQuota(userId)` — counter dump pentru user-detail drawer
      viitor.
  - `AdminStorageController` gated `@RolesAllowed('admin','superadmin')`
    cu 7 endpoints:
    - GET `/admin/storage/limits`
    - PUT `/admin/storage/limits/:id` (DTO `{ maxBytes: int 1..10 GiB }`)
    - GET `/admin/storage/overview`
    - GET `/admin/storage/folders?module=&limit=`
    - GET `/admin/storage/trends?granularity=&from=&to=`
    - GET `/admin/storage/users?from=&to=&limit=`
    - POST `/admin/storage/reconcile`
    - GET `/admin/storage/users/:id/quota`
  - `AdminStorageModule` cablat în `AppModule` între `AdminClosureModule`
    și `AdminUsersModule`.
- Dashboard (`apps/dashboard/src/app/storage/`):
  - `AdminStorageDashboardService` HTTP client (mirror al backend-ului,
    `providedIn: 'root'`, cookies pe fiecare request).
  - `StorageAdminPage` la `/storage` (staffGuard) cu 5 tabs:
    - **Limite**: tabel editabil cu inline number input + buton
      „Salvează" per rând + toast confirm. Afișează `updatedAt` +
      `updatedByUsername`. Edit propagă în ≤5min via cache invalidate.
    - **Overview**: 2 metric cards (Total bytes + Total uploads) +
      tabel per modul + tabel per tip fișier.
    - **Folders**: top resurse după bytes, filter optional pe modul.
    - **Trends**: switch granularitate (day/week/month) + date range
      pickers, vedere tabelară (chart deferred).
    - **Top useri**: sortat desc după bytes, limit 50.
    - Buton „Reconcile acum" în tab bar — fires manual job, toast cu
      jobId.
  - Link card „Storage" pe home dashboard (după „Curs valutar").
- `docs/devops/storage-r2.md` — playbook 10 pași pentru cutover:
  1. Create bucket Cloudflare R2.
  2. Connect domeniu `files.sintezaur.ro` (CNAME proxied automatic).
  3. Generate API token scoped pe bucket (Object Read & Write).
  4. Set env vars în Coolify Shared Variables.
  5. Wipe local uploads pe VPS (spec „wipe & remake").
  6. Redeploy + smoke test (upload + verify hash key + Cache-Control).
  7. WAF hotlink protection (opțional, M7.5).
  8. Backup strategy deferred (rclone sync sau accept users re-upload).
  9. Cost estimate ~$1-2/lună anul 1 (R2 zero egress).
  10. Rollback path: `STORAGE_DRIVER=local` în Coolify.
  Plus anexă cu convențiile object key (`<module>/<resource>/...`).
- `docs/testing/m7-testing.md` — plan manual de testare cu checkbox-style
  steps, 5 secțiuni:
  1. **Driver layer (M7-A)**: upload imagine Tezaur cu hash, avatar
     pipeline, delete cu cleanup.
  2. **Multi-type + quota (M7-B)**: magic-byte (pozitiv + fake rename
     negativ), per-file cap 413, daily cap 429 + reset, lifetime alert
     notification one-shot, public limits endpoint, crons trigger.
  3. **Attachments + site UI (M7-C)**: forum max 3, revista uncapped,
     client-side pre-check.
  4. **Admin panel (M7-D)**: access gating, fiecare tab, edit limit
     live propagation, buton reconcile.
  5. **Prod cutover**: smoke post-`STORAGE_DRIVER=s3`, reconciliation
     verifier, cost monitoring săptămânal.
  Plus appendix cu comenzi psql + docker exec pentru debugging.
  Director nou `docs/testing/` pentru viitoare plan-uri per milestone.
- Verificări locale:
  - `nx run api:typecheck` + `worker:typecheck` + `site:typecheck` +
    `dashboard:typecheck` — clean.
  - `pnpm tsx tools/scripts/smoke-storage.ts` — round-trip + 10
    cazuri magic-byte + 9 limite seed OK.

**Status M7:** ✅ shipped A/B/C/D. MVP storage e pe `LocalStorageDriver`
local; cutover-ul la R2 e flip de env Coolify documentat și reversibil
— fără modificări de cod necesare.

#### M7-C — Forum + Revista attachment endpoints + site UI (`e246332`)

- Backend (`apps/api/src/app/forum/`):
  - `ForumAttachmentsService` + `ForumAttachmentsController`:
    - `POST   /forum/posts/:postId/attachments` (multipart `file`,
      owner-only, max 3 enforced).
    - `DELETE /forum/posts/:postId/attachments/:attachmentId`
      (owner-only).
    - Routează upload-ul la `processAudio` / `processPdf` /
      `processZip` în funcție de magic-byte. Track prin
      `UploadQuotaService`.
  - Public read endpoint `GET /forum/threads/:slug/attachments`
    returnează toate atașamentele în single round-trip; thread page
    le indexează client-side pe `postId`.
- Backend (`apps/api/src/app/revista/`):
  - `RevistaAttachmentsService` + `RevistaAttachmentsController`:
    - `POST   /revista/articles/:articleId/attachments` (author or
      editor/admin, optional `caption`).
    - `DELETE /revista/articles/:articleId/attachments/:attachmentId`.
  - Public `GET /revista/:slug/attachments`.
- Ambele controllere folosesc multer cu cap 25 MB
  (`MAX_ATTACHMENT_INPUT_BYTES`); limita reală per tip vine din
  `storage_limits` și e aplicată în `UploadQuotaService.check()`.
- Filename sanitization (strip path separators + control chars +
  cap 200 chars) pe ambele servicii.
- Site (`apps/site/src/app/storage/`):
  - `AttachmentsService` HTTP client (`providedIn: 'root'`):
    - `uploadToForumPost`, `deleteForumAttachment`,
      `listForumAttachmentsByThread`, `uploadToRevistaArticle`,
      `deleteRevistaAttachment`, `listRevistaAttachmentsBySlug`,
      `getLimits` (cache 5min), `getPerFileMaxBytes` cu wildcard
      fallback identic backend-ului.
    - `describeError()` traduce 413/429/403 + network blips în
      mesaje RO user-facing.
  - `AttachmentListComponent` (read-only renderer):
    - Audio: native `<audio controls>` cu preload="metadata".
    - PDF: link `target=_blank rel=noopener`.
    - ZIP: link cu `download` attr.
    - Kind-coded badges (audio mov, PDF roșu, ZIP albastru),
      CSS-only, mobile-friendly.
  - `AttachmentBoxComponent` (uploader + manage):
    - File picker cu accept-list explicit (audio/pdf/zip mimes).
    - Pre-check mime + per-file cap client-side înainte să pună
      byte-uri pe wire.
    - Hides picker când e atins cap 3 pe Forum.
    - Emits `(changed)` ca pagina părinte să re-render counts /
      state.
- Site wiring:
  - `forum-thread.page.ts`:
    - Load all attachments o singură dată după thread fetch.
    - Index pe `postId` pentru O(1) lookup în template.
    - `<app-attachment-list>` sub fiecare body de post.
    - `<app-attachment-box>` doar pentru post-urile autorului.
    - `onAttachmentsChanged()` ține map-ul page-level sync fără
      refetch.
  - `revista-detail.page.ts`:
    - Load atașamente după article fetch.
    - `<app-attachment-list>` într-o secțiune labeled (i18n key
      `revista.attachments_label = "Atașamente"`).
    - `<app-attachment-box>` doar pentru autor / editor / admin.
- Cross-cutting: `libs/shared/src/lib/storage.ts` schimbă
  `StorageDriver.put(body)` + `get()` de la `Buffer` la
  `Uint8Array`. Node `Buffer` extinde `Uint8Array`, deci driverele
  concrete continuă să primească / returneze Buffer fără modificare.
  Schimbarea menține `@sintezaur/shared` browser-safe (site-ul
  pulează tipuri tranzitiv).
- Verificări locale:
  - `nx run api:typecheck` + `worker:typecheck` + `site:typecheck`
    — clean.
  - `pnpm tsx tools/scripts/smoke-storage.ts` — round-trip + 10
    cazuri magic-byte + 9 limite seed all OK.

#### M7-B — Multi-type pipeline + quota infra + storage crons (`d23661f`)

- Magic-byte detector (`apps/api/src/app/storage/file-type-detector.ts`):
  - Zero-dep sniffer pentru 8 formate: JPEG, PNG, WebP, MP3 (cu sau
    fără ID3v2), WAV, OGG, PDF, ZIP.
  - Client-supplied `Content-Type` devine advisory only — fiecare
    upload e validat pe primii 16 bytes înainte să ajungă la driver.
- `StorageLimitsService`:
  - Sursa unică de adevăr pentru caps. Resolution cu wildcard fallback:
    exact `(scope, file_type, module)` → `(scope, file_type, *)` →
    `(scope, *, module)` → `(scope, *, *)`.
  - Cache in-memory 5 min cu `invalidate()` hook pentru editare admin
    în M7-D.
  - `list()` pentru endpoint-ul public `GET /api/storage/limits`.
- `UploadQuotaService`:
  - Pre-upload `check()` aruncă `413 Payload Too Large` (per-file cap
    depășit) sau `429 Too Many Requests` (daily cap user) înainte ca
    byte-urile să ajungă la driver.
  - Post-upload `track()` într-o tranzacție:
    INSERT `storage_events` (audit append-only) +
    UPSERT `user_upload_quota` (`daily_bytes` + `lifetime_bytes`) +
    UPSERT `storage_folder_stats` (rollup `(module × resource_id)`).
  - Lifetime-alert notification one-shot: când user-ul depășește prima
    oară `per_user_lifetime_alert` threshold, primește notificare +
    fan-out la toți admin-ii. `notifiedLifetimeAt` stamp + UPDATE
    condițional ca să previn double-fire pe race conditions.
  - `untrack()` revine `storage_folder_stats` corect pe deletes
    (lifetime_bytes NU scade — reprezintă „ever uploaded").
  - Lazy same-day reset pe daily counter: primul request după 00:00
    UTC vede counter-ul reset, chiar înainte ca cron-ul să ruleze.
- `StorageService` extins:
  - `processAudio(module, resourceId, file, actorId)`,
    `processPdf(...)`, `processZip(...)` — magic-byte vet →
    `driver.put` → `quota.track`. Stored as-is, fără re-encode.
    Object keys: `<module>/<resource>/attachment-<sha256-12>.<ext>`.
  - `processImage` și `processAvatar` integrează acum `quota.check`
    + `quota.track`. Callers Tezaur/Bazar/Revista trimit `actorId`
    pentru ca uploads să intre în counters per-user.
- `StorageController` + `GET /api/storage/limits` (public, no auth,
  `Cache-Control: public, max-age=300`). Frontend pre-check source —
  aceleași date pe care le folosește backend-ul, deci edit din admin
  panel se propagă în ≤5 min.
- `StorageModule` extins (toate `@Global()`):
  - `StorageLimitsService` + `UploadQuotaService` + `StorageController`.
- Notification enum:
  - `storage_quota_lifetime_reached` adăugat în `notification_kind`
    (migration `9015_storage_notification_kinds.sql`, idempotent
    `ADD VALUE IF NOT EXISTS`).
  - `NotificationsService.DEFAULT_PREFS` extins cu noul kind
    (`in_app: 'on', email: 'on'`).
- pg-boss crons noi în `apps/worker/src/app/jobs/`:
  - `storage:reset-daily-quota` @ `0 0 * * *` (00:00 UTC) —
    `UPDATE user_upload_quota SET daily_bytes=0, last_reset_at=now()
    WHERE daily_bytes > 0`. Cheap + idempotent, fără churn pe useri
    dormanți.
  - `storage:reconcile` @ `0 3 * * *` (03:00 UTC) — paginat
    `ListObjectsV2` per module prefix (1000 keys/page, 200 ms sleep
    între pagini) vs `storage_events` aggregate. Logs drift > 1 MB.
    No-op când `STORAGE_DRIVER != s3` ca dev să stea quiet. Audit-log
    emission lands în M7-D.
- DB type rename: `StorageFileType` (din `@sintezaur/db`) →
  `StorageFileTypeValue`, ca să nu colideze cu `StorageFileType` din
  `@sintezaur/shared` (cel din DB include wildcard `'*'`; cel din
  shared e doar cele 4 valori reale).
- Smoke check extins (`tools/scripts/smoke-storage.ts`):
  10 cazuri magic-byte (8 positive + 1 frame-sync alternativ + 1
  negativ unknown). Toate pass.
- Verificări locale:
  - `pnpm migrate` aplică `9015` idempotent pe rerun.
  - `pnpm tsx tools/scripts/smoke-storage.ts` — driver round-trip
    + 10 cazuri magic-byte + 9 limite seed all OK.
  - `nx run api:typecheck` + `nx run worker:typecheck` — clean.

#### M7-A — Driver layer + schema + refactor existent (`6341d09`)

- StorageDriver interface (`libs/shared/src/lib/storage.ts`):
  - `StorageDriver` cu `put / get / delete / exists / url`.
  - Literali partajați (`STORAGE_MODULES`, `STORAGE_FILE_TYPES`,
    `STORAGE_DEFAULT_CACHE_CONTROL`). Pure TypeScript, fără import-uri
    Nest sau Node-only — păstrează `libs/shared` browser-safe.
- Drivers (`apps/api/src/app/storage/`):
  - `LocalStorageDriver` — scrie pe disc sub `UPLOADS_DIR` (default
    `./storage/uploads`), servit prin middleware-ul static existent la
    `/uploads/<key>`. Guard împotriva `..` în key.
  - `S3StorageDriver` — folosește `@aws-sdk/client-s3@^3.1047.0`
    împotriva Cloudflare R2 (`region='auto'`, `forcePathStyle=false`).
    Crap-uie cu mesaj clar dacă lipsește un `R2_*` var când
    `STORAGE_DRIVER=s3`.
  - `StorageModule` (`@Global()`) alege driver-ul la bootstrap din
    `STORAGE_DRIVER` env (`local` default | `s3`).
- Schema (migration `9013_storage_schema.sql`, raw postflight
  idempotent conform pattern repo `9XXX`):
  - `storage_limits` — caps editabile per `(scope × file_type × module)`
    cu fallback wildcard `*`. Read-heavy, write-rare — cachable.
  - `user_upload_quota` — counters per user (`daily_bytes`,
    `lifetime_bytes`, `last_reset_at`, `notified_lifetime_at`).
  - `storage_events` — audit log append-only al fiecărui `put`,
    indexat pe `(module, created_at)` + `(user_id, created_at)` +
    `(module, resource_id)` pentru agregările din admin panel M7-C.
  - `storage_folder_stats` — rollup incremental keyed pe
    `(module × resource_id)`, sursa de adevăr pentru Overview totals.
  - `forum_post_attachments` — audio/PDF/ZIP per Forum post
    (max 3 enforced service-side în M7-B).
  - `revista_article_attachments` — audio/PDF/ZIP per articol Revista
    (fără cap pe articol, doar quota personală).
  - 4 enum-uri noi: `storage_limit_scope`, `storage_file_type`,
    `storage_module`, `storage_attachment_kind`.
- Seed (migration `9014_storage_limits_seed.sql`, idempotent
  `ON CONFLICT DO NOTHING`) match-uiește execution-plan.md §M7:
  - Image 8 MB (toate modulele) / Audio 10 MB (Forum/Tezaur/Bazar) /
    Audio 20 MB (Revista) / PDF 10 MB / ZIP 20 MB per-file.
  - 50 MB/zi rolling per user.
  - 1 GB alert lifetime per user.
- `StorageService` refactat:
  - I/O delegată la driver — zero `writeFile` rămas.
  - Obiecte content-addressate:
    `<module>/<resource-id>/<source-id>/<variant>-<sha256-12>.jpg`
    pentru imagini (cache-safe immutable).
  - Avatar la cheie mutable `avatar/<user-id>.webp` cu
    `Cache-Control: public, max-age=60, must-revalidate`.
  - Vechiul `deleteSource(scope, entityId, sourceId, variants)`
    înlocuit cu `deleteObjects(keys[])` — callers query `path` din DB
    și pasează listă, fără convenții de reconstrucție.
- Callers refactați:
  - `TezaurService.detachImage` — select `path` din `gear_images`.
  - `ListingsService.detachPhoto` — select `path` din `listing_photos`.
  - `ArticlesService.detachImage` — select `path` din `article_images`.
  - `AuthService.setAvatar / removeAvatar` — neschimbat (signatures
    `processAvatar` / `deleteAvatar` păstrate).
- Wiring: `StorageModule` în `AppModule` înainte de `CommonModule` ca
  `StorageService` să-l poată injecta.
- Env (`.env.example` + `.env`):
  - `STORAGE_DRIVER` (`local|s3`, default `local`).
  - `STORAGE_PUBLIC_BASE_URL` (`http://localhost:3000/uploads` dev,
    `https://files.sintezaur.ro` prod).
  - `R2_ENDPOINT`, `R2_BUCKET=sintezaur-uploads`, `R2_ACCESS_KEY_ID`,
    `R2_SECRET_ACCESS_KEY` — populate doar pe Coolify la cutover.
- Dep nou: `@aws-sdk/client-s3@^3.1047.0` (root). `docs/devops/tech-stack.md`
  mutat din tabela „deliberate exclusions" în secțiunea activă.
- Smoke check standalone (`tools/scripts/smoke-storage.ts`):
  exersează put → exists → get → url → delete pe driver-ul activ +
  verifică seed-ul `storage_limits`. Rulează cu
  `pnpm tsx tools/scripts/smoke-storage.ts`. Repo-ul nu are
  infrastructură Jest cablată — script-ul ăsta e check-ul de regresie
  side-effect-free.
- Verificări locale:
  - `pnpm migrate` aplică `9013` + `9014` curat, idempotent pe rerun.
  - `pnpm tsx tools/scripts/smoke-storage.ts` — round-trip OK, 9 rânduri
    seed prezente.
  - `nx run api:typecheck` — clean pe api + shared + db + auth.
  - `nx serve api` — bootstrap ajunge la `app.listen()` fără erori DI
    (singur error e port conflict cu API-ul dev deja pornit).

### M6 — Polish + Soft-launch prep + MVP foundation closure

#### M6-E4 — Pre-launch hardening: GDPR + slug redirect + email history (`2cc2ceb`)

- Schema (additive, idempotent):
  - Migration `9012_audit_action_gdpr_delete.sql` — `ALTER TYPE
    audit_log_action ADD VALUE IF NOT EXISTS 'gdpr_self_delete'`.
    `AuditAction` TS union sincronizat.
- GDPR (spec §11 foundation, RGPD Art. 15 + 17):
  - `GdprModule` nou (`apps/api/src/app/gdpr/`):
    - `GET /auth/me/export` — JSON dump cu 19 secțiuni: profile (PII
      filtered: no password_hash / failed_login_count / locked_until),
      roles, emailHistory, listings, messagesSent, savedSearches,
      listingWatches, transactionsAsBuyer/Seller, transactionReviews
      Given/Received, gearCollection, gearReviews, forumPosts,
      forumLikes, threadSubscriptions, categorySubscriptions, articles,
      notificationPreferences, notifications, blocksMade,
      contentReportsFiled. Content-Disposition attachment cu nume
      `sintezaur-export-<YYYY-MM-DD>.json`.
    - `DELETE /auth/me/account` — tranzacție:
      1. `users` row anonimizat: email → `deleted-<id8>@sintezaur.local`,
         username → `deleted-<id8>`, fullName → `[utilizator șters]`,
         passwordHash, bio, location, avatar, website, 3× social,
         phone, verifications → NULL, `deletedAt = now()`.
      2. `refresh_tokens` / `email_verification_tokens` /
         `password_reset_tokens` → DELETE (session revoke).
      3. Listings active → status `removed` + `removed_at` (păstrează
         istoricul tranzacțiilor pentru cealaltă parte).
      4. Forum posts → `hidden_at` + `hidden_reason='account_deleted_by_user'`.
      Audit `gdpr_self_delete`. Cookies clear pe response.
  - Site `/cont/date` (`account-data.page.ts`) — 2 carduri:
    - **Export**: 1-click → download Blob JSON local (no server roundtrip
      for file write).
    - **Delete**: gated cu magic-phrase „ȘTERGE CONTUL" (input border
      flips la roșu pe match). Cancel button. Post-success navighează
      la `/`.
  - Link „Datele tale (RGPD)" în meniul `/cont`.
  - `AuthService.exportMyData()` + `deleteAccount()` site-side.
- slug_redirect (spec §7.13):
  - `ArticlesService.renameSlug` — INSERT în `slug_redirects` cu
    `targetType='article'` când slug-ul se schimbă pe articol PUBLICAT
    (pre-publish rename nu produce redirect — nimic public încă).
    Conflict pe UNIQUE swallowed (existing redirect kept).
  - `ArticlesService.lookupSlugRedirect` — returnează `newSlug +
    targetId + expired` (30-day TTL).
  - `PublicRevistaController.detail` — pe 404 verifică redirect; throw
    `NotFoundException({ message: 'redirect'|'gone', redirectTo })`.
  - `RevistaDetailPage` (site) — interceptează body 404 pentru
    `redirectTo`: `'gone'` → `/gone`, altminteri `navigateByUrl(
    redirectTo, { replaceUrl: true })`.
  - `TezaurService.lookupSlugRedirect` — refactored să returneze
    `expired:true` în loc să dispară silent → public-tezaur trimite
    `/gone` pentru expiry (era 404 plat înainte).
- user_email_history (spec §9):
  - `AuthService.verifyEmail` — în transacție capturează `users.email`
    curent ÎNAINTE de update; dacă diferă de noul email (i.e. e un
    flow `change-email`, nu signup confirmation), INSERT în
    `user_email_history` cu old/new + timestamp.
- **MVP scope locked + GDPR ready**: soft-launch sigur pe EU traffic,
  privacy policy livrabilă, slug-rename SEO-safe.

#### M6-E3 — MVP foundation closure: audit log + curs valutar (`0668be0`)

- Backend:
  - `AuditLogService.list(opts)` nou — paginated + filterable
    (action / targetType / actorId / from / to) cu LEFT JOIN pe users
    pentru `actorUsername`. Întoarce `items + totalCount + page +
    pageSize + totalPages`. Sortat newest-first.
  - `AuditAction` union extins cu `update_currency_rate` (valoarea
    exista deja în `audit_log_action` Postgres enum).
  - `AdminClosureModule` nou (`apps/api/src/app/admin-closure/`):
    `AdminClosureController` la `/admin/*` cu `@RolesAllowed('admin',
    'superadmin')`. Endpoints:
    - `GET /admin/audit-log` — filter + paginate
    - `GET /admin/currency-rates` — istoric complet (newest first)
    - `GET /admin/currency-rates/active` — rata curentă per monedă
    - `POST /admin/currency-rates` — adaugă rată nouă (validare numerică
      app-side: pozitiv, < 1000), audit-log `update_currency_rate`.
  - `CurrencyRatesService` cu `history()` / `active()` / `create()`.
    Fiecare insert e o linie nouă (`valid_from = now()`); istoric păstrat
    fără update pe rândurile existente.
- Migration:
  - `9011_currency_rate_eur_seed.sql` (postflight, idempotent) — seed
    inițial EUR→RON 5.0700 cu notă „Seed inițial M6-E3; BNR aprox.
    mai 2026". `NOT EXISTS` guard: nu re-seedează dacă admin a pus deja
    o rată.
- Dashboard:
  - `/audit-log` page nouă cu PrimeNG Table: filtre (acțiune dropdown
    cu 18 opțiuni + target_type input + from/to date), expand-row cu
    JSON pretty-print al `details`. Lazy-load 50/100/200 pe pagină,
    server-side pagination.
  - `/currency-rates` page nouă: card „Rată curentă" (1 EUR = X RON),
    form pentru rată nouă (regex `\d{1,3}(\.\d{1,4})?` + notă optional),
    p-table istoric complet. Submit creează linie nouă, prepended local.
  - `home.page.ts`: 2 module noi cablate — „Audit log" (înlocuiește
    placeholder „Land în M2.5") și „Curs valutar".
  - `AdminClosureService` (site-side admin) wraps cele 3 endpoints.
- Spec §11 foundation closing bullets — done:
  - „Admin dashboard: ... audit log viewer" ✅
  - „... currency rate updates" ✅
  - „`currency_rate` seeded with EUR-to-RON manual entry" ✅
- **MVP scope complete** — toate bullets `§11` (Foundation + Phase 1
  Bazar + Phase 2 Revista + Phase 3 Forum) sunt cablate. Soft-launch
  ready.

#### M6-E2 — Block & report UI cablat pe Bazar + Profil (`ff5ef8c`)

- Backend:
  - `BlocksModule` nou (`apps/api/src/app/blocks/`): `BlocksService` cu
    `list` (cu join pe users → username/fullName/avatar), `create`
    (acceptă `blockedUserId` UUID sau `blockedUsername` handle), `remove`
    (idempotent NotFound), `isBlocked`. `BlocksController` la
    `/me/blocks` (GET/POST/DELETE). DB constraint `user_blocks_not_self`
    și unique `(blocker, blocked)` aplică automat.
  - `ContentReportsService.verifyTarget` extins pe 4 surface-uri noi:
    `listing` (verifică `listings.sellerId`), `message`
    (`messages.senderId`), `gear_review` (`gearReviews.userId`),
    `user_profile` (`users.id`). Toate refuză auto-raport.
  - `ContentReportsService.snapshot` extins pentru aceleași 4 cu
    title/slug/bodyExcerpt corespunzător.
  - `listings.listPublic` filtrează acum vânzătorii blocați de viewer
    (subquery NOT IN pe `user_blocks` când `viewerId` e prezent).
    Anonimii văd tot — block aplică doar pentru blocker.
- Site:
  - `BlocksService` (`apps/site/src/app/blocks/blocks.service.ts`) —
    cache cu signal `items()` + computed Set de id-uri blocate. Metode
    `load()` / `loadIfStale()` / `block()` / `unblock()` / `isBlocked()`.
    Singleton; toate instanțele BlockButton citesc același cache.
  - `<app-block-button [userId] [username]?>` — toggle block/unblock,
    confirm browser pe block, toast pe ambele. Hidden pentru user-ul
    însuși și pentru anonimi. Hidratează cache-ul la mount.
  - `ReportsService` + `<app-report-button>` (refolosesc
    `<app-report-dialog>` din forum): 5 categorii + reason free-text,
    POST către `/content-reports` cu target generic. Reuse pe orice
    surface.
  - Wired pe:
    - **Bazar listing detail** (`bd-trust-actions` în seller card):
      `<app-report-button targetType="listing">` + block button.
    - **Chat thread** (`/cont/mesaje/:id` header): block button pentru
      celălalt party (computed via `view.listing.sellerId` vs `me`).
    - **`/autor/:username`** (header): block + report
      (target=`user_profile`).
  - `/cont/blocuri` page — listă cu avatar / username / fullName /
    reason / data + unblock 1-click. Link în meniul `/cont` între
    „Abonamente" și „Parolă".
- Dashboard:
  - `/rapoarte` queue: 4 target options noi în dropdown (Anunț Bazar /
    Mesaj chat / Review echipament / Profil user) + link-uri către
    surface-urile corespunzătoare în `link(row)`.
- Spec §11 Phase 1: bullet-uri „Block + report flows wired" — done.
  Block enforcement: chat (`assertNotBlocked` din M3, existent) +
  bazar list (nou). Forum block placeholder (`[Postare ascunsă]`) va
  rămâne TODO până la un sweep dedicat pe forum thread page.

#### M6-E1 — Profil public complet (`5e36ec7`)

- Schema:
  - `users.location text` adăugat (migration postflight
    `9010_users_location.sql`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`).
    Coloana e singura missing din foundation §11 spec; restul
    (`bio` / `avatar_url` / `website_url` / `social_*` / `display_currency`)
    existau din M1.
- Backend:
  - `AuthUserPublic` extins cu `bio` / `location` / `avatarUrl` /
    `websiteUrl` / `socialInstagram` / `socialSoundcloud` / `socialBandcamp`
    → `toPublic()` propagă tot setul de câmpuri publice. Hidratează
    automat în `/auth/me` + login + refresh.
  - `PATCH /api/auth/me/profile` — DTO `UpdateProfileDto` cu `fullName`,
    `bio`, `location`, `displayCurrency` (enum app-side `ron|eur`),
    `websiteUrl` (validate http(s)) și 3× social (max 80 chars). Toate
    optionale; `null` clears. Lungimi: bio 600, location 120, website 200,
    social 80, fullName 2–80. Sanitizare pe server (trim + empty → null +
    length check).
  - `POST /api/auth/me/avatar` — `FileInterceptor('file')`, scope `avatar`,
    pipeline dedicat `StorageService.processAvatar(userId, file)` →
    `256×256` WebP cover crop + EXIF strip, scrie la
    `<UPLOADS_DIR>/avatar/<userId>.webp`. Replaces existing automatically.
  - `DELETE /api/auth/me/avatar` — `StorageService.deleteAvatar(userId)` +
    `users.avatar_url = NULL`. Idempotent (missing file ignored).
  - `ArticlesService.authorProfile()` extins cu `location` în SELECT și
    în tipul returnat — apare pe `/autor/:username`.
- Site:
  - `/cont/profil` page (`profile-edit.page.ts`) — formular cu avatar
    uploader (preview cerc, „Încarcă avatar" / „Șterge"); câmpuri text
    fullName, location, bio (cu contor 600 chars), displayCurrency select
    RON/EUR, website URL + 3× social handles. Save dirty-only via PATCH.
    Toast feedback pe success + error 400 → mesaj din API.
  - Link „Profil" adăugat în `/cont` menu deasupra „Mesaje"
    (i18n `account.menu.profile`, deja exista în bundle).
  - Site + dashboard `AuthUser`: tip extins cu noile câmpuri. Metode noi
    pe `AuthService`: `updateProfile(patch)`, `uploadAvatar(file)`,
    `removeAvatar()`. Setează `_currentUser` din response → topbar avatar
    și nume reflectă schimbarea fără reload.
  - `/autor/:username` (revista author profile) afișează `location` între
    handle și bio cu `.ap-location` style mono uppercase.
- Închide spec §11 foundation — user profile complete (avatar + bio +
  location + display_currency + public page rendering).

#### M6-D — Feedback widget + admin queue (`e663622`)

- Schema `user_feedback` (M6-A enums activate aici, tabela în migration
  `0013_user_feedback`): user_id NOT NULL (auth-only), kind (bug/sugestie/
  altele), body, page_url, user_agent, ip_address, status (new/read/
  archived), read_by_user_id + read_at, 3 indexuri (status+created,
  kind+created, user+created).
- Backend `FeedbackModule`:
  - `POST /api/feedback` — auth required, throttle 10/min/IP, capture
    page_url + UA + IP. Email notification către `CONTACT_OPERATOR_EMAIL`
    cu kind + user + page + body (fire-and-forget, fail-soft).
  - `GET /api/admin/feedback?status&kind&page&pageSize` — admin queue
    cu join pe users pentru username + email + fullName.
  - `PATCH /api/admin/feedback/:id` — read/archived + audit prin
    read_by_user_id + read_at.
  - `GET /api/admin/feedback/unread` — count pentru viitor badge sidebar.
- Site:
  - `FeedbackService` (singleton): signal `open$` + metode `open()` /
    `close()` / `submit()`. Pattern shared-modal: link declanșează,
    modal-ul (mount în root shell) ascultă signal-ul.
  - `<app-feedback-modal>` montat în root shell — radio group cu 3
    categorii (cu hint inline pentru fiecare), textarea cu min 10 chars,
    auto-capture `window.location.pathname + search` afișat în hint.
    Submit → toast success + ecran „Mulțumim!" cu CTA „Trimite alt
    feedback" / „Închide". 401 → toast warn + close.
  - Link „Trimite feedback" în `/cont` (account-home page) ca buton
    discret între „Email" și „Ieși din cont". i18n key
    `account.menu.feedback`.
- Dashboard:
  - `/feedback` queue cu filtre pe status + kind (cu chips top), expand-row
    cu body + page_url + IP + UA + reply-link `mailto:`, auto-mark-read
    la prima expansiune, optimistic update, severity tags (bug=danger,
    sugestie=warn, altele=secondary).
  - Home: 1 modul nou „Feedback".
- TODO post-M6: notification kind dedicat `admin_user_feedback` în loc
  de email fallback (când vom avea volume mai mare); attachments
  (screenshot) — discutat ca placeholder, dar nu implementat.

**M6 complete (4/4):** A legal ✅ · B SEO ✅ · C polish ✅ · D feedback ✅.

#### M6-C — Polish UI: toast + interceptor + 404/410 + empty states + skeleton (`0f08502`)

- `ui/toast.service.ts` + `<app-toast-container>` — primitive minimal (no
  PrimeNG dep): 4 niveluri (info/success/warn/error), TTL implicit
  3.5s/5s/6.5s, sticky cu `ttlMs: 0`, slide-in CSS, `aria-live="polite"`,
  honors `prefers-reduced-motion`. Stack jos-dreapta, mobile fullwidth.
- `ui/http-error.interceptor.ts` — global error toast cu reguli:
  - `0` (network) → „Serverul nu răspunde" + detail despre conexiune
  - `401` → silent (auth interceptor face refresh + retry)
  - `404` → silent (componenta gestionează 404 inline)
  - `403` → „Nu ai permisiunea"
  - `429` → „Prea multe acțiuni" + sfat de așteptare
  - `5xx` → „Ceva nu a funcționat pe server"
  - alte `4xx` → silent (form validation inline)
  - exemptează `/auth/*` (login/signup/refresh etc. — au inline UX
    proprie, toast ar fi duplicat)
- `ui/not-found.page.ts` — 404 + 410 brand-aware (variant prin
  `route.data: { variant: 'gone' }`). Suggest 4 secțiuni principale,
  CTA spre `/` + spre `/contact` pentru raportare. `seo.set()` cu
  meta corespunzător. Catch-all route `**` la final + `/gone` route
  pentru viitorul flow post-redirect-expiry (vezi `docs/seo-todo.md`).
- `ui/empty-state.component.ts` — reusable cu inputs (`icon`, `title`,
  `lede`, `ctaLabel`, `ctaRouterLink`/`ctaQueryParams`/`ctaHref`,
  `compact`). Cablat pe 9 spoturi:
  - `/tezaur` cu filtre fără rezultate
  - `/bazar` cu filtre fără rezultate
  - `/revista` cu filtre fără rezultate
  - `/forum/cautare` fără rezultate
  - `/forum/:category` fără thread-uri (CTA „Deschide thread nou")
  - `/cont/mesaje` inbox gol (CTA „Vezi anunțuri")
  - `/cont/anunturi` user fără anunțuri (CTA „Publică anunț")
  - `/cont/salvate` watches goale (CTA „Vezi anunțuri")
  - `/cont/cautari-salvate` saved searches goale
  - `/cont/abonamente` (2 secțiuni: threads + categorii)
- `ui/skeleton.component.ts` — CSS shimmer pe linii cu width/height/
  radius configurable, honors reduced-motion. Aplicat pe `/legal/:slug`
  loading state (cea mai vizibilă pentru utilizatori noi). Pattern
  extensibil pe tezaur/revista detail în polish-ul viitor.
- Toast container montat în root shell sub router-outlet, după
  cookies banner.

#### M6-B — SEO mediu: meta + OG + JSON-LD + sitemap.xml (`4f786ad`)

- `SeoService` (site, providedIn root): un singur loc pentru title (cu sufix
  „· Sintezaur"), description, canonical, OG (title/description/image/url/type/
  site_name/locale `ro_RO`), Twitter cards (summary_large_image), JSON-LD.
  API simplă: `set({...})` + `setJsonLd(data)` + `clearJsonLd()`.
  `setJsonLd` injectează un singur
  `<script type="application/ld+json" id="sintezaur-jsonld">` în `<head>`,
  înlocuit la fiecare navigare. SSR-safe (`isPlatformBrowser` guards).
- Helper `seo.utils.ts`: `uploadUrl()`, `stripHtml()`, `clampDescription()` —
  refolosite de toate paginile detail pentru OG image + description.
- Pagini cu meta tags + JSON-LD:
  - **Home** — `WebSite` schema.
  - **Tezaur** list (description statică) + detail cu `Product` schema
    (brand, model, releaseDate, aggregateRating când există recenzii,
    AggregateOffer cu Discontinued/InStock).
  - **Bazar** list + detail cu `Product` schema (Offer cu price/currency/
    areaServed RO/itemCondition mapat din condition enum).
  - **Revista** list + detail cu `Article` schema (headline, datePublished,
    dateModified, author Person cu URL, publisher Organization, mainEntityOfPage).
  - **Forum** index + categorie (titlu dinamic per `res.category.name`) +
    thread cu `DiscussionForumPosting` schema (postCount → InteractionCounter).
  - **Autor** (`/autor/:username`) cu `ProfilePage` schema (Person + bio + avatar).
  - **Legal pages** (5) + **Contact** — switch de la `document.title = ...`
    la `seo.set()`.
- API `SeoModule`:
  - `GET /sitemap.xml` — XML cu toate URL-urile publice (11 statice + gear
    published+non-deleted + listings active + articles published + forum
    categories + non-deleted threads + legal pages cu lastmod din DB).
    Cache in-memory 1h, content-type `application/xml`, cache-control 1h.
    Baseline curent: 129 URL-uri.
  - `GET /robots.txt` — generat dinamic cu disallow pentru pagini private
    (cont, login, signup, forgot/reset password, verify-email) + linia
    `Sitemap: ${SITE_BASE_URL}/sitemap.xml`.
  - Ambele înregistrate la root via `setGlobalPrefix({ exclude: [...] })`
    care era deja configurat în M1.
- `apps/site/public/robots.txt` static actualizat să facă cross-domain spre
  `https://api.sintezaur.ro/sitemap.xml` (mențiune în comentariu că prod
  ideal e reverse-proxy în Coolify — vezi `docs/seo-todo.md`).
- `docs/seo-todo.md` — listă completă cu ce e deferred pentru SEO max:
  SSR/pre-render, slug_redirect verify pe articole + forum_threads, 410
  Gone după expirare, og-default.png asset, hreflang când vine EN,
  sitemap index split, BreadcrumbList/Review/FAQPage/SearchAction.
- TODO M6-C: pagini 404+410 brand-aware, empty states peste tot, HTTP
  error interceptor global, skeleton loaders pe paginile list+detail.

#### M6-A — Pagini legale + formular contact + cookies banner (`83c6ba4`)

- Migration `0012_legal_pages.sql` (schema) + `9009_legal_pages_seed.sql` (postflight seed). Două tabele noi:
  - `legal_pages (slug unique, title, body_md, meta_description, updated_by_user_id, timestamps)` — 6 slug-uri canonice: `termeni`, `confidentialitate`, `cookies`, `regulament-forum`, `despre`, `contact`.
  - `contact_messages (user_id?, name, email, category, subject, body, status, ip, ua, read_at, read_by_user_id, created_at)` cu 2 enums: `contact_message_category` (5 valori) + `contact_message_status` (new/read/archived).
  - Enums placeholder pentru M6-D: `user_feedback_kind` + `user_feedback_status` (tabela propriu-zisă creată în M6-D).
- Drafturi RO seedate pentru toate 6 paginile (Iulian Cazan persoană fizică, RO, Hetzner+Brevo ca data processors, mențiune ANSPDCP, retention 30 zile/3 ani/2 ani).
- Backend `LegalModule`:
  - Public: `GET /api/legal` (sumar pentru footer/sitemap) + `GET /api/legal/:slug` (body complet, cache pe slug client).
  - Admin: `GET /api/admin/legal` (cu body) + `PUT /api/admin/legal/:slug` (upsert, audit prin `updated_by_user_id`).
  - Public form: `POST /api/contact` (anonymous-friendly) cu honeypot + time-on-form (3s..6h) + throttle 5/min/IP peste global 60/min. Email notification către `CONTACT_OPERATOR_EMAIL` (fire-and-forget, fail-soft).
  - Admin queue: `GET /api/admin/contact-messages?status=&category=&page=&pageSize=` + `PATCH /:id` (read/archived) + `GET /unread` pentru badge.
- Site:
  - Rute noi: `/termeni`, `/confidentialitate`, `/cookies`, `/regulament-forum`, `/despre` (5 reutilizează `LegalPage` cu slug în `route.data`) + `/contact` (componentă proprie cu form).
  - Markdown render client-side via `marked` (instalat la rădăcină) + `DomSanitizer.bypassSecurityTrustHtml` (input din DB admin-edited, trust acceptat).
  - Formular contact: 5 categorii (cumpărător/vânzător/editor/juridic/altele), prefill name+email pentru utilizatorii autentificați, honeypot hidden via CSS, `formStartedAt` capturat la mount.
  - `<app-cookies-banner>` montat în root shell: notice discret bottom, dismiss persistă în `localStorage` (sintezaur.cookies.dismissed.v1), SSR-safe.
  - Footer extins cu `Cookies` + `Regulament forum` (RSS scos — nu există încă); link-urile mutate de pe `href` pe `routerLink` pentru navigare SPA.
- Dashboard:
  - `/legal` — tabel cu 6 rânduri + modal de editare (titlu, meta description, body markdown). Hint despre sintaxă în label.
  - `/contact-messages` — coadă cu filtre status (Noi/Citite/Arhivate/Toate), expand-row pe click cu body + IP + UA + reply link `mailto:`, auto-mark-read la prima expansiune, optimistic update.
  - Home: 2 module noi (`Pagini legale`, `Mesaje contact`).
- i18n: chei noi `footer.cookies` + `footer.forum_rules`.
- TODO M6-B: SEO meta + sitemap + slug_redirect verify (gear/article/thread) + 410 Gone după expirare.

### Forum (M5) — walking skeleton complet ✅

#### M5-I — Thread oficial per echipament (`efd6b1c`)
- Migration `0011_canonical_gear_thread.sql`: `forum_threads.canonical_for_gear_id uuid` cu unique partial index. Reverse FK conform spec §8.1 — permite reuse când editorul toggle-ează OFF→ON pe același echipament.
- `TezaurService.enableOfficialThread`:
  - dacă `gear.canonical_thread_id` deja setat → return existing
  - dacă thread cu `canonical_for_gear_id=gearId` există (toggle OFF anterior) → re-attach
  - altfel: creează thread nou în categoria `discutii_echipamente` cu OP auto-generat („Thread oficial pentru discuții despre **Brand Model**. Vezi specificații și istoric pe pagina [Tezaur](…).") + setează `gear.canonical_thread_id` + audit `set_canonical_thread`.
- `TezaurService.disableOfficialThread`: doar clear `gear.canonical_thread_id` (thread + replies preserve, FK reverse rămâne pentru reuse).
- Endpoints noi (curator/admin/superadmin):
  - `POST /api/admin/tezaur/gear/:id/canonical-thread` — toggle ON
  - `DELETE /api/admin/tezaur/gear/:id/canonical-thread` — toggle OFF
- Public `GET /api/tezaur/:slug` extins cu `officialThread: { id, slug, title, postCount, lastPostAt } | null` + `relatedThreadsCount` (count threads cu `gear_id ∈ gear_tag[]`).
- Site `/tezaur/:slug` forum tab:
  - card prominent cu badge „OFICIAL" + titlu + meta + lede explicativ când există thread
  - empty state explicativ pentru editori când lipsește
  - CTA dashed jos: „🔍 Caută toate thread-urile care menționează acest echipament (N)" → `/forum/cautare?gearId=...`
- Dashboard `/tezaur/:id/edit`: checkbox „Thread oficial pe forum" lângă `Publicat`. Click flip optimistic + apel endpoint + rollback la error. Hint pentru gear nou: „💡 După prima salvare…".

#### M5-H — Faceted search + anti-spam + tags + FPA queue (`1417fce`)
- Migration `0010_forum_thread_tags.sql` adaugă `forum_threads.tags text[]` + `gear_tag uuid[]` cu GIN indexes pentru containment queries.
- `ForumSearchService` + `GET /api/forum/search` (public): full-text via `forum_posts.search_vector`, filtre `q` + `categories[]` + `author` + `tag` + `gearId` + `from`/`to`, sort `relevance` (ts_rank) / `newest` / `most_replies`. Snippets prin `ts_headline` cu `<mark>` highlight.
- Pagina nouă site `/forum/cautare?q=...` cu form filter (URL-encoded share-able state) + chips category multi-select + listă rezultate cu snippets, tags vizibile, paginație.
- Tags + gear_tag pe thread form:
  - input simplu separat prin virgulă (lowercase, max 6, regex `[a-z0-9][a-z0-9-]{1,30}`)
  - gear picker cu debounce 250ms care apelează `/api/tezaur?q=` (max 5 echipamente)
  - tags vizibile sus pe thread page, click → `/forum/cautare?tag=...`
- `AntiSpamService` (in-memory token bucket): honeypot field + time-on-form (min 3s, max 6h) + rate limit IP (5/min, 30/h). Aplicat pe `POST /forum/threads`, `POST /forum/threads/:id/posts`, `POST /content-reports`.
- DTO-uri extinse cu `hp` + `formStartedAt` opționale; frontend setează timestamp-ul la deschiderea fiecărui composer.
- `GET /api/forum/mod/pending-posts` (mod): FIFO listă posts cu `status='pending'` cu thread + author + body excerpt joined.
- Dashboard `/forum-queue` (route nouă): tabel PrimeNG cu coadă FPA + butoane Aprobă / Respinge inline. Link în home page.
- `/forum` index header capătă buton „🔍 Caută" către pagina de search.
- i18n: bloc `forum.search.*` + tags/gear keys în `forum.compose.*`.

**Notă DX:** la prima rulare după pull, `nx reset` + clean `dist/` poate fi necesar dacă webpack păstrează typings stale (api build folosește `tsc` compiler via NxAppWebpackPlugin).

#### M5-G — Moderation inline + content_reports queue (`6899eb3`)
- Kebab `⋮` reutilizabil pe orice post și thread (componentă `<app-post-actions-menu>`):
  - „Raportează" pentru orice utilizator autentificat (nu pe propriul conținut).
  - Mod actions pentru `moderator|admin|superadmin`: Hide/Unhide post, Approve/Reject pending, Lock/Unlock + Pin/Unpin + Delete thread.
- Modal reutilizabil `<app-report-dialog>` cu două moduri:
  - `report` — 5 categorii predefinite (Spam / Hostilitate / Off-topic / Conținut ilegal / Altul) + textarea reason min 10 chars. Trimis ca `[CAT] reason text`.
  - `hide` — doar reason min 2 chars. Vizibil utilizatorului afectat în notificare.
- Backend `ContentReportsService` + `ContentReportsController`:
  - `POST /api/content-reports` (auth) — create cu unique-per-(reporter, target) când e `open`.
  - `GET /api/content-reports?status&targetType&page` (mod) — list cu snapshots (titlu thread, excerpt 240 chars din post body).
  - `PATCH /api/content-reports/:id/resolve` (mod) — rezolvare cu opțional `action` combinat (`hide_post` / `lock_thread` / `delete_thread`). One-click combo per spec interview.
- `ModForumController` extins: fiecare endpoint scrie `audit_log` (actor + IP + UA) + fan-out `forum_mod_action_on_my_content` la hide/delete cu reason vizibil în payload.
- `forum_report_resolved` notification către reporter la fiecare resolve.
- Dashboard `/rapoarte` (route nouă): tabel cu filtre status + targetType, butoane combinate per row, dialog confirmare cu reason + notă internă, link extern „Deschide" către target. Link în meniul home.
- AuditAction extended cu: `hide_post`, `unhide_post`, `lock_thread`, `unlock_thread`, `delete_thread`, `pin_thread`, `unpin_thread`, `first_post_approve`, `first_post_reject`.
- i18n: bloc `forum.report.*` + `forum.mod.*` + `forum.actions_menu` + `forum.action.report`.

#### M5-F — Badges (`a2fcd23`)
- Schema `badges` (definiții) + `user_badges` (awards) live din M5-A; M5-F livrează awarding-ul.
- Migration `9008_badges_seed.sql` cu 6 badge-uri default: Primul post / 10 postări / 100 postări / Veteran 1 an / Prima reacție „Util" / 50 reacții „Util".
- `BadgeAwardingService` (api) cu 3 evaluators: `post_count`, `account_age_days`, `likes_received`. Awarding idempotent (`ON CONFLICT DO NOTHING`), fire `forum_badge_earned` notification doar pentru insert-uri proaspete.
- Instant hooks: `ForumPostsService.createReply` + `createOp` + `ForumLikesService.toggle` apelează awarder cu candidatul natural (actor / autorul postării).
- Worker `BadgeSweepJob` la 04:00 UTC nightly — safety net pentru cazuri unsubscribed-de-hooks (badge nou definit, edit threshold). Duplică doar SQL evaluator (fără notificări — instant hook-urile acoperă fan-out-ul real-time).
- Backend endpoints noi:
  - `GET /api/badges` — catalog public
  - `GET /api/badges/users/:username` — awards pentru profil
  - `POST /api/badges` (admin) — create
  - `PATCH /api/badges/:id` (admin) — update
  - `DELETE /api/badges/:id` (admin) — delete + cascade pe user_badges
  - `POST /api/badges/sweep` (admin) — re-evaluează imediat
- Dashboard `/badges` cu full CRUD (PrimeNG Table + Dialog), buton manual sweep, link în home page.
- Site `/autor/:username` — secțiune nouă „Insigne" cu chips colorate per category (activity / membership / content / collection / trade / trust).

#### M5-E — Likes + subscriptions + notification fan-out (`7395179`)
- Buton „Util" funcțional pe fiecare postare cu toggle optimist și state vizual (highlight). Self-likes blocate. Counter denormalizat pe `forum_posts.like_count`.
- Clopoțel cu drop-down 5-opțiuni (Urmărești / Sumar zilnic / Doar mențiuni / Tăcere / Abonează-te) pe thread page + pagina categoriei. Componentă reutilizabilă `<app-forum-subscribe-bell>`.
- Auto-subscribe: autorul thread-ului devine automat `watching` la creare; orice user care răspunde într-un thread devine `watching` (idempotent — nu suprascrie un `muted` explicit).
- `/cont/abonamente` — pagină nouă cu două secțiuni (Thread-uri / Categorii) și bell per linie pentru schimbarea levelului sau dezabonare. Link adăugat în meniul `/cont`.
- Notification fan-out la fiecare reply aprobat, cu prioritate (mention > revista author > thread watcher) și dedup_key stabil per spec §7.5:
  - `forum_mention` — pentru fiecare user @-menționat în post (auto-suprimă reply-ul de mai jos).
  - `revista_reply_to_my_article` — către autorul articolului când reply-ul aterizează în `discutii_articole` (suprimă reply-ul watcher).
  - `forum_reply_in_subscribed` — către toți watchers cu level `watching` (mai puțin actorul + cei deja notificați).
- `tracking` level este stocat dar nu trimite emails încă (digest cron post-MVP); `mentioned_only` și `muted` excluse din fan-out real-time.
- Backend endpoints noi (toate auth):
  - `POST /api/forum/posts/:id/like` — toggle
  - `GET /api/forum/threads/:id/my-likes` — bulk lookup pentru render
  - `GET|PATCH /api/forum/threads/:id/subscription`
  - `GET|PATCH /api/forum/categories/:id/subscription`
  - `GET /api/forum/subscriptions/me` — listă agregată pentru account page

#### M5-D — Forum posting + `@mentions` (`b204883`)
- `/forum/:category/nou` — pagină nouă pentru thread nou (`authGuard`), titlu + SzEditor rich, validare 4–200 caractere titlu + min 4 caractere body.
- Buton „+ Thread nou" pe pagina categoriei (doar user kind + utilizator autentificat).
- Inline reply editor pe thread page — click pe „Răspunde" pe oricare post deschide un editor sub el cu `parentPostId` setat.
- General reply editor jos de tot pe thread page — colapsat default, click expandează, fără `parentPostId` (devine top-level reply).
- Editare propriei postări în fereastra de 30 min (configurable via `FORUM_EDIT_WINDOW_MINUTES`); moderatori pot edita oricând.
- Ștergere propriei postări (soft delete, exclude OP).
- `@mention` autocomplete prin `@tiptap/extension-mention` integrat în `SzEditor` cu input nou `mentionSuggest`. Dropdown custom (fără tippy.js), keyboard nav (↑/↓ + Enter/Tab), poziționare auto.
- Backend `GET /api/forum/mention-search?q=` (auth-only) cu max 8 rezultate.
- Backend extrage mențiuni server-side din `bodyHtml` (regex pe `data-user-id`), validează vs `users` table și populează `forum_post_mentions` atomic în `createOp` / `createReply` / `update`.
- Pending state UI: postările cu `status: 'pending'` (first-post approval queue) apar optimist pentru autor cu badge galben „în așteptare moderare" + toast informativ.
- Locked thread state: când thread-ul e locked, formularul general dispare cu notice „Thread blocat".
- Logged-out users văd CTA „Loghează-te ca să răspunzi" în loc de form.

#### M5-C — Forum site read pages (`31b5b99`)
- Adăugat `/forum` index cu 9 categorii (6 user + 3 system în secțiune separată).
- Adăugat `/forum/:category` listă thread-uri cu pinned-first + paginație 25/page.
- Adăugat `/forum/:category/:slug` thread page cu 2-level threading conform spec §8.4 (numbering `#N` / `#N.M`, expand/collapse strip, master controls, sub-reply indent 16-20px mobile / 32-48px desktop).
- Action buttons (Răspunde, Util · N) vizibile, redirect către `/login` pentru anonim, toast „Disponibil curând" pentru utilizatori autentificați (M5-D va livra funcționalitatea).
- System threads (Discuții articole, Discuții echipamente) — render normal + link contextual către articol/echipament. Backend `findBySlug` extins cu `sourceLink` (1 query în loc de 2 round-trip-uri).
- i18n: bloc `forum.*` complet în română.

#### M5-B — Forum backend (`eb57245`)
- 3 services (Categories / Threads / Posts) + 3 controllers (Public / Auth / Mod).
- CRUD complet pentru thread-uri și postări, cu pin/lock/hide/delete moderation tools.
- Numbering atomic `topLevelSeq` / `subSeq` și algoritm reply chain walk.
- First-post approval queue cu thresholds configurabile.

#### M5-A — Forum schema (`dcf95d0`)
- Tabele: `forum_posts`, `forum_post_likes`, `forum_post_mentions`, `forum_thread_subscriptions`, `user_gear_subscriptions`, `forum_category_subscriptions`, `forum_badges`, `forum_user_badges`.
- Seed cu 9 categorii (6 user + 3 system).

### Revista (M4)

- **M4-F** (`49b520a`) — category follow + publish fan-out (notification trigger §7.5).
- **M4-E** (`553821b`) — dashboard moderare articole + grant roluri (editor / curator / moderator).
- **M4-D** (`bca979e`) — inline composer pe `/revista/nou` + `/revista/:slug/editare` cu Tiptap rich-text.
- **M4-C** (`952d49c`) — site `/revista` list + detail + `/autor/:username` profile.
- **M4-B** (`69fb01b`) — backend ArticleModule (editor CRUD + publish auto-thread + image pipeline + admin moderation).
- **M4-A** (`c04660e`) — schema articole + article_gear + article_images + minimal forum_categories/threads.

### Cross-cutting (M3.5)

- **spec** (`3045a87`) — forum categories locked v0.3 + 2-level hybrid threading.
- **roles** (`8603848`) — 8-role system, multi-valued via `user_roles`, superadmin gate pentru admin promotion.

### Bazar (M3)

- **M3-EWS** (`f728db7`) — Socket.io client (live notifications + live chat).
- **M3-E6** (`ea35e0f`) — dashboard Bazar moderation.
- **M3-E5c** (`6444894`) — notification bell + drop-down panel în topbar.
- **M3-E5b** (`8b6ca82`) — saved-searches manager + „save current filters" CTA.
- **M3-E5a** (`bb4bc91`) — my-listings + my-watches dashboards.
- **M3-E4c** (`2dc0567`) — bilateral transaction confirm + review submission.
- **M3-E4b** (`33d70e0`) — structured offers cu 5-round cap.
- **M3-E4a** (`20b54ae`) — site inbox + chat thread.
- **M3-E3** (`4e5c205`) — site `/bazar/nou` + `/bazar/:slug/editare` form.
- **M3-E2** (`6b136e9`) — site `/bazar/:slug` detail page.
- **M3-E1** (`af36af9`) — site `/bazar` list page.
- **M3-C+D** (`a0f7b0e`) — saved-search/watch/expiry crons + realtime chat/offers/transactions/reviews.
- **M3-B** (`c872825`) — SzEditor în `libs/ui` + listings backend CRUD + photos + quick-list.
- **M3-A** (`9d4465b`) — schema: listings/photos/threads/messages/transactions/reviews/notifications.

### Tezaur (M2)

- **M2-C3** (`f1952b2`) — dashboard `/tezaur` admin.
- **M2-C2** (`d6f6d21`) — site `/tezaur/:slug` detail page (6 URL-routed tabs).
- **M2-C1** (`56a16fe`) — site `/tezaur` list page.
- **M2-B** (`ed91d90`) — design infra: tokens + 7 atomic components + PrimeNG preset + topbar.
- **M2-A** (`dcdecc2`) — backend: schema + FT search + image pipeline + CRUD + 109 seed entries.

### Auth (M1)

- **M1-frontend** (`83851c0`) — site auth pages + dashboard login + first-admin seed.
- **M1-backend** (`6099aef`) — schema + cookie-JWT endpoints.

### Scaffold (M0)

- **Design import** (`d4c9cbf`) — Claude Design v01 import.
- **Monorepo skeleton** (`e4de783`) — Nx workspace cu apps `site` / `dashboard` / `api` / `worker` + libs `db` / `ui` / `auth` / `shared`.
