-- Preflight: required Postgres extensions.
--
-- pgcrypto provides gen_random_uuid() used as the default for every
-- uuid primary key in the schema (drizzle's .defaultRandom() compiles
-- to gen_random_uuid()). Without this, the first INSERT fails at
-- runtime with "function gen_random_uuid() does not exist".
--
-- IF NOT EXISTS keeps this idempotent on re-runs and on Coolify
-- redeploys. Safe to run on every boot.
--
-- Naming: 0xxx prefix tells tools/scripts/migrate.ts to run this BEFORE
-- the drizzle-tracked migrations (which are in meta/_journal.json).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
