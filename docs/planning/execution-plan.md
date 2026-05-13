# Sintezaur — Execution Plan

**Version:** 0.2
**Date:** 2026-05-13
**Status:** Active — phase = M0 not yet started. Updated to reflect spec v0.2 feature additions (personal collection, saved searches, structured offers, swap/trade, gear relationships, subscription levels, likes, badges, faceted search). Effort estimates revised upward accordingly.
**Companion docs:**
- `docs/spec/spec.md` — what we're building
- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/knowledge-base/_projects/personal/mudee/infrastructure/*` — deployment reference (Sintezaur copies Mudee patterns 1:1)

---

## How to read this plan

Each milestone is **self-contained**: clear goal, concrete deliverables, backend/frontend work split, mobile-first checklist, verification gates, blockers, effort estimate.

Milestones are **sequenced**; within a milestone, backend and frontend work **parallelize**. Frontend gates on Iulian's design imports; backend moves ahead independently.

Effort estimates are in **engineering-days** (focused work blocks), not calendar days. With Claude Code assistance and Iulian's parallel design work, calendar throughput is 2–4× faster than solo.

---

## Non-negotiable principles (apply across all milestones)

1. **Mobile first**, always. No "desktop done first, mobile retrofitted". Design tokens, layouts, interactions all start at mobile breakpoint and scale up.
2. **Code 100% English.** All UI strings in `ro.json` via i18n from day 1. No hardcoded Romanian in `.ts` or `.html` source.
3. **Mudee infrastructure pattern, copied.** Same Hetzner VPS, same Coolify project model, same Postgres template, same Dockerfile structure (with `pnpm migrate &&` in API CMD), same env conventions, same cross-subdomain cookies.
4. **Spec-driven.** No work outside `docs/spec/spec.md`. New ideas go to spec §13 (Open Questions), get resolved, then enter execution.
5. **Tezaur is the spine.** Every feature touching content respects the gear-FK relationship (with free-text fallback only in Bazar, per spec §8.2).
6. **Ship visibly.** Even before posting unlocks, Forum is anonymously readable from M0+seeds. Bazar/Revista visible early. SEO sitemap complete from soft-launch.

---

## Tech Stack Quick Reference

**Authoritative version list:** [`docs/devops/tech-stack.md`](../devops/tech-stack.md) — read this before running any `pnpm add`. Mirrors `musical-deeds/package.json`. Versions are locked; do not improvise.

**Top-level versions (summary):**

- Node ≥22.12 · pnpm ≥10.0 (pinned `10.33.2` via `packageManager`)
- Nx 22.7 · TypeScript 5.9
- Angular 21.2 (incl. Analog SSR for the `site` app)
- NestJS 11
- PostgreSQL 17 + Drizzle ORM 0.36 + drizzle-kit 0.30
- PrimeNG 21 + @primeuix/themes + PrimeFlex + PrimeIcons
- Tiptap 3.22 (+ extensions added per milestone: image, youtube, oembed custom node, paste-handler, optional code-block-lowlight)
- pg-boss 10 (background jobs — Postgres-native, no Redis)
- Passport JWT + bcryptjs + passport-google-oauth20 (latter installed but UI not wired in MVP)
- Nodemailer 8 (Brevo SMTP)
- Sharp 0.33 + Multer 2 (images, with EXIF strip)
- Pino 9 (structured logging)
- Vitest 4 + Jest 30 + Playwright 1.36 (testing)
- Helmet 8 · @nestjs/throttler 6 (security/rate-limit)

**Explicit exclusions** (deliberate — see `docs/devops/tech-stack.md` for rationale): Redis, Meilisearch/Typesense/Elasticsearch, AWS S3 SDK, Stripe SDK, BullMQ, any captcha library.

**Adding a new dep:** update `docs/devops/tech-stack.md` FIRST → THEN `pnpm add <pkg>@<version>`. Never the other way around. If a Mudee version drifts ahead of ours, decide intentionally whether to bump.

---

## Milestone map

| # | Name | Goal in one line | Depends on | Effort (eng-days) | Design needed? |
|---|------|------------------|------------|-------------------|----------------|
| **M0** | Project Scaffolding | Empty Nx workspace deployed to staging, "Hello world" on 4 apps | — | 2–3 | No |
| **M1** | Auth & User Foundation | Email signup/login/reset, role system, JWT cookies cross-subdomain | M0 | 3–4 | Auth pages only |
| **M2** | Tezaur Foundation | Gear schema + admin CRUD + public browse + search + 50–100 seed entries + personal collection + gear relationships + i18n descriptions | M1 | 7–9 | Tezaur browse + detail (priority) |
| **M3** | Bazar (Phase 1) | Listings (with swap/trade + delivery + accepts_offers), in-app messaging, **saved searches**, **watching**, **structured offers**, **quick-list from Tezaur**, recently-sold sidebar, condition guide, transactions, bilateral reviews | M2 | 15–21 | Listing + chat UI + bottom sheets |
| **M4** | Revista (Phase 2) | Article CRUD with Tiptap (+ paste-handler + lazy-load), editor role, auto-forum-thread, author profiles | M3 (or in parallel with M5 schema-stub) | 5–7 | Article reader + editor |
| **M5** | Forum (Phase 3) | Categories, Discourse-hybrid threading, replies, **subscription levels**, **likes**, **badges**, **pinned threads**, **faceted search**, moderation | M4 | 8–11 | Forum browse + post |
| **M6** | Launch Prep | SEO, sitemap, schema.org, backups, error tracking, mobile polish | M5 | 3–5 | Final polish pass |

**Total:** ~43–60 engineering-days for MVP (up from 33–47 in v0.1 — spec v0.2 added ~10–13 days). Calendar estimate with parallel design work: **3.5–5.5 months**.

---

## M0 — Project Scaffolding

### Goal
Empty Nx monorepo identical in shape to Mudee, deployable on Hetzner + Coolify. All four apps return "Hello world" via their assigned subdomain. Zero business logic.

### Deliverables
- [ ] Nx workspace at `sintezaur-ro/` with apps: `api`, `worker`, `site`, `dashboard` + `*-e2e` siblings
- [ ] Libs: `auth`, `db`, `shared`, `ui` (empty skeletons, exports stubbed)
- [ ] `tsconfig.base.json` paths: `@sintezaur/auth`, `@sintezaur/db`, `@sintezaur/shared`, `@sintezaur/ui`
- [ ] `package.json` deps copied 1:1 from Mudee — **authoritative version list in `docs/devops/tech-stack.md`** (read that file before running `pnpm add`; do not improvise versions). Includes the `passport-google-oauth20` dep (installed but UI not wired in MVP).
- [ ] `drizzle.config.ts` configured against `libs/db/src/lib/schema/index.ts`
- [ ] `.env.example` derived from Mudee's, Sintezaur-renamed
- [ ] Dockerfile per app (api/site/dashboard) — same multi-stage pattern as Mudee, with `pnpm migrate &&` in API CMD
- [ ] `nginx.conf` for site/dashboard (SPA fallback + `/healthz`)
- [ ] `tools/scripts/migrate.ts` — orchestrator (preflight → drizzle → postflight)
- [ ] `tools/scripts/create-first-admin.ts`
- [ ] `tools/scripts/seed-dev.ts` (no-op stub)
- [ ] Git repo initialized, `.gitignore`, `README.md`
- [ ] First admin's GitHub repo connected to Coolify
- [ ] Coolify resources: `sintezaur-api`, `sintezaur-site`, `sintezaur-dashboard`, `sintezaur-postgres`
- [ ] DNS in Cloudflare: `sintezaur.ro`, `api.sintezaur.ro`, `admin.sintezaur.ro` → VPS IP
- [ ] DKIM/SPF/DMARC records on `sintezaur.ro` (early, so Brevo deliverability is clean by M1)
- [ ] Brevo account: domain authenticated, sender `noreply@sintezaur.ro` configured
- [ ] First deploy: all healthchecks green on Coolify dashboard

### Backend work
- Nx workspace generation (either fresh `create-nx-workspace` or copy + rename from Mudee)
- NestJS `api`: bootstrap with cookie-parser, helmet, throttler, CORS-from-env, Pino, validation pipe — Mudee shape exactly
- NestJS `worker`: bootstrap with pg-boss, no jobs yet
- Health controller: `GET /api/health` returns `{ status, timestamp }` — **NO DB check** (Mudee lesson: avoid DB-coupled health for Coolify restart loops)
- Drizzle config + empty `schema/index.ts`
- Migration orchestrator that runs preflight → drizzle → postflight in order
- `.env.example` complete (DATABASE_URL, JWT secrets, COOKIE_*, SMTP_*, FIRST_ADMIN_*, etc.)

### Frontend work
- Angular `site` (Analog SSR): root component renders "Hello Sintezaur"
- Angular `dashboard`: root component renders "Hello Admin"
- PrimeNG + `@primeuix/themes` installed in both (theme stub `lara-dark` or similar default for now)
- Routing skeleton (`/` only)
- `environment.ts` + `environment.prod.ts` + `fileReplacements` in both project.json files
- `nginx.conf` per app: SPA fallback + `/healthz` 200 response

### Mobile-first checklist
- `<meta name="viewport" content="width=device-width, initial-scale=1">` set in both Angular apps
- PrimeFlex grid utilities loaded
- Base CSS reset enforces minimum touch target (44×44px) for buttons/links
- Test rendering on iPhone Safari + Chrome DevTools mobile emulation before marking done

### Verification gates
- `pnpm lint && pnpm typecheck && pnpm build` clean for all 4 apps
- Local: `pnpm api`, `pnpm worker`, `pnpm site`, `pnpm dashboard` each start cleanly
- Coolify deploy succeeds; all healthchecks green
- `https://sintezaur.ro` → "Hello Sintezaur" via HTTPS
- `https://api.sintezaur.ro/api/health` → JSON ok
- `https://admin.sintezaur.ro` → "Hello Admin"

### Blockers / open questions
- None known. M0 is pure plumbing — lifts from Mudee.

### Estimated effort
**2–3 eng-days.** Lift-from-Mudee makes this fast.

---

## M1 — Auth & User Foundation

### Goal
Users can sign up, verify email, log in, reset password. Role system seeded. JWT cookies work cross-subdomain (api ↔ site ↔ dashboard). First admin seeded. Email flows live via Brevo.

### Deliverables
- [ ] Schema: `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens` (4 tables)
- [ ] First migration generated + applied (preflight enables `pgcrypto` if needed)
- [ ] `libs/auth/` with shared types + guards
- [ ] API endpoints: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`, `POST /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/change-password`, `POST /api/auth/change-email`
- [ ] Brevo SMTP wired (signup verification email, password reset email — RO templates in i18n)
- [ ] JWT decorator `@RolesAllowed(...)` + guard
- [ ] Cookie config: `HttpOnly`, `SameSite=None`, `Secure=true` (prod), `Domain=.sintezaur.ro` (prod)
- [ ] First admin seed script + Coolify pre-deployment / manual invocation
- [ ] Site: signup, login, forgot-password, reset-password, verify-email pages (basic forms, PrimeNG defaults — final design lands later)
- [ ] Site: protected route guard pattern (redirects to login)
- [ ] Dashboard: same login flow + admin role check
- [ ] Throttler limits on auth endpoints (Mudee values: 5/min signup, 10/min login, 3/min forgot-password)

### Backend work
- Auth schema in Drizzle + indexes (uniqueness on email, slug)
- `AuthModule` with: `AuthService`, `AuthController`, `JwtStrategy`, `LocalStrategy`, `EmailService` (Nodemailer wrapper)
- Email templates (TypeScript template literal helpers, RO copy)
- Hash with bcryptjs (cost 12 prod, 10 dev — from env)
- Refresh token rotation on `/refresh` (issue new refresh, invalidate old)
- Tests: unit on `AuthService`, integration on critical endpoints

### Frontend work
- Auth feature modules in `site` and `dashboard`
- Reactive forms with `class-validator`-aligned validation
- HTTP interceptor: cookie-based auth + 401 → call `/refresh` → retry once
- `AuthService` Angular service (DI)
- Logged-in user state via Angular signals

### Mobile-first checklist
- Email/password inputs use proper `type="email"` / `type="password"` for mobile keyboards
- `autocomplete="email"`, `autocomplete="current-password"`, `autocomplete="new-password"` set
- Submit buttons full-width on mobile, ≥48px height
- Test on real mobile: keyboard doesn't cover submit; focus moves logically; viewport doesn't zoom on input focus (`font-size: 16px` minimum)
- Error states readable; success states obvious

### Verification gates
- Sign up new user → receives verification email (Brevo dashboard confirms) → click link → status flips to verified
- Log in as verified user → cookie set on `.sintezaur.ro` → `/api/auth/me` returns user
- Log in on `admin.sintezaur.ro` → same session works (cross-subdomain cookie)
- Forgot password → email arrives → reset → can log in with new password
- First admin seeded → can log into dashboard
- Lighthouse mobile on auth pages: performance ≥ 80, accessibility ≥ 90

### Blockers / open questions
- **Decision needed:** Enable Google OAuth from M1 or defer?
  - Mudee includes `passport-google-oauth20` — if we want parity, include from start.
  - **Recommendation:** include the dependency (avoid package-version drift later), but DON'T wire UI in MVP. Add to roadmap.

### Estimated effort
**3–4 eng-days.**

---

## M2 — Tezaur Foundation

### Goal
The gear encyclopedia exists as a real product. Admin creates/edits gear via dashboard. Public site has browse + detail pages with all 10 "killer page" sections (per spec §5). 50–100 seed entries cover the most popular synths in the RO scene. Search works.

### Deliverables
- [ ] Schema: `gear`, `gear_family`, `gear_image`, `gear_video`, `gear_link`, `gear_review`, **`gear_relationship`**, **`gear_description`** (8 tables)
- [ ] Schema (foundation shared with later milestones): **`user_gear_status`** (personal collection), **`user_listing_watch`** (referenced by Bazar in M3, but table created here), **`saved_search`** (same), **`user_badge`** (populated by Forum in M5)
- [ ] v0.3 cross-cutting schema (all tables created in foundation, populated by later milestones): **`user_block`**, **`user_email_history`**, **`content_report`** (polymorphic, replaces v0.2 `forum_report`), **`audit_log`**, **`slug_redirect`**, **`currency_rate`** (seeded with EUR→RON manual entry), **`listing_price_history`**
- [ ] v0.3 column additions on existing tables: `user.{phone_e164, phone_verified_at, id_verified_at, trust_level, display_currency, subscription_tier, deleted_at}`, `gear.{latest_firmware_version, firmware_notes_url, canonical_thread_id, deleted_at}`, `forum_thread.{locked_at, deleted_at, canonical_for_gear_id}`, `forum_post.{hidden_at, hidden_reason, hidden_by_user_id}`, `gear_review.{hidden_at, hidden_reason}`, `transaction_review.{hidden_at, hidden_reason}`, `notification.dedup_key`
- [ ] Soft delete pattern wired per spec §7.11 (Drizzle query helpers filter `deleted_at` / `hidden_at` consistently — no hand-written `WHERE` filters in business code)
- [ ] Slug helpers + slug_redirect router middleware per spec §7.13 (kebab-case + RO diacritic transliteration + 30-day 301 redirects)
- [ ] Currency conventions per spec §7.12 (all money columns `numeric(12, 2)`, currency stored alongside)
- [ ] Audit log service + dashboard viewer (action enum extensible)
- [ ] Categories enum + JSONB `specs` per gear (per-category shape locked in spec §8.1 Taxonomy — 18 categories, type sub-enums for 6 of them, full JSONB shapes for synth + eurorack_module, minimal for others)
- [ ] Admin endpoints: CRUD on gear, family, images, links, videos, **relationships**, **descriptions** (per locale)
- [ ] Public endpoints: `GET /api/tezaur` (list, paginated + filtered), `GET /api/tezaur/:slug` (detail, includes lineage + "X own this" badge)
- [ ] Personal collection endpoints: `POST/DELETE /api/me/gear-status` (set/unset owned/wishlist/wanted/used_to_own/loaned_out)
- [ ] Image upload pipeline: Multer + Sharp → variants (thumb 200px, medium 600px, large 1200px, original) → stored under `storage/uploads/gear/{gear-id}/`; **EXIF strip mandatory**
- [ ] Postgres FT search on gear (tsvector + GIN, `romanian` dict, `pg_trgm` typo tolerance — preflight migration)
- [ ] Seed script: `tools/scripts/seed-tezaur.ts` reading JSON file with 50–100 entries
- [ ] Dashboard: gear list, gear edit form (Tiptap for description, image uploader, family + tags + relationships editor)
- [ ] Site: `/tezaur/` list (filterable, paginated) + `/tezaur/:slug` detail
- [ ] Detail page renders all 11 sections (incl. lineage sidebar + "X own this" badge), with empty states for sections that depend on later milestones (active listings = "M3", forum threads = "M5", articles = "M4")
- [ ] Public profile: "Colecția mea" tab on user profile (owned/wishlist/etc. listed; public/private toggle)
- [ ] Aggregations: average user-review rating computed per gear, cached on the row; "X persoane dețin" count from `user_gear_status`

### Backend work
- 6 schema tables + indexes (FT GIN, FK indexes, family lookup)
- `TezaurModule` — admin and public controllers separated
- Image processing service: Sharp pipeline, variant generation, abstract storage interface (local filesystem now, swappable to Hetzner Storage Box later)
- Search service with `romanian` text search config + `pg_trgm` similarity threshold
- Gear review CRUD endpoints (any logged-in user can review any gear, no transaction needed — per spec §7.4)
- Sections aggregator endpoint: takes gear slug → returns gear + related (listings empty until M3; threads empty until M5; articles empty until M4)

### Frontend work
- Dashboard: `GearListPage`, `GearEditPage`, `GearFamilyEditPage`
- Tiptap config (shared `EditorComponent` in `libs/ui/`) — first instance, will be reused in M4 + M5
- Image uploader component (drag-drop, preview, variant preview)
- Site: `TezaurListPage` — mobile: card grid 1col xs / 2col sm / 3col md / 4col lg
- Site: `TezaurDetailPage` — mobile: stack vertically; desktop: 2-col with sidebar
- Search bar with debounced autocomplete (300ms)

### Mobile-first checklist
- Tezaur list: filters as **bottom sheet** (PrimeNG Drawer from bottom), NOT desktop sidebar
- Detail page: gallery uses swipe (PrimeNG Galleria with touch support)
- Specs table: scroll horizontally on narrow screens (no layout break)
- Sticky "Buy from X" CTA on detail page (bottom on mobile)
- Image variants serve correct `srcset` (mobile gets 600px medium, not 1200px large)

### Verification gates
- Admin creates a gear entry with 5 photos → public detail page renders correctly
- 50 entries seeded → list paginates
- Search "minilogue" returns Korg Minilogue XD
- Performance: detail page LCP < 2.5s on simulated Slow 4G
- Mobile QA: gallery swipe on iPhone Safari; specs table scrolls; CTA reachable

### Blockers / open questions
- **✅ RESOLVED:** Tezaur taxonomy (spec §8.1 Taxonomy). 18 categories locked; per-category `type` enums defined; synth + eurorack JSONB shapes defined; other categories deferred to `description` free-text in MVP.
- **🟡 Question:** Initial 50–100 entries — does Iulian have a list, or research-derived?

### Estimated effort
**7–9 eng-days** (after taxonomy resolved). +2 days vs. v0.1 for personal-collection schema/UI, typed gear relationships, and language-aware descriptions table.

---

## M3 — Bazar (Phase 1)

### Goal
Sintezaur's first transactional feature ships. Users can list gear (with Tezaur FK or free-text fallback). Buyers message sellers in-app via WebSocket. Both confirm transaction. Both leave reviews. Ratings aggregate on profiles.

### Deliverables
- [ ] Schema: `listing`, `listing_photo`, `message`, `transaction`, `transaction_review` (5 tables) — with v0.2 listing fields: `kind` (sell/trade/sell_or_trade), `looking_for`, `delivery`, `shipping_cost`, `shipping_carriers[]`, `accepts_offers`
- [ ] Schema: extend `message` with `kind` enum (text / offer / counter_offer / offer_accepted / offer_rejected / transaction_confirmed) + `offer_amount`, `offer_currency`, `offer_expires_at` columns
- [ ] Listing CRUD endpoints (own listings only for write; public for read)
- [ ] **Quick-list from Tezaur** endpoint + UI button on `/tezaur/:slug` — pre-fills form with `gear_id` + suggested title + price suggestion from `AVG(sold listings)`
- [ ] **Saved searches**: `saved_search` table populated, CRUD endpoints, evaluator on listing INSERT/UPDATE, notification trigger, configurable cap (`SAVED_SEARCH_MAX_PER_USER=50` env var, error on exceed)
- [ ] **Watching listings (hearts)**: `user_listing_watch` table populated, heart button on listing cards + detail, "Listinguri salvate" tab on profile, notifications for price-drop / status-change / about-to-expire
- [ ] **Structured offers in chat**: state machine, counter-offer chain capped at 5 rounds, expiry default 7 days, accept/reject/counter UI, offer-card styling in chat
- [ ] **Swap/trade**: `kind` filter on Bazar list page, `looking_for` free-text on listing form (when `kind != sell`), "Doar oferte de schimb" filter
- [ ] **Delivery field UI**: `pickup_only` / `shipping_only` / `both` selector + `shipping_carriers[]` multi-select for RO carriers (Sameday, Cargus, FAN Courier, DPD, GLS, Posta Romana)
- [ ] **Recently-sold sidebar** on listing detail: last 5–10 sales of the same `gear_id` + 90-day avg + condition breakdown
- [ ] **Condition guide modal**: editorial content with photos per condition tier, `mint` requires ≥50-char justification
- [ ] **Photo gallery patterns**: hero (first photo), drag-and-drop reorder in form, PrimeNG Galleria lightbox with swipe+zoom, EXIF strip on upload
- [ ] Listing search/filter API: by gear, condition, price range, location, status, **kind**, **delivery**
- [ ] In-app messaging: Socket.io gateway via `@nestjs/websockets`; message persistence in Postgres; conversation list with unread badge + listing thumbnail; image attachments
- [ ] Postgres LISTEN/NOTIFY bridge for cross-process WS broadcast (no Redis per spec §10)
- [ ] "Confirm transaction" flow: both parties click → flips `status=sold` → unlocks review window (30 days). Renders as `transaction_confirmed` system message.
- [ ] Transaction review submission: rating + body + optional photos; aggregate score per user
- [ ] User profile page: aggregate rating, transaction count, member-since, listings tab, "Listinguri salvate" tab
- [ ] **Bazar-specific notification triggers wired**: new message, new offer/counter-offer, offer accepted/rejected, price drop on watched, listing matches saved search, listing about to expire (3 days, 1 day), transaction confirmed by other, review submitted
- [ ] **Listing expiry & refresh**: pg-boss daily cron flips `status='expired'` past `expires_at`; seller can refresh max 1/30 days (free); refresh resets `created_at`, `expires_at`, sets `refreshed_at`
- [ ] **Price change logging**: every `listing.price` UPDATE writes to `listing_price_history` via Drizzle service helper; price-drop notification trigger reads from this table
- [ ] **User blocking wired on Bazar**: `user_block` populated via block button on listing chat / profile / message; filters applied in listing list, message send, chat thread visibility
- [ ] **Generic content reports wired on Bazar**: report button on listing detail + message context menu + gear review; reports flow into unified `content_report` queue with `target_type` correctly set
- [ ] Dashboard: admin can hide/remove listings + ban users
- [ ] Site: `/bazar/` list page, filters, listing detail, in-app chat, my-listings, my-messages inbox, saved-searches manager
- [ ] Optional contact toggle: per-user-global "Show my phone publicly" + per-listing override

### Backend work
- 5 schema tables + indexes (composite indexes on `gear_id + status + price`, etc.)
- `BazarModule` — `ListingService`, `MessageService`, `TransactionService`, `ReviewService`
- WebSocket gateway with cookie-based auth guard
- Notification service (called from message/transaction/review events; persists `notification` rows + pushes via WS if user connected + queues email via pg-boss if offline)
- Image pipeline reused from M2 (Sharp variants for listing photos)
- Free-text fallback: if `gear_id` null, accept `raw_make`, `raw_model`, `raw_year` (later input to AI consolidation pipeline — spec §8.2 + roadmap)

### Frontend work
- Site: Bazar feature module
- `ListingListPage` with filters (bottom sheet on mobile)
- `ListingDetailPage` with gallery, seller card, "Send message" CTA → opens chat thread
- Chat UI: per-listing thread; WebSocket connection; mobile keyboard-aware
- "Confirm transaction" button in chat (both sides see current status); modal explainer first time
- Review submission UI: star rating + body + optional photo upload
- User profile page: tabs (listings, reviews received, reviews given)
- New listing form: select gear from Tezaur (autocomplete on slug) OR free-text fallback; photo uploader; condition picker; price + currency; location selector (RO cities autocomplete)

### Mobile-first checklist
- **Chat as bottom sheet pattern.** Chat opens as modal sliding up; full-height on mobile; explicit close button.
- Listing detail: photo gallery with swipe; sticky "Send message" CTA at bottom of viewport.
- Listing creation: multi-step on mobile (one section per screen); progress indicator.
- Filter bottom sheet: native-feeling, with snap points.
- Inbox: full-width cards on mobile; virtualized for performance.
- Notification dots: ≥44px tappable area surrounding them.

### Verification gates
- User A lists a Minilogue XD; user B messages them
- Real-time: open chat in two browsers → typing reflects within 1s (no polling fallback)
- Both click "Confirm transaction" → status flips; review window unlocks
- Both submit reviews → aggregate ratings update on profiles
- Edit/delete only allowed for own listings (auth integration tests)
- Mobile QA: chat works in mobile Safari (focus management, keyboard); filters work as bottom sheet; listing creation completable on iPhone

### Blockers / open questions
- Free-text fallback UX needs design pass ("I can't find my gear" flow)
- Disputes/mediation flow: post-MVP per spec §13. **Minimum for MVP: admin "remove listing" + "ban user" tools.** Anything more elaborate is out of scope.

### Estimated effort
**15–21 eng-days.** Biggest milestone by far; +5–7 days vs. v0.1 for saved searches, watching, structured offers, swap/trade, recently-sold sidebar, condition guide, photo patterns, and Bazar-specific notification triggers. Chat + WS + transaction flow + offer state machine is intricate; allocate time.

---

## M4 — Revista (Phase 2)

### Goal
Editorial team publishes articles in any of 6 pillars. Each published article auto-creates a Forum thread (visible even before posting unlocks in M5; replies start filling in M5). Articles link to Tezaur entries via M2M. Authors have public profile pages. Comments on articles render the forum thread inline.

### Deliverables
- [ ] Schema: `article`, `article_gear` (M2M), `forum_thread` (introduced minimal here; expanded in M5)
- [ ] Tiptap extensions installed: `@tiptap/extension-image` (Sharp upload), `@tiptap/extension-youtube`, custom oEmbed node (SoundCloud, Bandcamp, Spotify), **paste-handler** for auto-unfurl, **lazy-load** wrapper for embeds (thumbnail + play button)
- [ ] Article CRUD endpoints + publish action creates forum thread + status transitions (`draft` → `published` → `archived`)
- [ ] Public list endpoint (filterable by pillar/category, paginated)
- [ ] Public detail page renders Tiptap JSON → HTML on SSR, hydrates client-side
- [ ] Author profile page `/autor/:slug` with bio + all published articles
- [ ] Article-page comments section = renders forum thread inline (read-only before M5; placeholder "Forum-ul deschide curând" if no replies yet)
- [ ] Editor role assignment in dashboard (admin can grant/revoke)
- [ ] Article preview in dashboard before publishing
- [ ] Internal linking helper in Tiptap: `/gear` slash command → searches Tezaur → inserts link to Tezaur entry

### Backend work
- Article schema + indexes (slug unique, FT on title + body, FK on author + on threading)
- `ArticleModule` with role-gated endpoints (`@RolesAllowed(EDITOR, ADMIN)` for write)
- Minimal `ForumThread` schema (full forum schema lands in M5; here we just need thread + minimal endpoints `create-thread`, `get-thread-with-replies` — replies always empty until M5)
- Tiptap content renderer: server-side render to HTML for SSR + initial page load
- Image upload pipeline reused from M2/M3
- oEmbed proxy endpoint (avoid CORS for SoundCloud/Bandcamp embeds)

### Frontend work
- Dashboard: `ArticleListPage`, `ArticleEditPage` (Tiptap with all extensions), `ArticleCreatePage`
- Site: `RevistaListPage`, `RevistaDetailPage`, `AuthorProfilePage`
- Shared `TiptapEditorComponent` used in dashboard (Revista articles) AND prepared for Forum (M5)
- Reading view: long-form mobile typography (generous line-height, large paragraphs)

### Mobile-first checklist
- Article body: max-width readable on desktop (~650px); full-width on mobile with 16–20px side padding
- Inline embeds (YouTube/SoundCloud) responsive via aspect-ratio wrapper
- Reading progress indicator (top of viewport)
- "Back to top" floating button on long articles
- Author profile: avatar 96px on mobile, article cards stacked

### Verification gates
- Editor logs in → drafts article → previews → publishes → forum thread auto-created
- Public article URL renders SSR (View Source contains body text — critical for SEO)
- Article links to a Tezaur gear → click → Tezaur detail shows article in "Articles" section
- Lighthouse SEO score on article detail ≥ 95
- Mobile QA: reading flow comfortable; embeds resize correctly; sticky elements don't obstruct content

### Blockers / open questions
- Article taxonomy/tag system: free-tags only or curated tag list? (spec §13)

### Estimated effort
**5–7 eng-days.**

---

## M5 — Forum (Phase 3)

### Goal
Forum opens for posting. Users post threads, reply, subscribe, get notifications. Moderators moderate. Article-comments-as-forum-threads (from M4) work end-to-end. Threading: **Discourse hybrid** per research recommendation (linear chronological + "în răspuns la" jump-link), NOT 3-level Facebook.

### Deliverables
- [ ] Schema: complete `forum_category`, `forum_thread` (extend M4 minimal — add `pinned_at`), `forum_post` (with `parent_post_id` for reply-jump), `forum_subscription` (with `level` enum), `forum_report`, **`forum_post_like`** (6 tables)
- [ ] Threading model: each post has nullable `parent_post_id` (FK self) → "în răspuns la" jump-link header, **no visual nesting / no indentation / no depth limit**
- [ ] Categories seeded (per spec §8.4): Sintetizatoare, Drum Machines & Sampleri, Effects & Procesoare, Controllers & MIDI, DAWs & Software, Tehnici de producție, Scena RO, Discuții articole (auto-populated by Revista), Anunțuri (admin-only)
- [ ] Thread creation, post replies, edit window (30 min, configurable via env)
- [ ] **Subscription levels**: 4 levels (Watching / Tracking / Mentioned only / Muted), applicable to threads AND categories. Auto-Watching on reply. Subscription preferences matrix in user settings.
- [ ] **Likes** (`forum_post_like`): single "Util" reaction per post per user, count visible, **no ranking effect** on post order
- [ ] **Badges** (`user_badge`): cron job computes objective milestones nightly, populates badges. Categories: membership / activity / content / collection / trade / trust. Visible on profile only, never next to each post.
- [ ] **Pinned threads**: moderator+ can pin up to 3 threads per category (`forum_thread.pinned_at`); pinned shown above all in list view
- [ ] **Faceted search**: filters by category, author, tag, gear tag, date range, has-replies, sort by relevance/newest/most-replies. Result snippets with `<mark>` highlight on matched terms.
- [ ] Notifications: new reply per subscription level, `@mention`, reply to your post, badge earned
- [ ] Moderation tools: lock thread, hide post, temp-ban (configurable duration), permanent ban (admin only), pin thread
- [ ] Report-post flow (user reports → mod queue)
- [ ] Forum search (Postgres FT on posts + thread titles, with faceted filters above)
- [ ] Tiptap editor for posts (shared with Revista — same paste-handler + lazy-load + image upload + max 3 embeds per post)
- [ ] Mentions (`@username` autocomplete via `/api/users/autocomplete?q=`)
- [ ] Anti-spam: **honeypot + time-on-form + rate limits + first-post approval queue** (NO reCAPTCHA)
- [ ] **User blocking applies in Forum**: blocked-user posts replaced with `[Postare ascunsă — utilizator blocat]` placeholder + "Show anyway" toggle; reply prevented if thread author blocked you
- [ ] **Optional canonical gear thread** toggle in Tezaur admin: when editor flips ON for a gear, auto-create a thread in "Discuții echipamente" subcategory with title "Discuții generale despre [Brand Model]"; set `gear.canonical_thread_id` and `forum_thread.canonical_for_gear_id`. Flipping OFF unlinks but doesn't delete.
- [ ] **Generic content reports** queue (extends from M3): forum posts + threads also reportable; unified mod queue UI

### Backend work
- Schema extension (4 new tables + existing thread extension, 1 enum extension)
- `ForumModule` with thread/post/subscription/moderation services
- Mention parser (regex `@[a-z0-9_-]+` → resolve to user IDs → notify)
- Anti-spam: honeypot field validation + time-on-form check + first-post review queue (auto-approve after first post)
- **Defer to post-MVP:** Reply-via-email (research's "sleeper feature"). Complexity > MVP value; revisit when forum traffic justifies inbox-bound users.

### Frontend work
- Site: Forum feature module
- `ForumCategoryListPage`, `ForumThreadListPage`, `ForumThreadDetailPage`, `ForumNewThreadPage`
- `TiptapEditorComponent` reused (same as Revista — shared in `libs/ui/`)
- Mention autocomplete UI
- "În răspuns la X" jump (collapsible quote preview of parent post, click to scroll)
- Subscription toggle (heart/bell, optimistic update)
- Mobile chat-style scroll: load more on scroll-up; sticky reply box at bottom

### Mobile-first checklist
- Thread detail: posts as cards full-width; avatar 40px; relative timestamps ("acum 2 ore")
- Reply box: sticky bottom on mobile; expandable height; embed picker as bottom sheet
- Quote preview when replying: collapses with "tap to expand"
- Subscription toggle: ≥44px touch target with obvious active/inactive states
- Long threads: "Sari la primul post necitit" CTA at top

### Verification gates
- Two users post a thread + replies → both receive notifications
- Article (from M4) auto-thread → users post replies → article comments section populates
- Moderator can lock a thread (lock icon shown; reply box disabled)
- First-time poster's post enters approval queue; mod approves → goes live
- Search "Minilogue" finds threads/posts containing it
- Mobile QA: scroll performance smooth on long threads; reply box keyboard interaction good

### Blockers / open questions
- Final category list (spec §13 — initial proposal in spec, confirm before M5 starts)
- Voting/karma: spec defers to post-MVP; confirm we're not adding
- Edit window duration: spec says 30 min; confirm

### Estimated effort
**8–11 eng-days.** +3–4 days vs. v0.1 for subscription levels matrix UI, likes, badges (schema + cron + display), pinned threads, faceted search with snippets, Tiptap paste-handler + lazy-load.

---

## M6 — Launch Prep

### Goal
Sintezaur is production-ready: SEO-optimized, observable, backed up, error-tracked, performant on mobile real-world networks. Soft-launch friendly.

### Deliverables
- [ ] `sitemap.xml` auto-generated from DB (all public Tezaur, Bazar, Revista, Forum URLs)
- [ ] `robots.txt`
- [ ] Schema.org structured data per page type (`Product` on Tezaur, `Article` on Revista, classified-listing on Bazar)
- [ ] OG tags + Twitter cards on all public pages
- [ ] Lighthouse mobile audit ≥ 90 on key pages (home, Tezaur detail, Revista article, Bazar listing)
- [ ] Sentry (or Pino-based error aggregation) wired in `api` + `worker`
- [ ] Daily `pg_dump` cron → Hetzner Storage Box (per Mudee backup plan)
- [ ] Status page (basic uptime; can be Coolify-internal or external like UptimeRobot free tier)
- [ ] Umami Cloud wired (same pattern as Mudee — script in `index.html` with `environment.prod.ts` website ID)
- [ ] Brevo monthly delivery rate check
- [ ] Security pass: rate limits across endpoints, password complexity rules, XSS audit of Tiptap rendered output
- [ ] Privacy Policy + Terms of Service (RO; EN later)
- [ ] GDPR essentials: `export-my-data` + `delete-my-account` endpoints + UI

### Backend work
- Sitemap generator (cron via pg-boss, or on-the-fly with HTTP-level cache)
- Schema.org JSON-LD injection in SSR templates
- Error tracking setup (Sentry SDK or alternative)
- Backup script + Coolify cron / external cron
- GDPR endpoints (export, delete-account)

### Frontend work
- OG/Twitter card meta in all page components (via shared `MetaService`)
- Privacy + Terms pages
- Cookie consent banner — **skip** if we only use Umami (no cookies); add only if other tracking lands
- Final mobile polish pass: real-device audit + Lighthouse mobile across key pages

### Mobile-first checklist
- Real-device QA on iPhone Safari + Android Chrome + iPad
- Performance budget: LCP < 2.5s on Slow 4G simulated
- Touch target audit (≥44px everywhere)
- Lighthouse mobile ≥ 90 on home, Tezaur detail, Revista article, Bazar listing

### Verification gates
- Lighthouse mobile ≥ 90 on all 4 key page types
- Backup runs successfully; restore-from-backup test passes
- Error tracker captures intentionally thrown test errors
- `sitemap.xml` validates with Google's Search Console testing tool
- Real-mobile QA pass on iOS + Android

### Estimated effort
**3–5 eng-days.**

---

## Cross-cutting work (always-on, not in any single milestone)

### i18n
- `ro.json` populated incrementally as features ship
- Translation keys hierarchical: `bazar.listing.cta.send_message`
- Every new component gets reviewed: no hardcoded Romanian in source
- Future `en.json` is a copy-and-translate exercise; structure stays identical

### Notifications
- Schema introduced in M1 (`notification`, `notification_preference`)
- Triggers added milestone-by-milestone (Bazar in M3, Revista in M4, Forum in M5)
- Email digest batching via pg-boss (configurable cadence per user)

### Tests
- Unit on services (every milestone)
- Integration on critical flows: auth (M1), transaction (M3), publish (M4), moderation (M5)
- E2E (Playwright) on smoke flows in M6

### Observability
- Pino structured logs from M0
- Sentry/error tracking in M6 (or earlier if convenient)
- Coolify deployment logs reviewable per app

### Mobile QA
- Real-device testing at end of every milestone, not just M6
- Iulian: keep iPhone + Android handy for end-of-milestone reviews

---

## Parallel work tracks — leveraging your design effort

You design with Claude Design / Open Design while I build. Here's how the pipelines interlock.

### What moves in parallel with design (no design needed yet)
- M0 (entire — pure infra)
- M1 backend (entire)
- M2 backend (entire — schema, search, image pipeline, admin endpoints)
- M3 backend (entire — schema, WebSocket, transaction logic)
- M4 backend (mostly — Tiptap config, oEmbed proxy, article API)
- M5 backend (mostly — schema, mod tools, anti-spam)

### What gates on design tokens / page layouts
- M1 site auth pages (can start with PrimeNG default styling, polish when design lands)
- M2 Tezaur site browse + detail (the "killer page" — design must inform final pass)
- M3 Bazar list + detail + chat UI (chat especially — design needs to specify mobile bottom-sheet behavior)
- M4 article reader + editor (typography-heavy — wait for design)
- M5 forum browse/post (less design-sensitive — can ship draft styling first if needed)
- M6 polish pass

### Recommended design priority order (for your Claude Design work)

1. **Tezaur detail page** — the spine; informs every aggregated section
2. **Auth flow pages** — small, isolated; gets us out of M1 cleanly
3. **Tezaur list + filters bottom sheet** — mobile-defining pattern
4. **Bazar listing detail + chat bottom-sheet** — sets the chat UX
5. **Bazar listing list + filters** — reuses Tezaur filter pattern
6. **Bazar new-listing flow** — multi-step on mobile
7. **Article reader + author profile** — typography masterclass
8. **Forum browse + thread detail** — replies, mentions, jump-links
9. **User profile** — cross-cutting; used by Bazar reviews, Revista authors, Forum poster identity

### Handoff mechanics
- You drop Claude Design HTML/JSX into `design-imports/<feature>/`
- I convert each into Angular components in `apps/site/...` or shared `libs/ui/`
- We iterate: I implement, you review on actual mobile, I refine

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tezaur taxonomy underspecified | High | Blocks M2 | Round 4 spec interview BEFORE M2 starts |
| Design pipeline slower than backend | Medium | M2+ frontend slips | Backend-only milestones in parallel; PrimeNG-default UI as fallback so features are testable |
| Coolify deploy quirks (Mudee captured several) | Low | M0 delay | All capcanele documented in `mudee/infrastructure/deployment.md`; copy patterns exactly |
| WebSocket reliability under load | Low | M3 chat UX | Single-VPS scope = single api process; LISTEN/NOTIFY adequate at our scale |
| Email deliverability (DKIM/SPF/DMARC) | Medium | M1+ auth flow | Set up DKIM/SPF/DMARC during M0 DNS step; monitor Brevo dashboard |
| Tiptap + Angular integration gotchas | Medium | M4 slip | Reuse Mudee's `EditorComponent` pattern as base |
| Mobile performance below targets | Medium | M6 fails Lighthouse | Performance budgets enforced per milestone, not just at end; SSR for site from M0 |
| Spec drift during execution | Medium | Confusion, rework | All decisions through spec.md §13; chat decisions roll into spec before code lands |

---

## Open spec questions blocking specific milestones

From `docs/spec/spec.md §13`. Listed by which milestone they block.

### Before M2
1. ~~Tezaur taxonomy~~ ✅ RESOLVED (spec §8.1 — 18 categories + type enums + JSONB shapes)
2. ~~Tezaur per-category specs JSONB shape~~ ✅ RESOLVED
3. **Initial 50–100 seed list** — Iulian's curated pick, or research-derived?

### Before M3
4. **Disputes / mediation flow** — define minimum scope (recommendation: just admin "remove + ban", anything more is post-MVP)

### Before M4
5. **Article tag taxonomy** — free-tags-only vs. curated tag list

### Before M5
6. **Forum category final list** (spec proposal is initial; confirm)
7. **Voting/karma decision** (spec defers to post-MVP — confirm we skip)
8. **Edit window duration** (spec suggests 30 min — confirm)

### Before M6
9. **Rate limit values** (per-action throttling)
10. **Notification preferences UI** — full matrix
11. **Affiliate partners beyond Thomann** — confirm priority list

### Non-blocking (resolve when convenient)
- Onboarding flow / first-time UX
- Profile pages — full field list

---

## Post-MVP roadmap (recap from spec §12)

After M6 ships, in rough priority order:
1. Tezaur AI consolidation pipeline (free-text Bazar listings → catalog suggestions)
2. Sintezaur Score (algorithmic gear quality score)
3. B2B verified manufacturer accounts
4. Premium subscription tiers
5. Sample/preset marketplace (also when going international)
6. Forum collaboration matchmaking
7. **English-language sister platform** (the duplication path designed-for in spec §7.3)
8. Donations integration
9. Mobile native apps (only if responsive web proves insufficient)

---

## Suggested next step

Two ways forward:

**Path A — start M0 immediately.** I scaffold the Nx workspace + deploy "Hello world" to staging (`sintezaur.ro` pointing at empty SPA). Concurrent: you keep designing Tezaur detail page. Fastest path to seeing real progress.

**Path B — resolve M2 blockers first.** Round 4 of spec interview to lock down Tezaur taxonomy + initial seed list. Then M0 + M1 + M2 flow uninterrupted. Slower start, smoother middle.

**Recommendation: Path A.** M0 doesn't depend on taxonomy. M2 blockers can be resolved in parallel (a 30-min Q&A session) while M0+M1 happen. Don't let perfect spec block first deploy.

Your call.
