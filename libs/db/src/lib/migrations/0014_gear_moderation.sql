-- M11-A — moderation lifecycle for community Tezaur contributions
-- (spec §7.2). Adds `gear_state` enum + tracking columns so any
-- authenticated user can submit a new gear row and a curator can
-- approve/reject it from the dashboard.
--
-- Backward compatibility: `published` boolean stays. `approved` ⇒
-- `published = true`; the service layer keeps them in sync.

CREATE TYPE "public"."gear_state" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint

ALTER TABLE "gear" ADD COLUMN "state" "gear_state" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "gear" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "gear" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gear" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gear" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "gear" ADD CONSTRAINT "gear_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Backfill: existing rows that were published prior to the state
-- column are by definition `approved` (a curator green-lit them);
-- everything else (un-published rows, including in-progress admin
-- drafts) stays at the new default `draft`.
UPDATE "gear" SET "state" = 'approved', "reviewed_at" = "updated_at" WHERE "published" = true;--> statement-breakpoint

CREATE INDEX "gear_state_idx" ON "gear" USING btree ("state", "submitted_at");--> statement-breakpoint
CREATE INDEX "gear_created_by_state_idx" ON "gear" USING btree ("created_by", "state");
