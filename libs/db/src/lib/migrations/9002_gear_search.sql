-- Postflight: full-text search + trigram indexes on the Tezaur tables.
--
-- These run AFTER drizzle has created gear / gear_descriptions, since
-- they reference columns those tables define. The generated column
-- approach (rather than a trigger-maintained tsvector) keeps the search
-- vector in lock-step with the source row without an explicit hook.
--
-- All statements are idempotent — safe to re-run on every boot /
-- redeploy.
--
-- Naming: 9xxx prefix tells tools/scripts/migrate.ts to run AFTER
-- drizzle's tracked migrations.

-- ============================================================
-- gear.search_vector — generated column, romanian + unaccent.
-- ============================================================
-- The vector concatenates the high-signal text columns. We DON'T index
-- the JSONB specs here; spec.type is exposed as a separate filter.
-- Tags would be a future addition once the editorial tag table lands.
ALTER TABLE gear
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('sintezaur_ro', coalesce(brand, '')), 'A') ||
    setweight(to_tsvector('sintezaur_ro', coalesce(model, '')), 'A') ||
    setweight(to_tsvector('sintezaur_ro', coalesce(specs->>'type', '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS gear_search_vector_idx
  ON gear USING GIN (search_vector);

-- Trigram indexes for typo-tolerant ILIKE lookup on brand / model.
-- A query like `WHERE brand ILIKE '%mooog%'` falls back to similarity,
-- so "Mooog" matches "Moog".
CREATE INDEX IF NOT EXISTS gear_brand_trgm_idx
  ON gear USING GIN (lower(brand) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gear_model_trgm_idx
  ON gear USING GIN (lower(model) gin_trgm_ops);

-- ============================================================
-- gear_descriptions.search_vector — for searching editorial copy.
-- ============================================================
-- body_html holds pre-rendered HTML; strip tags before tokenizing.
-- We index per-locale; cross-locale search isn't a feature anyone
-- asked for, so callers filter `lang = 'ro'` (today the only locale).
ALTER TABLE gear_descriptions
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'sintezaur_ro',
      regexp_replace(coalesce(body_html, ''), '<[^>]+>', ' ', 'g')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS gear_descriptions_search_vector_idx
  ON gear_descriptions USING GIN (search_vector);

-- ============================================================
-- gear.specs JSONB containment index.
-- ============================================================
-- Powers per-category filter queries like
--   WHERE specs @> '{"type":"analog_poly"}'::jsonb
-- without a sequential scan on growing catalogs.
CREATE INDEX IF NOT EXISTS gear_specs_gin_idx
  ON gear USING GIN (specs jsonb_path_ops);

-- ============================================================
-- Username trigram (cross-cutting — used by @mention autocomplete
-- in M5 forum, but cheap enough to land here).
-- ============================================================
CREATE INDEX IF NOT EXISTS users_username_trgm_idx
  ON users USING GIN (lower(username) gin_trgm_ops);
