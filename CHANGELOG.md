# Changelog

User-facing log al feature-urilor livrate, organizat pe milestones (M0–M6).
Pentru hand-off între sesiuni de dev → `docs/STATUS.md`.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versionare pe milestone până la public launch (M6).

## [Unreleased]

### Forum (M5)

#### M5-F — Badges (HEAD)
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
