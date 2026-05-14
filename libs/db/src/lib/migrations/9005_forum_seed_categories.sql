-- Postflight: seed the forum_categories table with the M4-minimum
-- system categories required by spec §8.4.
--
-- M4 only needs `discutii_articole` (article auto-threads). The two
-- other system categories — canonical gear threads and admin
-- announcements — land in M5 when forum opens for posting.
--
-- M5 will add the user-facing categories (Tezaur — Întrebări,
-- Producție, etc.) via its own postflight script.

INSERT INTO forum_categories (key, slug, name, description, kind, position)
VALUES (
  'discutii_articole',
  'discutii-articole',
  'Discuții articole',
  'Discuții auto-create pentru fiecare articol Revista publicat.',
  'system',
  900
)
ON CONFLICT (key) DO NOTHING;
