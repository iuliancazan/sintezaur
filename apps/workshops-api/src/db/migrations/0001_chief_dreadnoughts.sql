CREATE TABLE "workshop_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"username" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workshop_accounts" ADD CONSTRAINT "workshop_accounts_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_accounts_workshop_username_idx" ON "workshop_accounts" USING btree ("workshop_id","username");--> statement-breakpoint
INSERT INTO "workshop_accounts" ("workshop_id", "username", "role", "password_hash")
SELECT "id", 'guest', 'guest', "guest_password_hash" FROM "workshops" WHERE "guest_password_hash" IS NOT NULL;--> statement-breakpoint
INSERT INTO "workshop_accounts" ("workshop_id", "username", "role", "password_hash")
SELECT "id", 'admin', 'admin', "admin_password_hash" FROM "workshops" WHERE "admin_password_hash" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "workshops" DROP COLUMN "guest_password_hash";--> statement-breakpoint
ALTER TABLE "workshops" DROP COLUMN "admin_password_hash";