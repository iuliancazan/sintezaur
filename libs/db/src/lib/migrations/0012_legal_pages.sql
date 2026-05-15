-- M6-A — legal pages + contact form + feedback placeholder.
-- Schema only; seed inserts land in 9009_legal_pages_seed.sql (postflight,
-- idempotent on slug). Feedback enums declared here so the schema is
-- complete when M6-D wires the actual feedback table.

CREATE TYPE "public"."contact_message_category" AS ENUM('cumparator', 'vanzator', 'editor', 'juridic', 'altele');--> statement-breakpoint
CREATE TYPE "public"."contact_message_status" AS ENUM('new', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_feedback_kind" AS ENUM('bug', 'sugestie', 'altele');--> statement-breakpoint
CREATE TYPE "public"."user_feedback_status" AS ENUM('new', 'read', 'archived');--> statement-breakpoint

CREATE TABLE "legal_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body_md" text NOT NULL,
	"meta_description" text,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"category" "contact_message_category" NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "contact_message_status" DEFAULT 'new' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"read_by_user_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "legal_pages" ADD CONSTRAINT "legal_pages_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_read_by_user_id_users_id_fk" FOREIGN KEY ("read_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "legal_pages_slug_unique" ON "legal_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_category_idx" ON "contact_messages" USING btree ("category","created_at");
