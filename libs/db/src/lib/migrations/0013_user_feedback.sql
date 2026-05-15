CREATE TABLE "user_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "user_feedback_kind" NOT NULL,
	"body" text NOT NULL,
	"page_url" text,
	"user_agent" text,
	"ip_address" text,
	"status" "user_feedback_status" DEFAULT 'new' NOT NULL,
	"read_by_user_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_read_by_user_id_users_id_fk" FOREIGN KEY ("read_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_feedback_status_idx" ON "user_feedback" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "user_feedback_kind_idx" ON "user_feedback" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "user_feedback_user_idx" ON "user_feedback" USING btree ("user_id","created_at");