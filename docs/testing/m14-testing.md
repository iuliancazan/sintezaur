# M14 — manual testing plan

Bazar V07 sell page + light-mode default. Test against the
deployed stack on `https://sintezaur.ro` after Coolify finishes
redeploying `main`. Sign in as a regular member account (no
admin/curator role needed) unless a section says otherwise.

## 1. Backend & schema foundation

Run these probes against the database (Coolify → Postgres
service → Console) and the API.

1. **Migration applied:**

   ```sql
   SELECT column_name, data_type, character_maximum_length
   FROM information_schema.columns
   WHERE table_name = 'listings'
     AND column_name IN ('tagline', 'defects');
   ```

   Expect 2 rows: `tagline` (`character varying`, length 200) and
   `defects` (`text`, length NULL).

2. **Journal updated:** `\dt drizzle.__drizzle_migrations` and
   `SELECT tag FROM drizzle.__drizzle_migrations ORDER BY id DESC
   LIMIT 5;` — `0015_listing_tagline_defects` is the head row.

3. **Draft create endpoint:** with a valid auth cookie:

   ```bash
   curl -X POST https://sintezaur.ro/api/me/bazar/listings/draft \
     -H 'content-type: application/json' \
     -b cookies.txt -d '{}'
   ```

   Expect `201` with `{ id, slug }`. The slug starts with `draft-`
   plus a random tail. `SELECT status, title, price, expires_at
   FROM listings WHERE id = '<id>'` — `status='draft'`, title is
   `'Draft anunț'`, `price='0.00'`, `expires_at IS NULL`.

4. **Update accepted on a draft:**

   ```bash
   curl -X PATCH https://sintezaur.ro/api/me/bazar/listings/<id> \
     -H 'content-type: application/json' \
     -b cookies.txt \
     -d '{"title":"Test","price":3800,"location":"București",
          "condition":"very_good","kind":"sell","delivery":"both",
          "currency":"ron","acceptsOffers":true,
          "description":{"type":"doc","content":[]}}'
   ```

   Expect `200 { id, slug }`. Re-query — fields updated, status
   still `'draft'`.

5. **Publish requires complete data:**

   ```bash
   # On a draft missing rawMake/rawModel and gearId:
   curl -X POST https://sintezaur.ro/api/me/bazar/listings/<id>/publish \
     -b cookies.txt
   ```

   Expect `409` with body `{ "message": "Draft is not ready to
   publish.", "missing": ["gear_or_raw_make_model", ...] }`. Fill
   the missing fields via PATCH, re-call publish — expect `200`
   `{ id, slug }` with `slug` re-slugged from brand+model+title
   (no `draft-` prefix), `status='active'`, `expires_at = now() +
   90 days`.

6. **Draft slug is private:**

   ```bash
   curl https://sintezaur.ro/api/bazar/<draft-slug>
   ```

   Anonymous: `404`. Logged in as another user: `404`. Logged in
   as the owner: `200` with the draft body.

7. **Owner fetch by id:** `GET /api/me/bazar/listings/<id>` —
   `200` for owner, `403` for someone else's listing, `404` if
   removed.

## 2. V07 sell page — happy path (UI smoke)

Sign in as a regular member. Open `/bazar` and click "Vinde un
produs" (existing CTA). You should land on `/bazar/nou`.

1. **Header & steps:** 4-step progress bar visible
   (Identificare / Imagini & condiție / Preț & livrare /
   Publică). Step 01 is current (no done ticks yet). Header lede
   mentions 90 days + no commission + no mediation.

2. **Tezaur lookup:** type "Roland" into the search input
   (combobox). After ~250ms a dropdown with hits opens. Click
   one — the search box collapses, a blue-tinted `bz-add-link`
   banner appears showing the picked entry with "Schimbă"
   button. The free-text Brand/Model/Year fields disappear.

3. **Schimbă:** click "Schimbă" — banner gone, search input
   back, free-text fields visible again.

4. **Free-text fallback:** without selecting a Tezaur entry,
   type Brand + Model. The progress meter ticks "Brand & model"
   green.

5. **Title + tagline + description:** type a title (≥3 chars),
   tagline, and a ≥80 character description. Live preview card
   on the right reflects model + tagline + condition.
   Description counter ticks live (`<n> / 8 000 caractere`).
   Progress meter: "Titlu listing" and "Descriere" both green.

6. **Condition radio:** click each of the 5 cards (Ca nou →
   Piese). The accent border + background highlights the chosen
   card. The live preview's `.listing__chip` reflects the label.

7. **Defects textarea:** type an optional note. No checklist
   item — it's a soft hint per the design.

8. **Price input:** type 3800 into the big display field. The
   right cell shows "≈ 765 € · curs 4.97". Click the middle cell
   ("RON · LEI") — currency flips to EUR, the conversion swaps
   ("≈ 18 886 RON" approx). Negociabil toggle on by default.

9. **Kind cards:** select "Schimb" → the "Ce caut la schimb"
   textarea appears below the cards. Type 5+ chars; the
   "Kind tranzacție" checklist row goes green. Switch back to
   "Vând" — the textarea hides; the row stays green (sell case).

10. **Delivery cards:** select "Doar livrare" → cost input +
    carrier chip-grid appear. Toggle 2–3 carriers; their chips
    light up with the accent fill. Switch to "Doar ridicare" —
    cost + carriers hide.

11. **Location:** type a city; live preview's location pin
    updates. Progress hits "Locație" green.

12. **Contact phone:** optional; type a number to verify it
    survives auto-save.

13. **Sidebar — progress meter:** as more checklist items go
    green, the meter % grows. Save status pill cycles
    `se salvează` → `salvat`.

14. **CTAs:** the primary "Publică listing →" disables until
    all 8 checklist items are green. "Salvează ca draft" is
    always enabled (manual save bypass). "Previzualizează ca
    vizitator" opens `/bazar/<slug>` in a new tab. "Renunță &
    întoarce-te" prompts and soft-deletes the draft.

## 3. Auto-save & resume

1. On a fresh `/bazar/nou`, type something into Title. After
   ~1.5s the save-status pill shows `salvat`. URL changes
   silently to `/bazar/nou?listing=<uuid>` (via
   `history.replaceState` — no nav). Browser back/forward
   doesn't move you off the page.

2. Refresh the page (F5). The page loads the draft from
   `?listing=<id>`, every field rehydrated (title, tagline,
   description, condition, price, kind, delivery, carriers,
   location, phone). Save status starts as `salvat`.

3. Open the same URL in a second tab — both tabs read the
   same draft. Editing in tab A and refreshing tab B picks up
   tab A's changes (last-write-wins; no real-time sync, just
   verifying the persistence).

4. Discard: click "Renunță & întoarce-te" → confirm prompt →
   navigate to `/bazar`. Re-visit the old `?listing=<id>` URL
   — expect 404/empty (the draft is soft-deleted).

## 4. Photos + drag-reorder

1. Drag 3–5 JPEGs onto the `.ta-drop` zone. Each appears as a
   tile in `.ta-imgs` (first tile shows "cover" overlay).
   Upload also works via the `+` tile (file picker).

2. Drag tile #3 in front of tile #1. The order updates locally
   and persists (verify by refreshing — order survives).

3. Click the `×` button on a tile — tile removed; gallery
   re-renumbers.

4. Try a 13th upload — banner-style error: "Maxim 12
   fotografii per anunț." Existing 12 stay.

5. Try a >8 MB file — error per file: "Upload eșuat pentru …".

## 5. Publish & validation

1. **Incomplete publish:** start a draft, fill only title (no
   gear, no price). Click "Publică listing →". With the
   button being disabled by the checklist, you shouldn't be
   able to click; force-enable by completing 7/8 items and
   leaving one out, then submit — sidebar shows red error
   "Draftul nu e gata — completează câmpurile lipsă." with a
   bullet list of the missing labels (from
   `bazar.form.missing.*`).

2. **Successful publish:** fill all 8 checklist items, click
   "Publică listing →" — the page navigates to `/bazar/<slug>`
   (the new active listing). Verify in DB:
   `SELECT status, slug, expires_at, tagline, defects FROM
   listings WHERE id = '<id>'`. `status='active'`, slug
   derived from brand+model+title (no `draft-` prefix),
   `expires_at` set 90 days out, `tagline` and `defects`
   persisted.

3. **Edit after publish:** open `/bazar/<slug>/editare` — the
   page loads the active listing in the same V07 form. Auto-
   save still works (PATCH path). The "Publică" CTA is
   greyed out (status no longer `draft`).

## 6. Light-mode default + regression

1. **Fresh user (clear localStorage):**
   `localStorage.removeItem('sintezaur:theme')` in DevTools →
   refresh. The site loads in light mode (`<html data-theme="light">`).

2. **Theme cycle:** click the topbar sun/moon/auto button.
   Order: light → auto → dark → light. Each selection sticks
   across refresh.

3. **Explicit auto:** pick `auto` then refresh — page reads
   the saved `'auto'` value and resolves to the OS theme
   (verify by toggling OS theme and watching `<html
   data-theme>` flip live in DevTools).

4. **Backwards compat with stored 'dark' or 'light':** set
   `localStorage.setItem('sintezaur:theme', 'dark')` then
   refresh — site loads in dark. Same for `'light'`.

5. **Regression checks:**

   - `/bazar` listing still shows only `status='active'` rows
     (no drafts leak in).
   - Existing listing detail pages render correctly in both
     light and dark themes.
   - Tezaur "Adaugă în Tezaur" (M11) still functional; its
     CSS was renamed (`v06-tezaur-add.css` →
     `v06-add-forms.css`) so verify all `.ta-*` styles render
     intact.
   - Light-mode read of older listings detail page — colors
     readable, no contrast regressions.
   - Theme toggle visible in topbar across all pages.

## Known limitations / out of scope

The V07 mockup shows several "nice-to-have" widgets that
intentionally stay UI-stub or skip in M14 (per the spec
interview answers locking schema to minimal extras only):

- Price intelligence sidebar block ("Mediu RO / Preț tău /
  Δ%") — not wired; would need a per-gear price-stats endpoint.
- "Preț minim acceptat" + "Refuz oferte sub" inputs — not in
  the schema; the existing `acceptsOffers` boolean is the only
  negotiation control.
- Payment-methods chip grid (cash / OP / Revolut / card /
  PayPal / crypto / rate) — UI-only, no backend storage.
- "Doar în România?" toggle, "Sector / cartier" + "Punct de
  întâlnire" inputs, "Cine plăteste livrarea" select, "Timp
  răspuns așteptat" select, "Arată număr telefon" toggle —
  scope frozen out; future iteration can land these as one
  block on the same schema or a `listings_meta` JSONB column.
- Live FX rate — hardcoded `1 EUR = 4.97 RON` per the mockup;
  BNR live rate is M9-C's `currency_rates` table but the form
  doesn't read from it yet.
- Tagline appears in the live preview but doesn't yet render
  on the public listing detail page — backend column is now
  populated; detail-page render is a separate polish pass.
