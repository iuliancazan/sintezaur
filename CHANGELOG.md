# Changelog

User-facing log al feature-urilor livrate, organizat pe milestones (M0–M6).
Pentru hand-off între sesiuni de dev → `docs/STATUS.md`.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versionare pe milestone până la public launch (M6).

## [Unreleased]

### M6 — Polish + Soft-launch prep + MVP foundation closure

#### M6-E2 — Block & report UI cablat pe Bazar + Profil (`PENDING`)

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
