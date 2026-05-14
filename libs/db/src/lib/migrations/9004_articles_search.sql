-- Postflight: full-text search vector for articles.
--
-- Same pattern as gear (9002) and listings (9003) — a STORED generated
-- tsvector kept in lock-step with the row. Idempotent: safe on every boot.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('sintezaur_ro', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('sintezaur_ro', coalesce(excerpt, '')), 'B') ||
    setweight(
      to_tsvector(
        'sintezaur_ro',
        regexp_replace(coalesce(body_html, ''), '<[^>]+>', ' ', 'g')
      ),
      'C'
    ) ||
    setweight(
      to_tsvector('sintezaur_ro', array_to_string(coalesce(tags, '{}'::text[]), ' ')),
      'D'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_vector_idx
  ON articles USING GIN (search_vector);
