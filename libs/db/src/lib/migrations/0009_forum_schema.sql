CREATE TYPE "public"."forum_post_status" AS ENUM('approved', 'pending', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."forum_subscription_level" AS ENUM('watching', 'tracking', 'mentioned_only', 'muted');--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name_ro" text NOT NULL,
	"name_en" text NOT NULL,
	"category" text NOT NULL,
	"description_ro" text,
	"description_en" text,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_post_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"mentioned_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"parent_post_id" uuid,
	"author_id" uuid,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"top_level_seq" integer NOT NULL,
	"sub_seq" integer,
	"status" "forum_post_status" DEFAULT 'approved' NOT NULL,
	"edited_at" timestamp with time zone,
	"edited_by_user_id" uuid,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"hidden_by_user_id" uuid,
	"deleted_at" timestamp with time zone,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_vector" "tsvector"
);
--> statement-breakpoint
CREATE TABLE "user_category_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"level" "forum_subscription_level" DEFAULT 'watching' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_gear_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gear_id" uuid NOT NULL,
	"level" "forum_subscription_level" DEFAULT 'watching' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_thread_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"level" "forum_subscription_level" DEFAULT 'watching' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "post_approval_required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_post_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_threads" ADD COLUMN "pin_position" integer;--> statement-breakpoint
ALTER TABLE "forum_threads" ADD COLUMN "first_post_id" uuid;--> statement-breakpoint
ALTER TABLE "forum_post_likes" ADD CONSTRAINT "forum_post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_likes" ADD CONSTRAINT "forum_post_likes_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_mentions" ADD CONSTRAINT "forum_post_mentions_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_mentions" ADD CONSTRAINT "forum_post_mentions_mentioned_user_id_users_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_thread_id_forum_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_subscriptions" ADD CONSTRAINT "user_category_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_subscriptions" ADD CONSTRAINT "user_category_subscriptions_category_id_forum_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."forum_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gear_subscriptions" ADD CONSTRAINT "user_gear_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gear_subscriptions" ADD CONSTRAINT "user_gear_subscriptions_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_thread_subscriptions" ADD CONSTRAINT "user_thread_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_thread_subscriptions" ADD CONSTRAINT "user_thread_subscriptions_thread_id_forum_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "badges_key_unique" ON "badges" USING btree ("key");--> statement-breakpoint
CREATE INDEX "badges_category_position_idx" ON "badges" USING btree ("category","position");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_post_likes_user_post_unique" ON "forum_post_likes" USING btree ("user_id","post_id");--> statement-breakpoint
CREATE INDEX "forum_post_likes_post_idx" ON "forum_post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_post_mentions_post_user_unique" ON "forum_post_mentions" USING btree ("post_id","mentioned_user_id");--> statement-breakpoint
CREATE INDEX "forum_post_mentions_user_recent_idx" ON "forum_post_mentions" USING btree ("mentioned_user_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_posts_thread_seq_idx" ON "forum_posts" USING btree ("thread_id","top_level_seq","sub_seq");--> statement-breakpoint
CREATE INDEX "forum_posts_author_recent_idx" ON "forum_posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_posts_status_idx" ON "forum_posts" USING btree ("status","created_at") WHERE "forum_posts"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "forum_posts_parent_idx" ON "forum_posts" USING btree ("parent_post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_posts_thread_numbering_unique" ON "forum_posts" USING btree ("thread_id","top_level_seq","sub_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "user_category_subscriptions_user_category_unique" ON "user_category_subscriptions" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "user_category_subscriptions_category_idx" ON "user_category_subscriptions" USING btree ("category_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX "user_gear_subscriptions_user_gear_unique" ON "user_gear_subscriptions" USING btree ("user_id","gear_id");--> statement-breakpoint
CREATE INDEX "user_gear_subscriptions_gear_idx" ON "user_gear_subscriptions" USING btree ("gear_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX "user_thread_subscriptions_user_thread_unique" ON "user_thread_subscriptions" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX "user_thread_subscriptions_thread_idx" ON "user_thread_subscriptions" USING btree ("thread_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_threads_category_pin_slot_unique" ON "forum_threads" USING btree ("category_id","pin_position") WHERE "forum_threads"."pin_position" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_parent_post_id_fk" FOREIGN KEY ("parent_post_id") REFERENCES "public"."forum_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_first_post_id_fk" FOREIGN KEY ("first_post_id") REFERENCES "public"."forum_posts"("id") ON DELETE set null ON UPDATE no action;