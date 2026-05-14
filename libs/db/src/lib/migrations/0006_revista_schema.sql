CREATE TYPE "public"."article_category" AS ENUM('reviews', 'tutorials', 'news', 'interviews', 'buying_guides', 'hardware_deep_dives');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."forum_category_kind" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TABLE "forum_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "forum_category_kind" DEFAULT 'user' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"last_post_at" timestamp with time zone,
	"pinned_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_gear" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"gear_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"variant" "image_variant" NOT NULL,
	"path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime_type" text NOT NULL,
	"caption" text,
	"position" integer DEFAULT 0 NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"category" "article_category" NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"hero_source_id" uuid,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"thread_id" uuid,
	"is_premium" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_vector" "tsvector"
);
--> statement-breakpoint
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_category_id_forum_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."forum_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_gear" ADD CONSTRAINT "article_gear_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_gear" ADD CONSTRAINT "article_gear_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_images" ADD CONSTRAINT "article_images_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "forum_categories_key_unique" ON "forum_categories" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_categories_slug_unique" ON "forum_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "forum_categories_kind_position_idx" ON "forum_categories" USING btree ("kind","position");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_threads_slug_unique" ON "forum_threads" USING btree ("slug") WHERE "forum_threads"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "forum_threads_category_recent_idx" ON "forum_threads" USING btree ("category_id","last_post_at");--> statement-breakpoint
CREATE INDEX "forum_threads_author_idx" ON "forum_threads" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "article_gear_pair_unique" ON "article_gear" USING btree ("article_id","gear_id");--> statement-breakpoint
CREATE INDEX "article_gear_article_idx" ON "article_gear" USING btree ("article_id","position");--> statement-breakpoint
CREATE INDEX "article_gear_gear_idx" ON "article_gear" USING btree ("gear_id");--> statement-breakpoint
CREATE UNIQUE INDEX "article_images_source_variant_unique" ON "article_images" USING btree ("source_id","variant");--> statement-breakpoint
CREATE INDEX "article_images_article_idx" ON "article_images" USING btree ("article_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_unique" ON "articles" USING btree ("slug") WHERE "articles"."status" <> 'archived';--> statement-breakpoint
CREATE INDEX "articles_status_published_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_author_status_idx" ON "articles" USING btree ("author_id","status");--> statement-breakpoint
CREATE INDEX "articles_category_published_idx" ON "articles" USING btree ("category","published_at");