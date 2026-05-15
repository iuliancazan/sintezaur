-- ============================================================
-- M8: add `users.collection_public` for the public/private collection
-- toggle promised in spec §11 (MVP foundation).
--
-- Default `true` so existing users stay opted-in (no surprise after
-- deploy — public author profiles continue showing the collection
-- panel). Users can opt out from /cont/profil.
-- ============================================================

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "collection_public" boolean NOT NULL DEFAULT true;
