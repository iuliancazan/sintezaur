-- ============================================================
-- M7-A: Seed default storage limits per execution-plan §M7.
--
-- Values match the spec's "Limits (initial seed)" table:
--   Image (any module)               8  MB
--   Audio (forum / tezaur / bazar)  10  MB
--   Audio (revista)                 20  MB
--   PDF (any module)                10  MB
--   ZIP (any module)                20  MB
--   Per-user daily cap              50  MB
--   Per-user lifetime alert       1024  MB  (= 1 GiB)
--
-- `ON CONFLICT DO NOTHING` keeps the seed idempotent — admins can
-- edit values via /admin/storage Limits tab afterwards without
-- having the seed re-overwrite their changes.
-- ============================================================

INSERT INTO storage_limits (scope, file_type, module, max_bytes)
VALUES
  -- per-file image cap, all modules
  ('per_file', 'image', '*',       8 * 1024 * 1024),

  -- per-file audio cap — Revista gets a higher ceiling than the rest
  ('per_file', 'audio', 'forum',  10 * 1024 * 1024),
  ('per_file', 'audio', 'tezaur', 10 * 1024 * 1024),
  ('per_file', 'audio', 'bazar',  10 * 1024 * 1024),
  ('per_file', 'audio', 'revista',20 * 1024 * 1024),

  -- per-file PDF + ZIP caps, all modules
  ('per_file', 'pdf',   '*',      10 * 1024 * 1024),
  ('per_file', 'zip',   '*',      20 * 1024 * 1024),

  -- per-user rolling-day cap (any type, any module)
  ('per_user_daily',           '*', '*',    50 * 1024 * 1024),

  -- per-user lifetime alert (any type, any module)
  ('per_user_lifetime_alert',  '*', '*', 1024 * 1024 * 1024)
ON CONFLICT (scope, file_type, module) DO NOTHING;
