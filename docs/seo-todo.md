# SEO — known limitations & post-M6-B TODO

M6-B ships the **medium SEO tier** per the M6 interview (`docs/STATUS.md`):
title + description + OG + Twitter cards + JSON-LD + sitemap.xml. This
file tracks everything that's been *deliberately deferred* and the
conditions under which we revisit each item.

## When to revisit

Trigger: first time Google Search Console reports a meaningful crawl
volume (rough threshold: ≥500 unique URLs indexed, ≥200 organic
clicks/week). Until then, the items below are not worth the engineering
cost.

## Deferred — server-side rendering (SSR)

**State:** site is a pure Angular SPA. Meta tags + JSON-LD are set
client-side via `SeoService`. Modern Google + Bing crawlers execute
JavaScript and do pick these up, but:

- First-paint HTML contains a generic title/description (no per-page
  signal until JS runs)
- Slower crawler re-rendering pipeline (Googlebot's "deferred render"
  queue) — pages can take days/weeks to reflect meta changes
- Social-preview crawlers (Facebook, Twitter, LinkedIn, WhatsApp,
  Telegram, Slack) **do not execute JS**. Sharing any link currently
  produces the homepage OG image + title, not the per-page one.

**Fix:** add SSR. Two options:

1. **Analog** — already mentioned in spec §5; would integrate with the
   existing Angular workspace, supports per-route metadata via Angular
   Universal under the hood.
2. **Pre-render** the public pages (tezaur, revista, forum) at build
   time + revalidate on a cron. Simpler, no live SSR server, works for
   the heavy-read pages.

**Estimated effort:** 1–2 sub-phases. Block: needs a decision on Node
runtime topology (one server vs. SSR worker behind Coolify).

## Deferred — `slug_redirect` verify on Articles + Forum threads

**State:** the `slug_redirects` table exists (M2, `0002_tezaur_schema.sql`)
and is wired for Tezaur gear (`apps/api/src/app/tezaur/tezaur.service.ts`
queries it when a gear is renamed). **Articles + forum threads do NOT
write to or read from it** — renaming an article or thread silently
breaks any external link / Google index entry for the old slug.

**Fix:**

- `apps/api/src/app/revista/articles.service.ts` `updateArticle()`:
  when `slug` changes, insert a row in `slug_redirects` with
  `target_type='article'`, `target_id=articleId`, `old_slug`,
  `new_slug`, `expires_at = now() + 30 days`.
- Same in `forum-threads.service.ts` `updateThread()` for thread slugs.
- Add `Public()` resolver in `articles.controller.ts` /
  `public-forum.controller.ts` that hits `slug_redirects` on 404 and
  returns `{ redirectTo: '/revista/<new-slug>' }` (frontend already
  knows how to follow this — see Tezaur 404 handler in
  `tezaur-detail.page.ts`).

**Estimated effort:** half a sub-phase. Cheap if done with the next
edit-flow pass.

## Deferred — `410 Gone` after redirect expiry

**State:** when a `slug_redirects` row hits `expires_at`, nothing
happens — the row stays in the table, the API returns 404. The spec
(§7.13) calls for `410 Gone` on expired URLs so search engines
**actively drop** them from the index (404 is read as "probably
temporary").

**Fix:**

- API: when a `/api/{tezaur,revista,forum}/...:slug` resolver fails to
  find the slug, check `slug_redirects` for ANY row matching
  `(target_type, old_slug)` regardless of `expires_at`. If found and
  not expired → return 301 metadata (already done for Tezaur). If
  found and expired → return HTTP 410 with `{ gone: true }` in the
  body.
- Frontend: 404 page (M6-C) needs a "this page used to exist but is
  gone for good" variant when the response status is 410.
- Cron: nightly job to archive expired rows (move to
  `slug_redirects_archive` or just mark with `archived_at` so the
  410 lookup stays fast).

**Estimated effort:** half a sub-phase.

## Deferred — image OG default

`SeoService.DEFAULT_OG_IMAGE = '/assets/branding/og-default.png'` is
referenced but the asset doesn't exist yet. Need a 1200×630 brand
image (logo + wordmark on a dark background). When missing, Facebook
shows a small generic preview; not catastrophic but worth fixing
before any campaign-driven traffic.

**Fix:** drop the file in `apps/site/public/assets/branding/og-default.png`.
Same for `/assets/branding/logo.png` referenced in the Article JSON-LD
publisher block.

## Deferred — `hreflang` + EN version

Spec §12 mentions an "English-language sister platform" as post-MVP.
When that lands, add `<link rel="alternate" hreflang="..." href="...">`
tags via `SeoService` and an `inLanguage` array on the WebSite
JSON-LD. Not actionable now — placeholder.

## Deferred — sitemap index + per-section sitemaps

Current sitemap is a single file at `/sitemap.xml`. When URL count
crosses ~25,000 or filesize crosses ~10MB, split into:

- `/sitemap.xml` (index) → references
- `/sitemap-tezaur.xml`
- `/sitemap-bazar.xml`
- `/sitemap-revista.xml`
- `/sitemap-forum.xml`
- `/sitemap-static.xml`

Sitemap protocol allows up to 50,000 URLs per file and 50MB compressed;
the index format is essentially the same. Not actionable until growth.

## Deferred — schema.org coverage gaps

- **BreadcrumbList** on detail pages (Tezaur, Bazar, Revista, Forum).
  Cheap to add, mild SEO value, lands in the next pass.
- **Review** items on Tezaur detail — the gear reviews exist in DB but
  we only push `AggregateRating` to JSON-LD. Full `Review` objects per
  reviewer would unlock review snippets in SERPs.
- **FAQPage** on `regulament-forum` if the body grows long enough to
  justify structured Q&A.
- **Organization** + **WebSite** with `SearchAction` on the homepage —
  enables a Google sitelinks search box. Worth adding to homepage's
  WebSite JSON-LD.

## Notes for the next session

When resuming this list:

1. Spin the API + site dev servers (`nx serve api`, `nx serve site`).
2. View any public detail page in the browser and confirm
   `<head>` includes `<meta property="og:title" ...>`, `<link
   rel="canonical" ...>`, and the JSON-LD `<script id="sintezaur-jsonld">`.
3. Run `curl http://localhost:3000/sitemap.xml | grep -c "<url>"` —
   baseline at M6-B ship: 129 URLs.
4. The 1-hour sitemap cache invalidates on API restart; that's fine in
   dev. In prod, force-refresh by restarting the API container.
