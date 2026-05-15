# Sintezaur — execution status

Single source of truth pentru hand-off între sesiuni. Convenție: ultimul pas în
fiecare commit de sub-fază este actualizarea acestui fișier (linia + "Next up").
Niciodată nu poate diverge de git log dacă regula e respectată.

## Current state

**Last shipped:** M5-E (HEAD) — likes („Util") + subscriptions (thread +
category, 4 leveluri) + notification fan-out (`forum_mention` > `revista_reply_to_my_article` > `forum_reply_in_subscribed`) + `/cont/abonamente`.

**Next up:** **M5-F** — badges cron + dashboard editor pentru badge
definitions. Începe cu o rundă interview (5-8 întrebări) per regula
spec-first.

**Active milestone:** M5 Forum (walking skeleton complet, 9 sub-faze A-I; 5/9 done).

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

### M5 — Forum (active)

| Sub | Commit | Status | Notes |
|-----|--------|--------|-------|
| A   | `dcf95d0` | done | schema: forum_posts + likes + mentions + 3-way subscriptions + badges; 9 categorii seed |
| B   | `eb57245` | done | backend: 3 services (Categories/Threads/Posts) + 3 controllers (Public/Auth/Mod) |
| C   | `31b5b99` | done | site read pages: `/forum` index + `/forum/:category` listă + `/forum/:category/:slug` thread cu 2-level threading + sourceLink pentru system threads |
| D   | `b204883` | done | posting (new thread page + inline reply + general reply + edit window + delete) + `@mention` autocomplete (server parsing) + pending state UI + mention-search endpoint |
| E   | HEAD    | done | likes toggle + 4-level subscriptions (thread + category) + bell dropdown UI + auto-watch on reply + notification fan-out (mention > revista-author > thread-watcher) + `/cont/abonamente` |
| F   |  —      | **next** | badges cron + dashboard editor pentru badge definitions |
| F   |  —      | pending | badges cron + dashboard editor pentru badge definitions |
| G   |  —      | pending | moderation tools inline + `content_report` queue în dashboard |
| H   |  —      | pending | faceted search + anti-spam stack (honeypot + time-on-form + rate limit + first-post queue UI) |
| I   |  —      | pending | canonical gear thread (Tezaur toggle integration) |

## Conventions (recap from memory)

- **Spec-first:** rundă de 5-8 întrebări înainte de cod, plan aprobat, apoi implement.
- **Code în engleză, UI în română** (i18n strict).
- **Commit & push între sub-faze.** Ultimul pas în fiecare commit:
  bifează linia în acest fișier + actualizează "Next up".
- **Spec autoritativ:** `docs/spec/spec.md` (citează § când iei decizii).
- **Migrations:** drizzle-kit generează cu nume aleator — redenumesc manual la
  `<idx>_<descriptive>.sql` + actualizez `meta/_journal.json` ca să nu colidă
  prefixele.
