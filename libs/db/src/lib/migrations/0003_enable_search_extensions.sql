-- Preflight: search extensions + Romanian text-search configuration.
--
-- pg_trgm   — trigram similarity for typo-tolerant brand / model lookup.
--             Used by `pg_trgm`-based GIN indexes on gear.brand /
--             gear.model and on `user.username` (per spec §9 indexing
--             strategy).
--
-- unaccent  — strips diacritics for slug / search normalization.
--             Combined with the romanian text-search config below so
--             a query for "tehnica" matches stored "tehnică".
--
-- Romanian TSConfig — Postgres' built-in `romanian` snowball stemmer
--             plus an `unaccent` filter on top. The naming
--             "sintezaur_ro" makes it easy to swap in a hand-tuned
--             dictionary later without touching every tsvector.
--
-- Idempotent: re-creating the config raises if it already exists, so we
-- guard with a DO block + pg_ts_config catalog check.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'sintezaur_ro'
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION sintezaur_ro (COPY = romanian);
    ALTER TEXT SEARCH CONFIGURATION sintezaur_ro
      ALTER MAPPING FOR hword, hword_part, word
      WITH unaccent, romanian_stem;
  END IF;
END $$;
