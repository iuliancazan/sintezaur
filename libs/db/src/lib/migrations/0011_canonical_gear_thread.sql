-- M5-I — reverse FK for the canonical-gear-thread feature (spec §8.1).
-- `forum_threads.canonical_for_gear_id` stores the gear this thread
-- was attached to via the editor toggle. Unique partial index so a
-- given gear can have only one canonical thread, but flipping OFF
-- leaves the row intact (replies preserved) — re-flipping ON reuses
-- the same thread instead of creating a new one.

ALTER TABLE "forum_threads"
  ADD COLUMN IF NOT EXISTS "canonical_for_gear_id" uuid;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "forum_threads_canonical_for_gear_unique"
  ON "forum_threads" ("canonical_for_gear_id")
  WHERE "canonical_for_gear_id" IS NOT NULL;
