CREATE TYPE "public"."audit_log_action" AS ENUM('hide_post', 'unhide_post', 'lock_thread', 'unlock_thread', 'delete_thread', 'pin_thread', 'unpin_thread', 'hide_gear_review', 'hide_transaction_review', 'remove_listing', 'ban_user', 'unban_user', 'promote_user', 'demote_user', 'soft_delete_gear', 'restore_gear', 'edit_gear', 'create_gear', 'create_gear_family', 'edit_gear_family', 'set_canonical_thread', 'update_currency_rate', 'resolve_content_report', 'first_post_approve', 'first_post_reject');--> statement-breakpoint
CREATE TYPE "public"."content_report_status" AS ENUM('open', 'reviewing', 'resolved_action_taken', 'resolved_no_action', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."content_report_target" AS ENUM('gear_review', 'listing', 'message', 'forum_post', 'forum_thread', 'article_comment', 'user_profile');--> statement-breakpoint
CREATE TYPE "public"."form_factor" AS ENUM('desktop', 'keyboard', 'pedal', 'rack_unit', 'eurorack', 'module', 'standalone', 'software');--> statement-breakpoint
CREATE TYPE "public"."gear_category" AS ENUM('synthesizer', 'drum_machine', 'sampler', 'sequencer', 'effect', 'midi_controller', 'eurorack_module', 'eurorack_case', 'audio_interface', 'mixer', 'monitor', 'headphones', 'microphone', 'recorder', 'software_synth', 'software_fx', 'daw', 'accessory');--> statement-breakpoint
CREATE TYPE "public"."gear_link_kind" AS ENUM('manual', 'service_notes', 'manufacturer', 'wikipedia', 'price_guide', 'firmware', 'affiliate', 'other');--> statement-breakpoint
CREATE TYPE "public"."gear_relationship_type" AS ENUM('successor', 'variant', 'inspired_by', 'based_on', 'replaces');--> statement-breakpoint
CREATE TYPE "public"."gear_video_provider" AS ENUM('youtube', 'vimeo', 'soundcloud', 'bandcamp');--> statement-breakpoint
CREATE TYPE "public"."image_variant" AS ENUM('square_thumb', 'square_medium', 'landscape_4x3_medium', 'landscape_4x3_large', 'landscape_16x9_medium', 'landscape_16x9_large', 'original');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('ro', 'en');--> statement-breakpoint
CREATE TYPE "public"."saved_search_target" AS ENUM('bazar', 'tezaur', 'forum');--> statement-breakpoint
CREATE TYPE "public"."slug_redirect_target" AS ENUM('gear', 'article', 'forum_thread');--> statement-breakpoint
CREATE TYPE "public"."user_gear_status_flag" AS ENUM('owned', 'wishlist', 'wanted', 'used_to_own', 'loaned_out');--> statement-breakpoint
CREATE TABLE "gear" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"family_id" uuid,
	"category" "gear_category" NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"form_factor" "form_factor",
	"year_released" integer,
	"year_discontinued" integer,
	"msrp_at_launch_eur" numeric(12, 2),
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"avg_rating" numeric(3, 2),
	"review_count" integer DEFAULT 0 NOT NULL,
	"owners_public_count" integer DEFAULT 0 NOT NULL,
	"latest_firmware_version" text,
	"firmware_notes_url" text,
	"canonical_thread_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "gear_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gear_id" uuid NOT NULL,
	"lang" "locale" NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gear_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"variant" "image_variant" NOT NULL,
	"path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime_type" text NOT NULL,
	"caption" text,
	"position" integer DEFAULT 0 NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gear_id" uuid NOT NULL,
	"kind" "gear_link_kind" NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"vendor" text,
	"position" integer DEFAULT 0 NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_gear_id" uuid NOT NULL,
	"child_gear_id" uuid NOT NULL,
	"type" "gear_relationship_type" NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gear_id" uuid NOT NULL,
	"provider" "gear_video_provider" NOT NULL,
	"external_id" text NOT NULL,
	"title" text,
	"position" integer DEFAULT 0 NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gear_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"ownership_months" integer,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gear_reviews_rating_range" CHECK ("gear_reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "user_gear_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gear_id" uuid NOT NULL,
	"status" "user_gear_status_flag" NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" "audit_log_action" NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" "content_report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "content_report_status" DEFAULT 'open' NOT NULL,
	"resolved_by_user_id" uuid,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency_code" "display_currency" NOT NULL,
	"rate_to_ron" numeric(10, 4) NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slug_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "slug_redirect_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"old_slug" text NOT NULL,
	"new_slug" text NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '30 days' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_not_self" CHECK ("user_blocks"."blocker_id" <> "user_blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_email_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"old_email" text NOT NULL,
	"new_email" text NOT NULL,
	"ip_address" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"old_price" numeric(12, 2),
	"new_price" numeric(12, 2) NOT NULL,
	"currency" "display_currency" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target" "saved_search_target" DEFAULT 'bazar' NOT NULL,
	"name" text NOT NULL,
	"query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_evaluated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_listing_watches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_key" text NOT NULL,
	"category" text NOT NULL,
	"awarded_for" text,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gear" ADD CONSTRAINT "gear_family_id_gear_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."gear_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear" ADD CONSTRAINT "gear_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear" ADD CONSTRAINT "gear_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_descriptions" ADD CONSTRAINT "gear_descriptions_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_descriptions" ADD CONSTRAINT "gear_descriptions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_images" ADD CONSTRAINT "gear_images_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_images" ADD CONSTRAINT "gear_images_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_links" ADD CONSTRAINT "gear_links_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_links" ADD CONSTRAINT "gear_links_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_relationships" ADD CONSTRAINT "gear_relationships_parent_gear_id_gear_id_fk" FOREIGN KEY ("parent_gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_relationships" ADD CONSTRAINT "gear_relationships_child_gear_id_gear_id_fk" FOREIGN KEY ("child_gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_relationships" ADD CONSTRAINT "gear_relationships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_videos" ADD CONSTRAINT "gear_videos_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_videos" ADD CONSTRAINT "gear_videos_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_reviews" ADD CONSTRAINT "gear_reviews_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_reviews" ADD CONSTRAINT "gear_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gear_statuses" ADD CONSTRAINT "user_gear_statuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gear_statuses" ADD CONSTRAINT "user_gear_statuses_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_rates" ADD CONSTRAINT "currency_rates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_email_history" ADD CONSTRAINT "user_email_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_listing_watches" ADD CONSTRAINT "user_listing_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gear_slug_unique" ON "gear" USING btree ("slug") WHERE "gear"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "gear_category_idx" ON "gear" USING btree ("category");--> statement-breakpoint
CREATE INDEX "gear_brand_idx" ON "gear" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "gear_family_idx" ON "gear" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "gear_year_released_idx" ON "gear" USING btree ("year_released");--> statement-breakpoint
CREATE INDEX "gear_published_idx" ON "gear" USING btree ("published","deleted_at");--> statement-breakpoint
CREATE INDEX "gear_in_production_idx" ON "gear" USING btree ("year_discontinued");--> statement-breakpoint
CREATE UNIQUE INDEX "gear_descriptions_gear_lang_unique" ON "gear_descriptions" USING btree ("gear_id","lang");--> statement-breakpoint
CREATE UNIQUE INDEX "gear_families_slug_unique" ON "gear_families" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "gear_images_source_variant_unique" ON "gear_images" USING btree ("source_id","variant");--> statement-breakpoint
CREATE INDEX "gear_images_gear_idx" ON "gear_images" USING btree ("gear_id","position");--> statement-breakpoint
CREATE INDEX "gear_links_gear_idx" ON "gear_links" USING btree ("gear_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "gear_relationships_unique_triple" ON "gear_relationships" USING btree ("parent_gear_id","child_gear_id","type");--> statement-breakpoint
CREATE INDEX "gear_relationships_parent_idx" ON "gear_relationships" USING btree ("parent_gear_id","type");--> statement-breakpoint
CREATE INDEX "gear_relationships_child_idx" ON "gear_relationships" USING btree ("child_gear_id","type");--> statement-breakpoint
CREATE INDEX "gear_videos_gear_idx" ON "gear_videos" USING btree ("gear_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "gear_reviews_user_gear_unique" ON "gear_reviews" USING btree ("user_id","gear_id");--> statement-breakpoint
CREATE INDEX "gear_reviews_gear_idx" ON "gear_reviews" USING btree ("gear_id","hidden_at","deleted_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_gear_statuses_user_gear_status_unique" ON "user_gear_statuses" USING btree ("user_id","gear_id","status");--> statement-breakpoint
CREATE INDEX "user_gear_statuses_gear_status_public_idx" ON "user_gear_statuses" USING btree ("gear_id","status","is_public");--> statement-breakpoint
CREATE INDEX "user_gear_statuses_user_idx" ON "user_gear_statuses" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "content_reports_status_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_reports_reporter_target_unique" ON "content_reports" USING btree ("reporter_id","target_type","target_id") WHERE "content_reports"."status" = 'open';--> statement-breakpoint
CREATE INDEX "content_reports_target_idx" ON "content_reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "currency_rates_currency_validfrom_idx" ON "currency_rates" USING btree ("currency_code","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "slug_redirects_type_oldslug_unique" ON "slug_redirects" USING btree ("target_type","old_slug");--> statement-breakpoint
CREATE INDEX "slug_redirects_target_idx" ON "slug_redirects" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "slug_redirects_expires_idx" ON "slug_redirects" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair_unique" ON "user_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_idx" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "user_email_history_user_idx" ON "user_email_history" USING btree ("user_id","changed_at");--> statement-breakpoint
CREATE INDEX "listing_price_history_listing_changed_idx" ON "listing_price_history" USING btree ("listing_id","changed_at");--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id","target","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_listing_watches_user_listing_unique" ON "user_listing_watches" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "user_listing_watches_listing_idx" ON "user_listing_watches" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_unique" ON "user_badges" USING btree ("user_id","badge_key");--> statement-breakpoint
CREATE INDEX "user_badges_user_idx" ON "user_badges" USING btree ("user_id","awarded_at");