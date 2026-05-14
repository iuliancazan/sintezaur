-- Postflight: case-insensitive uniqueness on users.email + users.username.
--
-- The plain UNIQUE indexes drizzle generates only protect against
-- case-exact duplicates ("Iulian@x.com" vs "iulian@x.com" can both
-- exist). The expression-on-lower() indexes below close that gap so
-- the application layer can match by lower(email) safely.
--
-- drizzle-kit doesn't emit expression indexes, so this lives in a
-- hand-written postflight (9xxx prefix → runs AFTER the drizzle pass).
--
-- Both are partial: only enforced for non-soft-deleted rows. That lets
-- a deleted user free up their email/username for reuse.

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON "users" (lower("email"))
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON "users" (lower("username"))
  WHERE "deleted_at" IS NULL;
