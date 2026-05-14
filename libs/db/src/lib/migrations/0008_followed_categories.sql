CREATE TABLE "user_followed_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "article_category" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_followed_categories" ADD CONSTRAINT "user_followed_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_followed_categories_user_category_unique" ON "user_followed_categories" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "user_followed_categories_category_idx" ON "user_followed_categories" USING btree ("category");