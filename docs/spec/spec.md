# Sintezaur — Platform Specification

**Version:** 0.3
**Date:** 2026-05-14
**Status:** Draft — derived from spec interview rounds 1–5. Round 5 added schema/architectural hardening: trust verification tiers, audit log, soft delete pattern, slug strategy & redirects, financial/currency conventions, listing expiry & refresh, user blocking, generic content reports, listing price history, currency rates, gear firmware fields, optional canonical gear threads. Open questions tracked in §13.
**Language note:** spec written in English (matches code-in-English policy and the eventual international expansion path). UI labels and user-facing terms are Romanian.

---

## Table of Contents

1. [Vision & Mission](#1-vision--mission)
2. [Target Audience](#2-target-audience)
3. [Differentiator](#3-differentiator)
4. [Brand & Naming](#4-brand--naming)
5. [Architectural Thesis](#5-architectural-thesis)
6. [Components Overview](#6-components-overview)
7. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
8. [Component Specs (Detailed)](#8-component-specs-detailed)
9. [Data Model Sketch](#9-data-model-sketch)
10. [Tech Decisions](#10-tech-decisions)
11. [MVP Scope & Launch Sequence](#11-mvp-scope--launch-sequence)
12. [Roadmap (Post-MVP)](#12-roadmap-post-mvp)
13. [Open Questions](#13-open-questions)

---

## 1. Vision & Mission

**Sintezaur** is the Romanian-language vertical platform for music production gear, with primary focus on synthesizers. It unifies four tightly-integrated experiences:

- **Tezaur** — an authoritative gear encyclopedia
- **Bazar** — a peer-to-peer marketplace
- **Revista** — a music technology magazine
- **Forum** — a community discussion space

Mission: be **the** trusted, comprehensive, and integrated resource for Romanian-speaking music producers and synth enthusiasts — and prove out a model that can be cloned to English (and other locales) once successful.

The name **Sintezaur** is a deliberate double wordplay: *sinteză + tezaur* (synthesis + treasure) and *sintez(ator) + aur* (synth + gold). The **Tezaur** section closes that loop semantically.

---

## 2. Target Audience

- **Primary:** Romanian-speaking music producers, hobbyists, synth enthusiasts. Range from hobbyist beginners to working professionals.
- **Secondary:** Romanian audio retailers, distributors, instrument manufacturers, plugin/hardware developers.
- **Tertiary (long-term):** the broader Romanian electronic music scene — DJs, sound designers, audio engineers.

**Initial scale assumption:** a few thousand active users over the first 2–3 years. Architecture decisions are sized accordingly.

**Geographic scope:** Romania initially. Internationalization planned post-MVP (see §7.3).

---

## 3. Differentiator

| Competitor              | What Sintezaur does differently                                           |
| ----------------------- | -------------------------------------------------------------------------- |
| OLX (general listings)  | Vertical specialization; Tezaur catalog references; bilateral trust ratings; integrated knowledge; structured offers; swap/trade native. |
| Reverb / Equipboard     | Native Romanian language and audience; local seller trust; lower friction for RO buyers/sellers. |
| Romanian music forums   | Centralized hub combining magazine + marketplace + structured catalog; modern UX; mobile-first; embedded media. |
| Sound on Sound / MusicRadar | Localized Romanian content; integration with local marketplace; community-driven editorial flow. |

The structural moat is the **relational integration**: every gear page aggregates editorial reviews, active marketplace listings, forum discussions, user reviews, and price history. None of the existing Romanian alternatives offer this.

---

## 4. Brand & Naming

- **Platform name:** Sintezaur
- **Domain (assumed):** sintezaur.ro
- **Section labels** (UI = Romanian; code/module = English; URL slugs = Romanian for `.ro` instance):

| UI label | Code module      | URL slug      |
| -------- | ---------------- | ------------- |
| Tezaur   | `gear`           | `/tezaur/`    |
| Bazar    | `marketplace`    | `/bazar/`     |
| Revista  | `magazine`       | `/revista/`   |
| Forum    | `forum`          | `/forum/`     |

For an eventual English instance, slugs configure to `/treasure/`, `/marketplace/`, `/magazine/`, `/forum/` (or whatever is decided). Code modules stay identical.

---

## 5. Architectural Thesis

The single most important architectural decision: **Tezaur is the foundation, not a peer section**. Every Bazar listing, every Revista article, every Forum thread links back to Tezaur entries via foreign keys (with free-text fallback in Bazar — see §8.2). Without this spine, the platform is just three loosely-related sites; with it, it becomes a unified knowledge graph.

The "killer page" of the platform is a Tezaur detail page (e.g., `/tezaur/korg-minilogue-xd`), which aggregates:

- Specs, photos, video embeds, manual URL, current firmware version
- Editorial review (from Revista, if exists)
- All active Bazar listings for this gear
- All Forum threads tagged with this gear (plus the optional canonical Q&A thread)
- All user reviews (Discogs-style, see §8.1)
- Price history graph (computed from Bazar listings, with histogram-by-condition view)
- "X persoane dețin acest gear" (from personal collection, §8.1)
- Predecesor / Succesor sidebar (typed gear relationships, §8.1)
- Affiliate "Buy from..." links (Thomann etc.)

Every other workflow on the platform funnels eyeballs toward — or generates content for — these pages. They are the SEO and monetization engine.

---

## 6. Components Overview

### 6.1 Tezaur — gear encyclopedia (foundational)

The relational spine. Catalog of music gear with structured specs, photos, manual links, video embeds, firmware tracking, and aggregated content from the other sections. Core entity is `gear`. Sister entity `gear_family` groups variants; `gear_relationship` captures typed lineage (successor / variant / inspired_by / based_on / replaces). User reviews of gear are a Discogs-style separate table (`gear_review`), unrelated to marketplace transactions. Price history is computed exclusively from Bazar listings, with both line chart and per-condition histogram views.

Users can flag their **personal relationship** to any gear: `owned`, `wishlist`, `wanted`, `used_to_own`, `loaned_out`. This personal-collection layer drives the platform's strongest retention loop and feeds price-drop notifications on watched Bazar listings.

Editorial descriptions are stored per-locale (`gear_description`) so the future English instance ships without schema migrations. Each gear can optionally have a canonical Q&A thread auto-attached (editor toggle).

### 6.2 Bazar — peer-to-peer marketplace

OLX-style listings, no payments in MVP. Listings reference Tezaur entries when possible; free-text fallback ("Other / Custom") accepted because the catalog will take years to build. Each listing has `kind` (`sell` / `trade` / `sell_or_trade`) and `delivery` (`pickup_only` / `shipping_only` / `both`) — synth culture is swap-heavy, and Romanian buyers strongly prefer pickup for high-value gear. Listings expire after 90 days, refreshable max once per 30 days for free.

In-app messaging is default; sellers can opt to display their phone/email per-listing or globally. **Structured offers** live inside the chat as typed messages (`offer` / `counter_offer` / `offer_accepted` / `offer_rejected`) — counter chain capped at 5 rounds.

Users can **heart** (watch) listings, **save searches** with custom filters (max 50 per user, configurable), and **quick-list** new listings from any Tezaur gear page (80% of the form pre-filled, including price suggestion from sold-history). All price changes are logged to `listing_price_history` so price-drop notifications are accurate and a per-listing price timeline is reconstructable.

Users can block other users (cross-section effect — see §8.2) and report any content via the generic `content_report` flow.

Bilateral trust system: both parties confirm a completed transaction before either can leave a review.

### 6.3 Revista — Music Technology magazine

Six content pillars (Reviews, Tutorials, News, Interviews, Buying Guides, Hardware Deep-Dives). Editorial archetype: hybrid 60% utility / 30% culture / 10% community-driven. Internal staff are editors by default; admin can grant editor role to qualified community members. Each published article auto-generates a Forum thread for discussion (visible in both places).

### 6.4 Forum — community discussions

Anonymous can read everything; account required to post. Categories curated to fit the synth/music-tech audience. Threads can be tagged with Tezaur gear entries, populating the gear detail pages automatically. Threading is **Discourse-hybrid** (linear chronological + "în răspuns la" jump-link). Subscription has 4 levels (Watching / Tracking / Mentioned-only / Muted). Posts get likes (single "Util" reaction, no ranking effect). Users earn objective badges (no karma). Mods can pin up to 3 threads per category. User blocks apply: blocked users' posts are hidden behind a "[Postare ascunsă]" placeholder.

---

## 7. Cross-Cutting Concerns

### 7.1 Authentication & Accounts

- Single unified account across all four sections (SSO mandatory).
- Email + password signup; **email confirmation only** at signup (low friction, no SMS or KYC in MVP).
- Authentication: NestJS `passport-jwt`, tokens in HttpOnly cookies.
- Password hashing: bcryptjs.
- Standard flows: signup, login, logout, email verification, password reset, change password, change email (with `user_email_history` tracking).

### 7.2 Roles & Permissions

Roles are **additive and multi-valued**: a single user can hold any combination (e.g. `editor` + `curator`). Storage is a join table `user_roles (user_id, role, granted_at, granted_by)` rather than a column on `users`. `guest` is implicit (no row; an unauthenticated request).

| Role         | Scope                                                                                          | Where they work                                |
| ------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| guest        | Read all public content (Tezaur, Bazar, Revista, Forum).                                       | Site (anonymous).                              |
| user         | Above + post in Forum, list in Bazar, write gear reviews, comment on articles, donate, like posts, save searches, watch listings, mark gear (owned/wishlist/etc.), block other users, report content. Default for every signup. | Site.                          |
| contributor  | Above + add new gear entries in Tezaur and edit **only their own** submissions.                | Site (inline Tezaur create/edit on own items). |
| curator      | Above + edit/delete **any** Tezaur entry (gear, families, relationships, canonical-thread toggle). Discogs-style database editors. | Site (inline Tezaur edit). NOT dashboard. |
| editor       | Above + draft, edit, publish, archive Revista articles. Cannot edit other editors' articles unless they also hold `admin`. | Site (inline Tiptap editor on `/revista`). NOT dashboard. |
| moderator    | Above + Forum moderation (lock thread, hide post, temp-ban, pin) + Bazar moderation (remove listing, hide gear review, resolve content reports). Quasi-admin minus Revista and Tezaur catalog editing. | Site (inline moderation buttons). NOT dashboard. A dedicated moderator dashboard may land post-MVP if surface area grows. |
| admin        | Above + full dashboard access, user management, system configuration, badge grants, currency rates, audit log viewer, content report queue. **Cannot** grant or revoke `admin` / `superadmin` — only `superadmin` can. | Dashboard.                                     |
| superadmin   | Above + grant/revoke `admin` and `superadmin` roles. Bootstrapped via `seed:superadmin` (one row at install). Technically can be multiple, but only one is created at install — additional superadmins are granted manually by an existing superadmin. | Dashboard.                                     |

**Promotion paths:**
- `user → contributor` — **automatic** after 100 published Forum posts (revoked automatically if the count drops below threshold via moderation).
- `contributor → curator` — manual by admin.
- `user → editor` — manual by admin (Revista grant).
- `user → moderator` — manual by admin.
- `* → admin` — manual by **superadmin only**.
- `* → superadmin` — manual by **superadmin only**.

**Dashboard gate:** only `admin` and `superadmin` may log into `/dashboard`. All other roles do their privileged work inline on the public site.

**Trust level** (`unverified` … `trusted_seller`, per §7.4) is **orthogonal** to roles — never confused with them.

### 7.3 Internationalization Strategy

Codebase 100% English. UI strings live in i18n files (`ro.json` from day 1, future `en.json` for English instance). Schema is locale-neutral: text columns hold whatever locale's content the instance serves. URL slugs are configurable per-instance via env config.

**Content-level i18n:** `gear_description` table is keyed by `(gear_id, lang)` — MVP populates `lang='ro'` only, but the table is ready for `lang='en'` when the sister instance ships. Specs (numeric / enum) don't need translation; field labels come from i18n.

**Migration path to an English instance:**
1. Clone the repository.
2. Set locale env vars (`LOCALE=en`, slug overrides for sections).
3. Provision a fresh PostgreSQL database.
4. Deploy.

No code rewrites; the architecture is locale-agnostic by construction.

### 7.4 Trust & Reputation System

**Bazar (transactional):**
- Bilateral reviews. After a confirmed transaction, both buyer and seller can submit a review of each other.
- A "Confirm tranzacție" button appears in the listing chat for both parties. Once both have clicked it, the listing flips to `sold` and the review window unlocks for both.
- Reviews are stored per-transaction and an aggregate score is computed per user.
- Both per-transaction reviews and the aggregate are visible on user profiles and listing pages.

**Tezaur (Discogs-style gear reviews):**
- Independent of marketplace transactions. Any logged-in user can review any gear item they wish.
- Stored in `gear_review` table with rating (1–5), free-text body, optional photos.
- Aggregate score per gear computed and displayed on detail page.

**Forum (community signals):**
- **Likes** ("Util" reaction, single type) — visible count per post, **no ranking effect** on order. Soft thank-you signal without driving algorithmic re-ordering.
- **Badges** based on objective milestones (NOT karma). Visible on profile only, never next to each post.
- Standard implicit signals: post count, account age.
- **Voting/karma deferred post-MVP** — likes-without-ranking is the explicit MVP choice.

**Trust verification tiers** — stored as `user.trust_level` enum:

| Tier | Meaning | When granted |
|---|---|---|
| `unverified` | Fresh signup, email not yet confirmed | Default; cannot post / list / write reviews |
| `email_verified` | Email confirmation done | Automatic after email click-through; full MVP user privileges |
| `phone_verified` | SMS OTP confirmed (post-MVP feature) | After SMS verification |
| `id_verified` | ID document accepted (post-MVP feature) | After manual KYC review |
| `trusted_seller` | Admin-granted senior trust | Manual; for N+ completed transactions, X+ rating, no warnings |

Columns on `user` (all present from MVP, even if verification UIs are post-MVP):
- `phone_e164` text, nullable (E.164 format, e.g. `+40712345678`)
- `phone_verified_at` timestamp, nullable
- `id_verified_at` timestamp, nullable
- `trust_level` enum (default `unverified`)

Trust badges visible on Forum profile + Bazar listing card derive from `trust_level`. Even though phone/ID verification flows ship later, having the columns ready avoids a painful migration.

### 7.5 Notifications

- **In-app:** WebSocket (Socket.io) push to active sessions.
- **Email:** Nodemailer via pg-boss queue (batched).
- **Triggers** (organized by section):

**Bazar:**
- New message on a listing chat
- New offer / counter-offer received
- Offer accepted / rejected on a chat I'm in
- Price drop on a watched listing (any decrease — no threshold logic; driven from `listing_price_history`)
- New listing matches one of my saved searches
- Buyer/seller confirmed a transaction I'm in
- Review submitted on my Bazar transaction
- Listing about to expire (3 days, 1 day)
- Dispute opened against me / by me (post-MVP)

**Tezaur:**
- Review submitted on my gear review
- Status change on gear I own (rare — e.g., admin edited)

**Revista:**
- Article published in a category I follow
- Reply to my article (via the auto-forum-thread)

**Forum:**
- Reply in a thread I'm subscribed to (per subscription level)
- Mention (`@username`) in any post
- Badge earned
- Admin action affecting my content
- Report I filed has been resolved

**Subscription levels** (apply to forum threads + forum categories):
- **Watching** — every reply notifies (default after replying in a thread)
- **Tracking** — daily summary of new activity
- **Mentioned only** — only `@username` mentions
- **Muted** — never notify, never surface in "latest" / "unread"

**Per-channel preferences:** each user has an in-app prefs page with a matrix of [trigger × channel (in-app / email)]. Default: most in-app on, email batched daily for non-urgent triggers.

**Deduplication:** every notification carries a `dedup_key` (e.g., `forum_reply:<post_id>:<recipient_id>`). Before insert, the system checks for existing notifications with the same key in the last N minutes (configurable, default 60). Skip if present. Prevents the same event spamming a user who's subscribed via multiple paths (thread + category).

### 7.6 Search

- Postgres full-text search across articles, listings, gear, forum posts.
- Romanian dictionary for stemming (`romanian` text search config).
- `pg_trgm` extension for typo tolerance.
- One unified search page + per-section filtered search.
- **Faceted search on Forum**: filter by category, author, tag, gear tag, date range. Result snippets show 2 lines of content with the matched term highlighted (`<mark>` styling).
- Auto-suggest with debounce.

### 7.7 SEO

- SSR via Analog (already in tech stack) for the public site.
- Per-page metadata (title, description, OG, Twitter cards).
- Schema.org structured data (Product on Tezaur, Article on Revista, ClassifiedAd on Bazar).
- Sitemap.xml auto-generated from DB.
- Internal linking heavy: every gear mention in articles auto-links to Tezaur; every gear in listings links to Tezaur; cross-section.
- Romanian-language slugs (`/tezaur/korg-minilogue-xd`).
- Slug renames produce 301 redirects for 30 days (per §7.13), preserving SEO equity.

### 7.8 Donations

- Future feature, post-MVP. Provider TBD (Stripe later, possibly NETOPIA / 2Performant for RO at first).
- Schema-ready: `donation` table with user, amount, currency, status.

### 7.9 Affiliate Links

- Stored on Tezaur `gear` records as a list of `(retailer, url, affiliate_id)` tuples.
- Priority partner: **Thomann** (mature affiliate program, EU-friendly).
- Secondary: Reverb, eBay, Sweetwater, possibly Romanian retailers.
- Tracking: out-of-the-box analytics on click-throughs (UTM params or internal redirect with logging).

### 7.10 Audit Log

All privileged actions (superadmin, admin, moderator, curator, contributor, editor) are logged for traceability — investigations, dispute resolution, regret recovery. Auto-promotions (`user → contributor` at 100 forum posts, or its reverse) are also logged with `actor_id = NULL` (system).

Schema: `audit_log (id, actor_id, action, target_type, target_id, payload jsonb, ip_address inet, user_agent text, created_at)`.

**Action enum** (extensible):
- User: `user.role_granted`, `user.role_revoked`, `user.banned`, `user.unbanned`, `user.deleted`, `user.merged`, `user.email_changed`, `user.trust_level_changed`
- Tezaur: `gear.created`, `gear.updated`, `gear.deleted`, `gear.published`, `gear.canonical_thread_toggled`
- Bazar: `listing.removed_by_admin`, `listing.unremoved`, `transaction.reversed`
- Forum: `post.hidden`, `post.unhidden`, `thread.locked`, `thread.unlocked`, `thread.pinned`, `thread.deleted`
- Revista: `article.published`, `article.unpublished`, `article.archived`
- Reports: `report.opened`, `report.resolved`, `report.dismissed`
- Config: `config.changed`, `currency_rate.updated`

**Not logged:** routine end-user write actions (listing creation, forum posting, gear review submission). Only privileged actions hit the log.

**Retention:** indefinite. Audit log is exempt from soft-delete and GDPR cascade (legitimate-interest justification for fraud investigation, documented in privacy policy).

Dashboard surfaces "Activity log" with filters by actor, action type, target, date range.

### 7.11 Soft Delete Pattern

Per-table policies (locked):

| Table                  | Pattern                                              | Notes                                                       |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `user`                 | `deleted_at` + anonymization                          | GDPR delete anonymizes PII columns; FK integrity preserved   |
| `listing`              | `status='removed'`/`'expired'` + `removed_at`         | Removed listings stay in DB to feed price history            |
| `forum_post`           | `hidden_at` + `hidden_reason` + `hidden_by_user_id`   | Mod action; thread continuity preserved                      |
| `forum_thread`         | `locked_at` (visible, no replies) + `deleted_at`      | Two distinct mod actions                                     |
| `article`              | `status='archived'`                                   | Already in spec                                              |
| `gear_review`          | `hidden_at` + `hidden_reason`                         | Mod hide for abuse                                           |
| `transaction_review`   | `hidden_at` + `hidden_reason`                         | Mod hide for abuse                                           |
| `gear`                 | `deleted_at`                                          | Admin-only; usually we set `year_discontinued` instead       |
| `message` (chat)       | NO soft delete                                        | GDPR delete forces hard delete                               |
| `listing_photo`        | NO soft delete                                        | Hard delete with cascade                                     |
| `audit_log`            | NO soft delete, NO GDPR cascade                       | See §7.10                                                    |

**Query filtering:** All public-facing queries filter out soft-deleted rows. Drizzle query helpers wrap this consistently — never hand-write `WHERE deleted_at IS NULL` in business code.

**Admin "trash" view:** Dashboard surfaces soft-deleted entities so they can be restored or hard-deleted.

**GDPR account deletion:** Anonymization function nulls/redacts PII across the user's footprint. Messages anonymized to "Utilizator șters" (the row stays for the other party's context, but content gets nulled if requested). Profile blanked. Reviews kept but author shown as "Utilizator șters". Hard-delete `message` rows on demand. `audit_log` retains the user_id for fraud-investigation legitimate-interest.

### 7.12 Financial Conventions & Multi-Currency

**Money column type:** `numeric(12, 2)`. Never `float` (lossy), never `int cents` (unnecessary arithmetic). Drizzle `decimal()` type.

**Currencies in MVP:** `ron` (default), `eur`. Listings choose one; aggregations convert at display time.

**Currency rate table:**
```
currency_rate (
  id            uuid pk,
  currency_code text     (e.g. 'eur'),
  rate_to_ron   numeric(10, 4)  (e.g. 4.9750 means 1 EUR = 4.9750 RON),
  valid_from    timestamp,
  updated_by    user_id FK,
  updated_at    timestamp
)
```
Admin updates monthly (manual for MVP via dashboard; future: automated BNR/ECB feed). Newest `valid_from <= now()` row per currency is "current".

**Display rules:**
- Listing price shown in seller's chosen currency; conversion to user's `display_currency` shown in parentheses
- Tezaur pricing graph: RON-normalized by default, toggle to EUR per spec §8.1
- Aggregations (avg, median, histogram) compute in RON

**Storage rules:**
- Always store currency code alongside any monetary value (`price`, `currency`)
- Never convert at write time — only at read time (preserves accuracy)
- Currency rate updates do not rewrite historical prices

**User preference:** `user.display_currency` enum (default `ron`, alternative `eur`).

**Out of scope:** payment processing, FX margins, multi-currency wallets. We're displaying prices, not handling money.

### 7.13 Slug Strategy & Redirects

URL slugs are part of the SEO + bookmark contract. Once published, slugs don't change silently — renames create a redirect.

**Per-entity rules:**

| Entity                | Slug source                                              | Mutable?                                              | Uniqueness     |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| `gear.slug`           | auto from `brand` + `model`                              | Admin-editable BEFORE publish; LOCKED after publish    | Global         |
| `article.slug`        | auto from `title`                                        | Editor-editable in draft; LOCKED after publish         | Global         |
| `forum_thread.slug`   | auto from `title`                                        | Editable in 30-min edit window; LOCKED after          | Global         |
| `user.username`       | user-chosen at signup                                    | Max 1 change per 180 days                              | Global, case-insensitive |
| `forum_category.slug` | admin-set                                                | Admin-editable (rare)                                  | Global         |

**Slug format:**
- Kebab-case, lowercased
- Romanian diacritics transliterated: `ș→s`, `ț→t`, `ă→a`, `â→a`, `î→i`
- 3–80 chars
- Original title (with diacritics) stays in display; search remains diacritic-aware via `pg_trgm`

**Slug redirect table:**
```
slug_redirect (
  id          uuid pk,
  target_type enum ('gear', 'article', 'forum_thread'),
  old_slug    text,
  new_slug    text,
  target_id   uuid,
  expires_at  timestamp (default now() + interval '30 days'),
  created_at  timestamp
)
```

When admin/editor renames a `gear` / `article` / `forum_thread`, an entry is created; site router checks `slug_redirect` before 404-ing. After `expires_at`: row archived, URL returns `410 Gone` (signals search engines to drop the URL).

**Username changes:** NO redirect. Old URL → 404 immediately. Prevents identity confusion and impersonation when usernames change hands.

**Implementation:** Drizzle query helper `findBySlug(table, slug)` returns `(entity OR null, redirect_to OR null)`. Route handler in `site` app uses this consistently.

---

## 8. Component Specs (Detailed)

### 8.1 Tezaur

#### Population strategy

| Phase   | Source                                                                                  |
| ------- | --------------------------------------------------------------------------------------- |
| MVP     | Internal editors curate ~50–100 seed entries (most popular synths in RO scene). First draft at `docs/brainstorming/Seed List - Tezaur Gear Catalog v1.md` (~108 entries; pending Iulian's review). |
| Phase 2 | Community submissions with admin approval workflow.                                      |
| Phase 3 | AI consolidation pipeline scans free-text Bazar listings, suggests new entries to admin. |

#### Taxonomy (locked round 4)

**Approach: flat categories + per-category `type` enum in JSONB `specs`.** No nested category hierarchy at the DB level — filtering UI uses `category` as primary filter, then per-category `type` as secondary.

##### Categories (18 — all in MVP)

| `category` enum value | Label (RO)                          | `specs.type` sub-enum? |
| --------------------- | ----------------------------------- | ---------------------- |
| `synthesizer`         | Sintetizatoare                       | yes (synth type)        |
| `drum_machine`        | Drum machines                        | yes                     |
| `sampler`             | Samplere                             | yes                     |
| `sequencer`           | Sequencere                           | no                      |
| `effect`              | Procesoare de efect (hardware)       | yes (effect type)       |
| `midi_controller`     | Controllere MIDI                     | yes                     |
| `eurorack_module`     | Module Eurorack                      | yes (module_type)       |
| `eurorack_case`       | Carcase & alimentare Eurorack        | no                      |
| `audio_interface`     | Interfețe audio                      | no                      |
| `mixer`               | Mixere                               | no                      |
| `monitor`             | Monitoare studio                     | no                      |
| `headphones`          | Căști audio                          | no                      |
| `microphone`          | Microfoane                           | no                      |
| `recorder`            | Recordere                            | no                      |
| `software_synth`      | Instrumente software                 | no                      |
| `software_fx`         | Plugin-uri de efect                  | yes (same as `effect`)  |
| `daw`                 | DAW-uri                              | no                      |
| `accessory`           | Accesorii                            | no                      |

##### Per-category `type` sub-enums

```
synthesizer.type     ∈ { analog_mono, analog_poly, analog_paraphonic, digital,
                         virtual_analog, hybrid, fm, wavetable, modular_voice,
                         drone, other }

drum_machine.type    ∈ { analog, digital, sample_based, hybrid, groovebox }

sampler.type         ∈ { pad_based, keyboard_based, phrase_sampler, mpc_style,
                         groovebox, other }

effect.type          ∈ { reverb, delay, modulation, distortion, filter, multi_fx,
software_fx.type        pitch_shift, dynamics, eq, utility, other }
(same enum)

midi_controller.type ∈ { keyboard, pad, fader_bank, dj, wind, grid, hybrid }

eurorack_module.type ∈ { vco, vcf, vca, lfo, envelope, sequencer, utility, mixer,
                         effect, sampler, drum, clock, other }
```

##### Common columns on `gear` table (not JSONB)

All gear entries share these columns regardless of category:

- `category` — enum (one of the 18 above)
- `brand` — text
- `model` — text
- `slug` — text (unique, auto from `brand`+`model`, locked after publish per §7.13)
- `year_released` — int
- `year_discontinued` — int, nullable (null = still in production)
- `form_factor` — enum: `desktop`, `keyboard`, `pedal`, `rack_unit`, `eurorack`, `module`, `standalone`, `software`
- `msrp_at_launch_eur` — numeric(12, 2), nullable (per §7.12; used for depreciation curves later)
- `latest_firmware_version` — text, nullable (e.g., `"1.3.2"`; relevant for hardware with firmware)
- `firmware_notes_url` — text, nullable (URL to manufacturer's release notes / changelog)
- `canonical_thread_id` — uuid FK to `forum_thread`, nullable (optional canonical Q&A thread — see below)
- `deleted_at` — timestamp, nullable (soft delete per §7.11)

##### JSONB `specs` shape per category

**Synthesizer** (`category = synthesizer`):
```json
{
  "type": "analog_poly",
  "polyphony": 8,
  "oscillators_per_voice": 2,
  "filter_type": "ladder_lpf",
  "has_keyboard": true,
  "key_count": 37,
  "has_sequencer": true,
  "has_arpeggiator": true,
  "midi_io": ["din_in", "din_out", "usb"],
  "cv_gate": false
}
```
All fields optional. Missing fields are simply not rendered on the detail page.

**Eurorack module** (`category = eurorack_module`):
```json
{
  "type": "vco",
  "hp_width": 8,
  "depth_mm": 28,
  "power_plus_12v_ma": 80,
  "power_minus_12v_ma": 20,
  "power_plus_5v_ma": 0
}
```

**All other categories** (drum_machine, sampler, effect, midi_controller, software_fx, sequencer, eurorack_case, audio_interface, mixer, monitor, headphones, microphone, recorder, software_synth, daw, accessory):

- If the category has a `type` sub-enum (drum_machine, sampler, effect, software_fx, midi_controller): `{ "type": "<enum value>" }` only.
- Otherwise: empty `{}` — all detail lives in the editorial `description` (Tiptap, in `gear_description` per locale).

Structured spec fields for non-synth-non-eurorack categories are deferred post-MVP — once we see what users actually filter on, we add columns.

#### Detail page sections

1. **Hero:** name, brand, type tag, family link, "X persoane dețin acest gear" badge, photo gallery
2. **Specs:** structured fields + JSONB rendered as table; latest firmware shown if present
3. **Description:** editorial copy (Tiptap-rendered, served from `gear_description` for the active locale)
4. **External resources:** manual URL, manufacturer site, Wikipedia, firmware release notes link
5. **Lineage sidebar:** "Predecesor: X | Acest model | Succesor: Y" — from `gear_relationship`
6. **Reviews & Tutorials:** editorial articles linked from Revista + curated YouTube/external links
7. **User reviews (Discogs-style):** rating breakdown + individual reviews
8. **Active listings:** Bazar listings for this gear (live)
9. **Forum threads:** threads tagged with this gear; **canonical Q&A thread** pinned at top if `canonical_thread_id` is set
10. **Price history:** line chart + histogram by condition tier + RON/EUR toggle (only sold listings count)
11. **Buy links:** affiliate URLs to retailer sites

#### Canonical Q&A thread (optional, per gear)

A gear entry can OPTIONALLY have a single "canonical" forum thread (`gear.canonical_thread_id`) — the official "Discuții generale despre [Brand Model]" thread auto-created in the Forum subcategory "Discuții echipamente".

**Toggled by editor at gear publish/edit time** (default OFF). Recommended:
- ON for **current production** gear (likely to generate ongoing Q&A traffic)
- OFF for **vintage / historical** gear at initial seed (avoids creating empty threads when there's no audience)

Editors can flip the toggle later — flipping ON creates the thread; flipping OFF unlinks but does NOT delete the existing thread (preserves any replies).

The thread, when present, appears in the "Forum threads" section of the gear detail page at the top, with a "Canonical" badge. The thread's `canonical_for_gear_id` FK back to `gear.id` enables fast lookup.

#### Personal collection

Users can flag their relationship to any gear via `user_gear_status`:

| Flag           | Meaning                                                  |
| -------------- | -------------------------------------------------------- |
| `owned`        | Currently owns                                            |
| `wishlist`     | Wants to acquire (passive)                                |
| `wanted`       | Actively hunting (drives price-drop alerts on watched listings) |
| `used_to_own`  | Sold or parted with (nostalgia driver)                    |
| `loaned_out`   | Owns but currently lent to someone                        |

Per-user-per-gear (unique constraint on `(user_id, gear_id, status)`). Public/private toggle on user profile.

**Feeds:**
- "X persoane dețin acest gear" badge on detail page (counts public profiles only)
- "Colecția mea" tab on user profile (each subset listed)
- Future: collaborative-filtering recommendations (post-MVP)

#### Typed gear relationships

Beyond `gear_family` (which groups variants of a single model line), `gear_relationship` captures directed relationships:

| Type          | Meaning                                                  |
| ------------- | -------------------------------------------------------- |
| `successor`   | Moog Subsequent 37 is successor of Sub 37                |
| `variant`     | Different version within same family                     |
| `inspired_by` | Moog Voyager inspired by Minimoog                        |
| `based_on`    | Clone or derivative                                      |
| `replaces`    | Discontinued model superseded by another                 |

Surfaced as a simple sidebar on detail page. No timeline visualization in MVP (post-MVP).

#### Variants and families

Each variant is a separate `gear` row with `family_id` pointing to a shared `gear_family` row. Detail page shows a sidebar "Alte versiuni" linking siblings.

#### Language-aware descriptions

`gear_description (gear_id, lang, body, body_html, updated_by, updated_at)` holds editorial copy per locale. MVP populates `lang='ro'` only; forward-compat for EN.

#### Asset hosting policy

| Asset type       | Hosting                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| PDF manuals      | URL only (manufacturer site / archive.org). No self-hosting in MVP.             |
| Videos           | YouTube / Vimeo embed only. Never self-host.                                    |
| Audio demos      | SoundCloud / Bandcamp embed + own uploads via Sharp (with quota).               |
| Photos           | Self-hosted on Hetzner. Sharp generates variants (thumb, medium, large, original); EXIF stripped. |

### 8.2 Bazar

#### Listing fields

- `seller_id` (FK user)
- `gear_id` (FK gear, **nullable**) — if null, free-text fallback
- `raw_make`, `raw_model`, `raw_year` (free-text fallback used when `gear_id` is null)
- `slug` (auto from gear or title, listing-scoped uniqueness)
- `title`, `description` (Tiptap JSON)
- `price` numeric(12, 2), `currency` (default `ron`; per §7.12)
- `condition` enum: `new`, `mint`, `very_good`, `good`, `fair`, `for_parts`
- `kind` enum: `sell` (default), `trade`, `sell_or_trade`
- `looking_for` text (nullable, used when `kind != 'sell'`)
- `delivery` enum: `pickup_only` (default), `shipping_only`, `both`
- `shipping_cost` numeric(12, 2), nullable (used when `delivery != 'pickup_only'`)
- `shipping_carriers[]` enum array: `sameday`, `cargus`, `fan_courier`, `dpd`, `gls`, `posta_romana`
- `accepts_offers` boolean
- `photos[]` (array of self-hosted images, Sharp-processed, EXIF-stripped)
- `location` (city, RO)
- `status` enum: `active`, `sold`, `removed`, `expired`
- `created_at`, `updated_at`, `expires_at`, `refreshed_at`, `removed_at` (soft delete per §7.11)

#### Listing expiry & refresh

- `expires_at = created_at + 90 days` at creation
- A pg-boss daily cron flips `status='expired'` for listings past `expires_at`
- Seller can **refresh** an active or expired listing (resets `created_at`, `expires_at`, sets `refreshed_at`)
- **Refresh policy:** max 1 free refresh per 30 days per listing; paid bumping is post-MVP
- Expired listings stay visible (marked `expired`, greyed out, no new messages) for 30 days, then soft-removed via `removed_at`

#### Price history logging

Every change to `listing.price` is logged to `listing_price_history (listing_id, old_price, new_price, currency, changed_at)`. Driven by a Drizzle service helper, not a raw DB trigger (so we can include audit context).

Used for:
- Price-drop notifications on watched listings
- Per-listing price timeline (visible in admin / future feature)
- Tezaur aggregations (per-gear price history feeds from sold listings; this table feeds active-listing trends)

#### Quick-list from Tezaur

From any Tezaur gear page, a "Vinde acest [synth]" button opens a listing form pre-filled with:
- `gear_id` set
- Suggested title ("Moog Sub 37 — stare foarte bună")
- Suggested price band ("Preț mediu pe Bazar: 850 EUR — sugestie: 800–900 EUR" from `AVG(price)` over sold listings)
- Default condition prompt

User adds photos, location, condition, custom price. ~80% form pre-filled.

#### Free-text fallback rationale

The catalog will take years to build. Free-text "Other / Custom" is allowed. Accumulated free-text data feeds the post-MVP AI consolidation pipeline.

#### Saved searches

Users save arbitrary filter combinations. Stored in `saved_search (user_id, name, query_jsonb, notify_mode, created_at)`.

- **Notify modes:** `instant` / `daily_digest` / `off`
- **Cap:** max 50 saved searches per user (env-configurable: `SAVED_SEARCH_MAX_PER_USER=50`)

Evaluator: on each `listing` INSERT/UPDATE, the system checks active saved searches and triggers notifications.

#### Watching listings (hearts)

Heart button on listing card adds it to the user's watched list via `user_listing_watch (user_id, listing_id, created_at)`.

**Notifications on watched listings:**
- Price drop (any decrease, no threshold — fed by `listing_price_history`)
- Status change to `sold` or `removed`
- About to expire (3 days, 1 day before)

#### Recently sold prices on listing detail

Sidebar on every listing detail page:
- Last 5–10 confirmed sales of the same `gear_id` (date + condition + price)
- "Prețul mediu (90 zile): X RON, gradul *very_good*"

#### Structured offers (negotiation in chat)

Buyers can make a structured offer instead of accepting list price. Offers live inside the listing chat as typed messages.

**Message kinds** (`message.kind` enum):
- `text` (default)
- `offer` — proposes a price (amount, currency, optional note, expires_at)
- `counter_offer` — response with a different amount
- `offer_accepted` — terminal
- `offer_rejected` — terminal
- `transaction_confirmed` — system message after both parties click "Confirmă tranzacția"

**Rules:**
- Counter-offer chain capped at 5 rounds
- Offers have 7-day default expiry
- Listing must have `accepts_offers = true` for offer UI to surface

#### Swap / trade listings

`listing.kind` ∈ `sell` / `trade` / `sell_or_trade`. Trade listings expose a `looking_for` free-text field. Bazar list page has filter "Doar oferte de schimb".

#### Communication & contact

- **In-app messaging** is default. Each listing has a chat thread per buyer–seller pair.
- **Optional contact display:**
  - Per-user setting: "Show my phone publicly on my listings" (default off).
  - Per-listing override.

#### Transaction lifecycle

1. Buyer messages seller via the listing chat.
2. Optional: structured offer/counter-offer rounds (max 5).
3. Negotiation continues in chat.
4. Either party clicks **Confirmă tranzacția** in the chat.
5. Other party clicks the button. Listing flips to `sold`. Review window unlocks for 30 days.
6. Each writes a review of the other.
7. Aggregate ratings update on both user profiles.

#### Condition guide

Modal accessible from the listing form with real photos exemplifying each condition tier. Selecting `mint` requires a justification field (≥50 chars).

#### Photo gallery

1–10 photos with:
- First photo = hero
- Drag-and-drop reorder in form
- PrimeNG Galleria lightbox with swipe + zoom
- EXIF stripped on upload (privacy / GDPR)

#### Trust signals on listing card

- Seller aggregate rating
- Seller member-since date
- Seller transaction count
- Seller trust level (per §7.4)

#### Blocking users (cross-section)

Any logged-in user can block another via the listing chat, profile page, or forum post menu. Schema: `user_block (blocker_id, blocked_id, created_at, reason text nullable)` — unique on `(blocker_id, blocked_id)`.

**What block does:**
- Blocked user cannot send messages to blocker
- Blocked user's listings are hidden from blocker's Bazar list
- Blocked user's forum posts are hidden from blocker's view (`[Postare ascunsă — utilizator blocat]` with "Show anyway" toggle)
- Blocked user's gear reviews / transaction reviews are hidden from blocker's view
- Blocked user cannot reply to threads the blocker started (visible to blocked user as "Autorul threadului te-a blocat")

Block is reversible. Admins can audit blocks via `audit_log` if needed for dispute resolution.

#### Reporting (generic `content_report`)

Any logged-in user can report content for moderation:

Schema:
```
content_report (
  id                    uuid pk,
  target_type           enum,
  target_id             uuid,
  reporter_id           FK user,
  reason                enum,
  notes                 text,
  status                enum,
  resolution_notes      text,
  resolved_by_user_id   FK user,
  created_at, resolved_at
)
```

- `target_type` ∈ `listing` / `forum_post` / `forum_thread` / `gear_review` / `transaction_review` / `message` / `user_profile` / `article_comment`
- `reason` ∈ `spam` / `scam` / `fake_listing` / `wrong_category` / `nsfw` / `harassment` / `hate_speech` / `copyright` / `other`
- `status` ∈ `open` / `under_review` / `resolved_actioned` / `resolved_dismissed`

Single moderation queue in dashboard, filterable by `target_type` and `reason`. Audit log entry created on each resolution.

### 8.3 Revista

#### Editorial archetype (committed)

Hybrid: **60% utility, 30% culture, 10% community-driven**.

#### Six content pillars (all in MVP)

1. **Reviews** — gear reviews, link to Tezaur detail page.
2. **Tutorials** — workflow guides, sound design, mixing, with audio embeds.
3. **News** — industry news, product launches, scene news.
4. **Interviews** — Romanian producers, plugin developers, studio owners.
5. **Buying Guides** — "Cele mai bune ~ pentru ~", with Tezaur references and affiliate links.
6. **Hardware Deep-Dives** — synth histories, brand evolution, vintage retrospectives.

#### Editor role

- Internal staff: hold `editor` by default.
- Admin can grant `editor` to community members.
- Editors can draft, edit, publish, archive their own articles. Cannot edit other editors' work unless they also hold `admin`.
- Editors work **inline on the public site** (Tiptap composer on `/revista`), not in the dashboard.

#### Article fields

- `author_id` (FK user)
- `title`, `slug` (locked after publish per §7.13), `excerpt`
- `body` (Tiptap JSON)
- `hero_image_id` (FK image)
- `status` enum: `draft`, `published`, `archived`
- `category` enum: one of the six pillars
- `tags[]` (free tags + structured `gear_tag[]` to Tezaur)
- `published_at`, `updated_at`
- `is_premium` boolean (false in MVP; schema-ready for premium tier)

#### Tiptap editor config

Required extensions on top of starter-kit + link + placeholder:
- `@tiptap/extension-image` (with Sharp upload)
- `@tiptap/extension-youtube`
- Custom oEmbed node for SoundCloud / Bandcamp / Spotify
- **Paste-handler** — pasting a media URL auto-unfurls to embed
- **Lazy-load embeds** — thumbnail + play button until clicked
- **No autoplay**
- Optionally `@tiptap/extension-code-block-lowlight`

Single shared `EditorComponent` reused by Revista and Forum.

#### Article ↔ Forum integration

On `article.status` transition to `published`:
1. Auto-create a Forum thread in "Discuții articole" subcategory.
2. Store `thread_id` on the article (`article.thread_id`).
3. Article detail page renders the thread inline below the body (chronological).
4. Same thread browsable in Forum directly.

#### Author profiles

Public page at `/autor/{slug}` displaying bio, avatar, social links, and all published articles.

### 8.4 Forum

#### Access model

- Anonymous: read all.
- Account: post, reply, like, subscribe to threads, mention.

#### Categories (initial proposal — refine before M5)

- Sintetizatoare
- Drum Machines & Sampleri
- Effects & Procesoare
- Controllers & MIDI
- DAWs & Software
- Tehnici de producție
- Scena RO
- Discuții articole (auto-populated by Revista)
- Discuții echipamente (canonical gear Q&A threads — populated by editor toggles in Tezaur)
- Anunțuri (admin-only posts)

#### Threading model

**Discourse-hybrid** (chosen explicitly over 3-level Facebook-style):
- Posts in chronological order (linear)
- Each reply shows "în răspuns la @user — Postare #N" header
- Click header → expand inline preview / scroll-and-highlight
- Each post with replies shows "X răspunsuri" footer → expand inline (flat sub-list)
- **No depth limit. No indentation. No collapse.**

Why: mobile-first audience; use-case mix favors linear; Elektronauts + lines run this model.

#### Thread features

- Free tags + structured `gear_tag[]` (FK to Tezaur)
- Subscription levels (Watching / Tracking / Mentioned only / Muted)
- Edit window 30 minutes (configurable)
- Rich content via shared Tiptap editor; max 3 embeds per post
- Mentions (`@username` autocomplete)
- Likes ("Util", no ranking effect)

#### Pinned threads

Moderators can pin up to 3 threads per category. Used for: rules, megathreads, tutorials, guidelines.

Schema: `forum_thread.pinned_at` (nullable timestamp).

#### Faceted search

Filters: category (multi-select), author, tag, gear tag, date range. Sort: relevance / newest / most replies. Result snippets with `<mark>` highlights.

#### Anti-spam

- Honeypot field
- Time-on-form check
- Rate limit by IP
- Domain blocklist for disposable email
- Email verification before posting
- First-post approval queue (TL0 → TL1 after Nth approved post)

**NO reCAPTCHA / HCaptcha.**

#### Moderation

- **Moderator:** lock thread, hide post (soft delete with reason), warn user, temp-ban, approve queued posts, pin threads. Acts via inline buttons on the public site (not dashboard).
- **Admin:** same + permanent ban, grant/revoke `moderator`, manage badges (via dashboard).
- **Superadmin:** same as admin + grant/revoke `admin` and `superadmin`.
- **Reporting:** any user can report any content via generic `content_report` (per §8.2). Unified queue in dashboard.
- (Post-MVP) AI-assisted first-pass triage.

#### Blocking other users

Forum applies the global `user_block` table (per §8.2). When viewing a thread:
- Posts by users you've blocked are hidden with `[Postare ascunsă — utilizator blocat]` placeholder + "Show anyway" toggle
- Replying to a thread started by someone who blocked you is prevented with a notice ("Autorul threadului te-a blocat — nu poți răspunde")
- Mentions of blocked users in your own posts are still rendered (you can mention them; they just won't be notified if they've blocked you, and you won't see their replies)

---

## 9. Data Model Sketch

(High-level only; detailed schema to be authored in `docs/db-schema/` and Drizzle code. New columns/tables added in v0.3 are marked ★.)

### Core entities

**Identity & access:**
- `user` — auth, profile, notification preferences. v0.3 columns: `phone_e164`★, `phone_verified_at`★, `id_verified_at`★, `trust_level` enum★, `display_currency` enum★, `subscription_tier` enum★, `deleted_at`★. Roles live in `user_role`★ (see below), not on this row.
- `user_role`★ — `(user_id, role, granted_at, granted_by)`; PK `(user_id, role)`. Multi-valued; replaces the legacy single-column `users.role`.
- `user_email_history`★ — `(user_id, old_email, new_email, changed_at, ip_address)`
- `user_block`★ — `(blocker_id, blocked_id, created_at, reason nullable)`
- `user_badge` — awarded objective badges
- `refresh_token`, `email_verification_token`, `password_reset_token` (per §7.1)

**Tezaur (gear catalog):**
- `gear` — core. v0.3 columns: `slug` (per §7.13), `latest_firmware_version`★, `firmware_notes_url`★, `canonical_thread_id` FK nullable★, `deleted_at`★
- `gear_family` — groups variants
- `gear_relationship` — typed lineage (`successor` / `variant` / `inspired_by` / `based_on` / `replaces`)
- `gear_description` — locale-aware editorial `(gear_id, lang, body, body_html, updated_by, updated_at)`
- `gear_image`, `gear_video`, `gear_link`
- `gear_review` — Discogs-style; v0.3 adds `hidden_at`★, `hidden_reason`★
- `user_gear_status` — personal collection flags

**Bazar (marketplace):**
- `listing` — v0.3 columns: `kind`, `looking_for`, `delivery`, `shipping_cost`, `shipping_carriers[]`, `accepts_offers`, `refreshed_at`★, `removed_at`★, `slug`★
- `listing_photo` (Sharp variants, EXIF-stripped)
- `listing_price_history`★ — `(listing_id, old_price, new_price, currency, changed_at)`
- `user_listing_watch` — Bazar hearts
- `saved_search` — persisted filter queries (cap 50/user)
- `message` — kinds enum, structured offer payload
- `transaction` — buyer/seller confirmation timestamps
- `transaction_review` — bilateral; v0.3 adds `hidden_at`★, `hidden_reason`★

**Revista (magazine):**
- `article` — Tiptap JSON; locale-bound to instance
- `article_gear` — M2M

**Forum:**
- `forum_category` — `slug`, `name`, `position`
- `forum_thread` — v0.3 columns: `slug` (per §7.13), `pinned_at`, `locked_at`★, `deleted_at`★, `canonical_for_gear_id` FK nullable★
- `forum_post` — `parent_post_id`; v0.3 adds `hidden_at`★, `hidden_reason`★, `hidden_by_user_id`★
- `forum_subscription` — `level` enum, applies to threads OR categories (nullable thread_id, nullable category_id; check exactly one set)
- `forum_post_like` — single-reaction likes

**Cross-cutting:**
- `notification` — v0.3 adds `dedup_key`★
- `notification_preference` — per-trigger per-channel matrix
- `content_report`★ — generic, replaces v0.2 `forum_report`. Polymorphic by `(target_type, target_id)`
- `audit_log`★ — privileged-action log (per §7.10)
- `slug_redirect`★ — 30-day 301 redirects (per §7.13)
- `currency_rate`★ — manual monthly RON conversion rates (per §7.12)
- `donation` — post-MVP, schema-ready
- `affiliate_link`, `affiliate_click` — Tezaur monetization

### Key relationships

- `listing.gear_id` → `gear.id` (nullable; free-text fallback when null)
- `listing_price_history.listing_id` → `listing.id` (logged on every price UPDATE via service helper)
- `transaction.listing_id` → `listing.id`; buyer/seller → `user.id`; bilateral confirmation timestamps
- `transaction_review.transaction_id` → `transaction.id`; reviewer/reviewed → `user.id`
- `gear_review.gear_id` → `gear.id`; `user_id` → `user.id`
- `gear.canonical_thread_id` → `forum_thread.id` (nullable)
- `forum_thread.canonical_for_gear_id` → `gear.id` (inverse, for detection)
- `user_gear_status.user_id` × `gear_id` (composite unique with `status`)
- `user_listing_watch.user_id` × `listing_id` (unique)
- `gear_relationship.parent_gear_id` and `child_gear_id` → `gear.id`
- `gear_description.gear_id` → `gear.id` (composite unique with `lang`)
- `article.author_id` → `user.id`; `article.thread_id` → `forum_thread.id`
- `article_gear.article_id` × `gear_id` (M2M)
- `forum_thread.category_id` → `forum_category.id`; `gear_tags[]` → `gear.id`
- `forum_post.parent_post_id` → `forum_post.id` (nullable, for reply-jump)
- `forum_subscription` has nullable `thread_id` OR nullable `category_id` (exactly one set, check constraint)
- `user_block.blocker_id` and `blocked_id` → `user.id` (unique pair)
- `content_report.reporter_id`, `resolved_by_user_id` → `user.id`
- `content_report.target_type + target_id` — logical FK, polymorphic (not enforced at DB level)
- `audit_log.actor_id` → `user.id`; `target_type + target_id` polymorphic
- `slug_redirect.target_id` polymorphic by `target_type`
- `currency_rate.updated_by` → `user.id`

### Indexing strategy (highlights)

- All `slug` columns: unique B-tree
- `gear.specs` JSONB: GIN index for `?` and `@>` operators
- `gear` FT search: tsvector on `(brand, model, description, tags)`, GIN
- `listing` FT search: tsvector on `(title, description, raw_make, raw_model)`, GIN
- `forum_post` FT: tsvector on `body`, GIN; partial index `WHERE hidden_at IS NULL`
- `pg_trgm`: gin_trgm_ops on `gear.brand`, `gear.model`, `user.username` for typo-tolerant lookup
- Time-series indexes on `listing_price_history(listing_id, changed_at)`, `audit_log(actor_id, created_at)`, `notification(user_id, created_at)`
- Composite indexes for high-traffic queries (`listing(gear_id, status, price)`, `forum_post(thread_id, created_at)`)

---

## 10. Tech Decisions

(All locked at spec time. Authoritative version list in **`docs/devops/tech-stack.md`** — agents must read it before installing anything. See `~/.claude/.../memory/project_tech-decisions.md` for "why" and "how to apply" detail.)

| Concern              | Decision                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| Monorepo             | Nx 22.7, pnpm 10.33                                                             |
| Apps                 | `api` (NestJS), `worker` (pg-boss), `site` (Analog/Angular SSR), `dashboard`   |
| Database             | PostgreSQL + Drizzle ORM                                                        |
| Auth                 | Passport JWT in HttpOnly cookies, bcryptjs                                     |
| UI library           | PrimeNG + @primeuix/themes + PrimeFlex + PrimeIcons                            |
| Editor               | Tiptap 3 + extensions (image, youtube, oembed, paste-handler, optional code-block-lowlight)   |
| Search               | Postgres full-text (tsvector + GIN, pg_trgm for typo tolerance); faceted via SQL filters |
| Storage              | Hetzner local volume via Coolify; Hetzner Storage Box if 80GB tightens         |
| Payments             | None in MVP; schema neutral for future paid listings/subscriptions             |
| Real-time            | Socket.io via @nestjs/websockets; Postgres LISTEN/NOTIFY for inter-process     |
| Cache                | None (no Redis); throttler in-memory; sessions in cookies                      |
| File hosting policy  | Manuals: URL only. Videos: embed. Audio: embed + own uploads. Images: self-host + Sharp variants + EXIF strip. |
| Email                | Nodemailer via pg-boss queue                                                    |
| Background jobs      | pg-boss (Postgres-native, fits no-Redis constraint) — used for digests, saved-search evaluators, badge cron, listing expiry, slug_redirect cleanup, etc. |
| Logging              | Pino                                                                            |
| Testing              | Jest, Vitest, Playwright                                                        |
| Deploy               | Hetzner VPS + Coolify                                                           |
| i18n                 | @angular/localize from day 1; ro.json default; en.json roadmap; gear_description table for content-level i18n |
| Money type           | `numeric(12, 2)` everywhere; multi-currency via `currency_rate` table per §7.12 |
| Soft delete          | Per-table policy locked in §7.11; Drizzle query helpers filter consistently     |
| Audit log            | Indefinite retention; every privileged action logged (§7.10)                   |
| Slugs                | Locked after publish; renames produce 30-day 301 redirects via `slug_redirect` (§7.13) |

---

## 11. MVP Scope & Launch Sequence

### Foundation (must ship before any section)

- Auth: signup, login, email verification, password reset (per §7.1)
- User profile: avatar, bio, location, public page, public/private collection toggle, `display_currency` preference
- User trust columns ready (per §7.4): `phone_e164`, `phone_verified_at`, `id_verified_at`, `trust_level` enum — auto-flips to `email_verified` after email confirm
- Tezaur skeleton: 50–100 hand-curated synth entries, full detail page
- Schema for personal collection (`user_gear_status`), watching (`user_listing_watch`), saved searches (`saved_search`), badges (`user_badge`), typed gear relationships (`gear_relationship`), language-aware descriptions (`gear_description`)
- v0.3 schema additions all created in foundation (even if populated in later phases):
  - `user_block`, `user_email_history`, `content_report`, `audit_log`, `slug_redirect`, `currency_rate`, `listing_price_history`
- Soft delete pattern applied per §7.11 to all relevant tables
- Slug strategy implemented per §7.13 (slug helpers + slug_redirect router middleware)
- Currency conventions per §7.12 (`numeric(12, 2)` everywhere, `currency_rate` seeded with EUR-to-RON manual entry)
- i18n setup: `ro.json` populated, `@angular/localize` configured
- Notification system: email channel + in-app via WebSocket; `dedup_key` enforcement; full trigger matrix per §7.5
- Search: basic Postgres FT across `gear` + `article`
- Image upload pipeline: Multer + Sharp + storage variants + EXIF strip
- Admin dashboard: enough to manage users, Tezaur entries, role assignments, badge grants, audit log viewer, content report queue, currency rate updates

### Phase 1 — Bazar (first to ship)

- Listing CRUD (with free-text fallback)
- Listing fields: `kind` (sell/trade/sell_or_trade), `delivery` + `shipping_carriers[]`, `accepts_offers`
- Listing detail page with gear panel, photos, condition, location, contact, recently-sold sidebar, watch button
- **Quick-list from Tezaur** (autofill + price suggestion)
- **Saved searches** with notifications (max 50/user)
- **Watching listings** (heart) with price-drop and status-change notifications
- **Structured offers** in chat
- **Swap/trade** listings
- Photo gallery: hero + drag-drop reorder + EXIF strip + PrimeNG Galleria
- Condition guide modal
- In-app messaging (WebSocket-driven), conversation list with unread, image attachments
- Transaction confirmation flow + bilateral reviews + aggregate ratings
- Listing search and filters (gear, condition, price range, location, kind, delivery)
- Bazar-specific notification triggers wired per §7.5
- **Listing expiry policy enforced (90 days + refresh + cron)**
- **`listing_price_history` populated on every price UPDATE; drives price-drop notifications**
- **Block + report flows wired** (block on listing chat, report on listing detail)

### Phase 2 — Revista

- Article CRUD with Tiptap editor (full embed extension set + paste-handler + lazy-load)
- Editor role assignment by admin
- Article ↔ gear linking (M2M)
- Auto-create forum thread on publish
- Article detail page with inline forum thread
- Author profile pages

### Phase 3 — Forum

- Forum read-only exposed from day 1 (with seeded threads)
- Phase 3 unlocks: posting, replies, subscriptions, moderation
- Categories, threads, posts CRUD
- **Discourse-hybrid threading** (linear + reply-jump, parent_post_id)
- **Subscription levels** (Watching / Tracking / Mentioned only / Muted)
- **Likes** ("Util" reaction, no ranking effect)
- **Badges** (objective milestones, cron-computed, visible on profile only)
- **Pinned threads** (max 3 per category, mod+)
- **Faceted search** with result snippets
- Tiptap-powered post editor (shared with Revista)
- Subscription notifications per level
- Anti-spam stack (honeypot + time-on-form + rate limit + first-post approval queue)
- Moderation interface using unified `content_report` queue
- **Block applies in Forum** (hidden posts placeholder)
- **Optional canonical gear thread auto-creation** — Tezaur admin toggles per gear at publish/edit time

### Soft-launch strategy

Forum read pages (with seeded content) ship in foundation. Sitemap.xml is complete from day 1.

---

## 12. Roadmap (Post-MVP)

In rough priority order:

- **Tezaur AI consolidation pipeline** — scan free-text Bazar listings, suggest new gear entries
- **Equipboard-style "Sintezaur Score"** — algorithmic 0–100 gear quality score
- **Side-by-side gear comparison** (`/tezaur/compara?ids=...`) — deferred (descriptions are text-heavy now)
- **Weekly digest email** — deferred per Iulian preference
- **Phone verification** (Twilio or similar) — uses existing `phone_verified_at` column
- **ID verification (KYC light)** — uses existing `id_verified_at` column
- **`trusted_seller` admin-grantable trust level** — uses existing `trust_level` enum
- **Used-by-artist credits** (`gear_artist_use`) — RO moat
- **"Just sold" activity ticker** — social proof
- **Reply-via-email** for Forum
- **B2B verified manufacturer / distributor accounts**
- **Premium subscription tiers** — schema-ready
- **Sample / preset marketplace** — international expansion
- **Forum collaboration matchmaking**
- **Forum syntax-highlighted code blocks**
- **Multi-reaction emoji** beyond "Util"
- **Gear timeline visualization** (D3 lineage chart)
- **English-language sister platform**
- **Donations** integration
- **Full disputes / mediation flow** (current MVP has only admin "remove + ban")
- **Automated currency rate feed** (BNR/ECB)
- **AI-assisted moderation triage**
- **Mobile native apps**

---

## 13. Open Questions

These are flagged for follow-up rounds; not blocking the spec.

- **Forum categories:** finalize the list before M5 (current proposal in §8.4).
- **Rate limiting values:** per-action throttle thresholds (signups/hour, listings/day, posts/minute).
- **Donation flow specifics:** provider, UX, allocation.
- **Onboarding flow / first-time UX:** what does the first 60 seconds look like?
- **Profile pages:** full field list (location precision, social links, owned-gear list shown publicly, wishlist).
- **Mobile-specific UX:** touch-target audit, bottom-sheet patterns for Bazar filters and chat.
- **SEO specifics:** sitemap structure, schema.org markup per page type, URL conventions for gear families.
- **Affiliate provider integrations:** confirm Thomann is priority 1; identify Romanian retailers.
- **Initial seed list for Tezaur:** v1 draft completed at `docs/brainstorming/Seed List - Tezaur Gear Catalog v1.md` (~108 entries; pending Iulian's review/trim — 3 specific entries flagged by the research agent: Behringer Edge categorization, Moog Labyrinth price, Behringer MS-1 mkII year disambiguation).
- **`looking_for` UX:** structured (multi-gear picker) or free-text only? (Current spec: free-text.)
- **Saved-search query JSON shape:** finalize before M3 (filterable fields enumerated).
- **Currency rate refresh cadence:** monthly manual via dashboard for MVP; automated BNR/ECB feed post-MVP.
- **Audit log retention** beyond indefinite — confirm GDPR legitimate-interest justification documented in privacy policy at launch.
- **Block visibility:** when a blocked user views the blocker's content — do they see they're blocked? (Current spec: only when replying to a thread blocked-by author. Confirm.)

---

## Appendix A — Glossary (RO ↔ EN)

| RO              | EN                              | Notes |
| --------------- | ------------------------------- | ----- |
| Tezaur          | Treasure / Catalog              | Section name; module = `gear` |
| Bazar           | Marketplace / Bazaar            | Section name; module = `marketplace` |
| Revista         | Magazine                        | Section name; module = `magazine` |
| Forum           | Forum                           | Section name; module = `forum` (universal) |
| Confirmă tranzacția | Confirm transaction         | Bilateral confirmation button in Bazar chat |
| Discuții articole | Article discussions           | Forum subcategory auto-populated by Revista |
| Discuții echipamente | Gear discussions             | Forum subcategory hosting canonical gear Q&A threads |
| Anunțuri        | Announcements                   | Admin-only forum subcategory |
| Colecția mea    | My collection                   | User profile tab listing personal gear flags |
| Listinguri salvate | Watched listings             | Bazar hearts |
| Util            | Useful / Helpful                | Single "like" reaction on Forum posts |
| În răspuns la   | In reply to                     | Header on linked Forum posts (Discourse-hybrid threading) |
| Postare ascunsă | Hidden post                     | Placeholder shown when post is hidden by mod or blocked user |
| Sintezaur Score | Sintezaur Score                 | Post-MVP algorithmic gear score |

---

## Appendix B — Inspirations & Research

- **`reverb.com`** — primary architectural reference (catalog spine, listings, price guide, articles).
- **`kvraudio.com`** — relational integration of news / forum / database.
- **`equipboard.com`** — gear scoring and artist-centric discovery.
- **`gearspace.com`** (formerly Gearslutz) — community-driven product news pattern.
- **`elektronauts.com`, `llllllll.co`** — Discourse-hybrid threading reference.
- **`discogs.com`** — personal collection model and Discogs-style user reviews on entities.
- **`vinted.com`** — saved searches + structured offers + GDPR-native deletion patterns.
- **`musicradar.com`, `cdm.link`, `soundonsound.com`, `tapeop.com`** — editorial archetypes and content pillars.
- **Gemini Deep Research dossier** at `docs/brainstorming/Music Tech Platform Brainstorming Session.md`.
- **Feature-mining at** `docs/brainstorming/Feature Ideas - Tezaur Bazar Forum.md`.
- **Design references at** `docs/brainstorming/Design References - Modern Editorial Sites.md`.
- **Seed list draft at** `docs/brainstorming/Seed List - Tezaur Gear Catalog v1.md`.
