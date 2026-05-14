-- Spec §7.2 v2: roles become multi-valued. Drop `users.role`; introduce
-- `user_roles` join table; add `contributor`, `curator`, `superadmin`.
--
-- Backfill rule: every existing row in `users` (including soft-deleted —
-- preserves audit history if they're ever restored) gets one row in
-- `user_roles` matching its current `users.role`. **No automatic
-- superadmin grant.** Operators run `seed:superadmin` after the
-- migration to grant `superadmin` to the bootstrap user explicitly.

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'contributor' BEFORE 'editor';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'curator' BEFORE 'editor';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'superadmin';--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
INSERT INTO "user_roles" ("user_id", "role", "granted_at", "granted_by")
SELECT "id", "role", COALESCE("created_at", now()), NULL FROM "users";--> statement-breakpoint
DROP INDEX IF EXISTS "users_role_idx";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";
