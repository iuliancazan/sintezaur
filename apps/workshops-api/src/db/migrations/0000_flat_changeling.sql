CREATE TABLE "access_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid,
	"visitor_id" uuid,
	"role" text NOT NULL,
	"event" text NOT NULL,
	"document" text,
	"lang" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_en" text NOT NULL,
	"title_ro" text NOT NULL,
	"subtitle_en" text,
	"subtitle_ro" text,
	"event_date" date,
	"venue" text,
	"published" boolean DEFAULT false NOT NULL,
	"guest_sees_slides" boolean DEFAULT false NOT NULL,
	"guest_password_hash" text,
	"admin_password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workshops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_events_workshop_created_idx" ON "access_events" USING btree ("workshop_id","created_at");