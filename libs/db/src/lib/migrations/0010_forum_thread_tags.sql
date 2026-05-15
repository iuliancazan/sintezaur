-- M5-H — add tag arrays + GIN indexes on forum_threads.
-- `tags`     : free-text per spec §8.4 thread features.
-- `gear_tag` : structured FK-app-side to gear.id for "filter threads
--              referencing the Korg MS-20" facet in /forum/cautare.
--
-- Defaults set so existing rows don't fail NOT NULL (empty arrays).

ALTER TABLE "forum_threads"
  ADD COLUMN IF NOT EXISTS "tags" text[] NOT NULL DEFAULT ARRAY[]::text[];
--> statement-breakpoint
ALTER TABLE "forum_threads"
  ADD COLUMN IF NOT EXISTS "gear_tag" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "forum_threads_tags_gin_idx"
  ON "forum_threads" USING GIN ("tags");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forum_threads_gear_tag_gin_idx"
  ON "forum_threads" USING GIN ("gear_tag");
