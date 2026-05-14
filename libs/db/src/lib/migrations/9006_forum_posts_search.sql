-- Postflight: full-text search vector for forum_posts.
--
-- Mirrors the articles/listings/gear pattern (9002/9003/9004). HTML is
-- stripped before to_tsvector to avoid matching tag soup. Idempotent.

ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(
      to_tsvector(
        'sintezaur_ro',
        regexp_replace(coalesce(body_html, ''), '<[^>]+>', ' ', 'g')
      ),
      'B'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS forum_posts_search_vector_idx
  ON forum_posts USING GIN (search_vector);
