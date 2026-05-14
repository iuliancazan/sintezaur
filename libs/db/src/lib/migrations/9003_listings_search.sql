-- Postflight: full-text search vector + trigram indexes for listings.
--
-- Same pattern as gear (see 9002_gear_search.sql): a STORED generated
-- tsvector keeps the search vector in lock-step with the row, no
-- service-side trigger needed.
--
-- All statements idempotent — safe on every boot.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('sintezaur_ro', coalesce(title, '')), 'A') ||
    setweight(
      to_tsvector(
        'sintezaur_ro',
        regexp_replace(coalesce(description_html, ''), '<[^>]+>', ' ', 'g')
      ),
      'B'
    ) ||
    setweight(to_tsvector('sintezaur_ro', coalesce(raw_make, '')), 'C') ||
    setweight(to_tsvector('sintezaur_ro', coalesce(raw_model, '')), 'C') ||
    setweight(to_tsvector('sintezaur_ro', coalesce(location, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS listings_search_vector_idx
  ON listings USING GIN (search_vector);

-- Trigram on city — UI offers RO city autocomplete + typo-tolerant
-- "Bucureti" → "București".
CREATE INDEX IF NOT EXISTS listings_location_trgm_idx
  ON listings USING GIN (lower(location) gin_trgm_ops);
