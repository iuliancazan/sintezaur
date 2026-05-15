# Sintezaur — execution status

Single source of truth pentru hand-off între sesiuni. Convenție: ultimul pas în
fiecare commit de sub-fază este actualizarea acestui fișier (linia + "Next up").
Niciodată nu poate diverge de git log dacă regula e respectată.

## Current state

**Last shipped:** M6-A (`<commit>`) — pagini legale (6 slug-uri) +
formular contact + cookies banner + admin dashboard CRUD. Soft-launch
ready pe latura GDPR.

**Next up:** **M6-B** — SEO base: `MetaService` global per pagină
(title/description/OG/Twitter), `sitemap.xml` dinamic din DB, JSON-LD
schema.org pe Tezaur/Revista/Bazar. TODO file pentru SEO max
(slug_redirect verify pe articol+forum_thread + 410 Gone după expirare).

**Active milestone:** M6 — polish + soft-launch prep (4 sub-faze:
A legal ✅ → B SEO → C polish UI → D feedback widget).

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

### M6 — Polish + Soft-launch prep (active)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `<commit>` | done | pagini legale (6 slug-uri seed RO) + admin `/legal` CRUD + formular contact public cu honeypot + admin `/contact-messages` queue + cookies banner + footer extins + migration `0012_legal_pages` + seed `9009_legal_pages_seed` + `marked` lib pentru render markdown |
| B   | — | pending | SEO mediu: `MetaService` global per pagină, `sitemap.xml` dinamic, JSON-LD Product/Article/ClassifiedAd + TODO max-level |
| C   | — | pending | polish UI pass: 404+410 brand pages, empty states peste tot, HTTP error interceptor global, skeleton loaders |
| D   | — | pending | feedback widget în user menu + admin `/feedback` queue cu mark-read/archive |

## Conventions (recap from memory)

- **Spec-first:** rundă de 5-8 întrebări înainte de cod, plan aprobat, apoi implement.
- **Code în engleză, UI în română** (i18n strict).
- **Commit & push între sub-faze.** Ultimul pas în fiecare commit:
  bifează linia în acest fișier + actualizează "Next up".
- **Spec autoritativ:** `docs/spec/spec.md` (citează § când iei decizii).
- **Migrations:** drizzle-kit generează cu nume aleator — redenumesc manual la
  `<idx>_<descriptive>.sql` + actualizez `meta/_journal.json` ca să nu colidă
  prefixele.
