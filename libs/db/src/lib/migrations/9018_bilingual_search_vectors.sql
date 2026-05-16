-- M16-I postflight: bilingual full-text search vectors.
--
-- Articles get a second STORED tsvector that mirrors `search_vector`
-- but pulls from the EN columns and uses Postgres's built-in
-- `english` text-search config (instead of `sintezaur_ro`). Articles
-- without EN content produce an empty vector — search matches against
-- it are no-ops, which is the desired behaviour.
--
-- Gear catalog rows stay with a single RO vector for brand/model
-- (universal across locales) — the per-locale editorial body lives
-- in `gear_descriptions`, where the existing vector already keys on
-- `lang`. Switching to per-locale text-search configs there would
-- require dropping and re-adding the generated column with a CASE
-- expression on `lang`; deferred until EN gear descriptions are
-- actually being populated en masse.
--
-- IMMUTABILITY WRAPPER: Postgres marks `to_tsvector(regconfig, text)`
-- as STABLE, which is rejected by the strict immutability check on
-- `GENERATED ... STORED` columns. We wrap the expression in an SQL
-- function explicitly marked IMMUTABLE — we own the guarantee:
-- `english` is a built-in regconfig that doesn't change at runtime.
-- (The older `9004_articles_search.sql` predates this strictness and
-- relies on the same `to_tsvector` being accepted; on a fresh apply
-- of this newer migration the check fires, so we go through a
-- wrapper here.)
--
-- Idempotent: CREATE OR REPLACE FUNCTION + ADD COLUMN IF NOT EXISTS
-- + CREATE INDEX IF NOT EXISTS.

CREATE OR REPLACE FUNCTION articles_build_search_vector_en(
  p_title text,
  p_excerpt text,
  p_body_html text,
  p_tags text[]
) RETURNS tsvector AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_excerpt, '')), 'B') ||
    setweight(
      to_tsvector(
        'english',
        regexp_replace(coalesce(p_body_html, ''), '<[^>]+>', ' ', 'g')
      ),
      'C'
    ) ||
    setweight(
      to_tsvector('english', array_to_string(coalesce(p_tags, '{}'::text[]), ' ')),
      'D'
    )
$$ LANGUAGE SQL IMMUTABLE;

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS search_vector_en tsvector
  GENERATED ALWAYS AS (
    articles_build_search_vector_en(title_en, excerpt_en, body_html_en, tags)
  ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_vector_en_idx
  ON articles USING GIN (search_vector_en);
