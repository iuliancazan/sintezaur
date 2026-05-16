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
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS search_vector_en tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title_en, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt_en, '')), 'B') ||
    setweight(
      to_tsvector(
        'english',
        regexp_replace(coalesce(body_html_en, ''), '<[^>]+>', ' ', 'g')
      ),
      'C'
    ) ||
    setweight(
      to_tsvector('english', array_to_string(coalesce(tags, '{}'::text[]), ' ')),
      'D'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_vector_en_idx
  ON articles USING GIN (search_vector_en);
