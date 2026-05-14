CREATE TYPE "public"."listing_condition" AS ENUM('new', 'mint', 'very_good', 'good', 'fair', 'for_parts');--> statement-breakpoint
CREATE TYPE "public"."listing_delivery" AS ENUM('pickup_only', 'shipping_only', 'both');--> statement-breakpoint
CREATE TYPE "public"."listing_kind" AS ENUM('sell', 'trade', 'sell_or_trade');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'active', 'sold', 'expired', 'removed');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('text', 'offer', 'counter_offer', 'offer_accepted', 'offer_rejected', 'transaction_confirmed', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'both');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('bazar_new_message', 'bazar_new_offer', 'bazar_counter_offer', 'bazar_offer_accepted', 'bazar_offer_rejected', 'bazar_price_drop_watched', 'bazar_saved_search_match', 'bazar_listing_expiring', 'bazar_transaction_confirmed_by_other', 'bazar_review_submitted_on_me', 'tezaur_review_on_my_gear', 'revista_article_in_followed_category', 'revista_reply_to_my_article', 'forum_reply_in_subscribed', 'forum_mention', 'forum_badge_earned', 'forum_mod_action_on_my_content', 'forum_report_resolved', 'admin_announcement');--> statement-breakpoint
CREATE TYPE "public"."notification_preference_mode" AS ENUM('off', 'on', 'digest');--> statement-breakpoint
CREATE TYPE "public"."saved_search_notify_mode" AS ENUM('instant', 'daily_digest', 'off');--> statement-breakpoint
CREATE TYPE "public"."shipping_carrier" AS ENUM('sameday', 'cargus', 'fan_courier', 'dpd', 'gls', 'posta_romana');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'confirmed', 'disputed', 'cancelled');--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"variant" "image_variant" NOT NULL,
	"path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime_type" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"seller_id" uuid NOT NULL,
	"gear_id" uuid,
	"raw_make" text,
	"raw_model" text,
	"raw_year" integer,
	"title" text NOT NULL,
	"description" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description_html" text DEFAULT '' NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" "display_currency" DEFAULT 'ron' NOT NULL,
	"condition" "listing_condition" NOT NULL,
	"condition_note" text,
	"kind" "listing_kind" DEFAULT 'sell' NOT NULL,
	"looking_for" text,
	"delivery" "listing_delivery" DEFAULT 'pickup_only' NOT NULL,
	"shipping_cost" numeric(12, 2),
	"shipping_carriers" "shipping_carrier"[] DEFAULT ARRAY[]::shipping_carrier[] NOT NULL,
	"accepts_offers" boolean DEFAULT false NOT NULL,
	"location" text NOT NULL,
	"contact_phone" text,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"refreshed_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
	-- search_vector is added as a STORED generated column by postflight 9003.
);
--> statement-breakpoint
CREATE TABLE "listing_message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_preview" text,
	"seller_last_read_at" timestamp with time zone,
	"buyer_last_read_at" timestamp with time zone,
	"offer_round_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"variant" text NOT NULL,
	"path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid,
	"kind" "message_kind" DEFAULT 'text' NOT NULL,
	"body" text,
	"offer_amount" numeric(12, 2),
	"offer_currency" "display_currency",
	"offer_expires_at" timestamp with time zone,
	"replies_to_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "messages_offer_payload_when_offer" CHECK (
        ("messages"."kind" NOT IN ('offer','counter_offer'))
        OR ("messages"."offer_amount" IS NOT NULL AND "messages"."offer_currency" IS NOT NULL)
      )
);
--> statement-breakpoint
CREATE TABLE "transaction_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_reviews_rating_range" CHECK ("transaction_reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "transaction_reviews_reviewer_not_reviewee" CHECK ("transaction_reviews"."reviewer_id" <> "transaction_reviews"."reviewee_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"final_price" numeric(12, 2) NOT NULL,
	"currency" "display_currency" NOT NULL,
	"accepted_offer_message_id" uuid,
	"seller_confirmed_at" timestamp with time zone,
	"buyer_confirmed_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_buyer_seller_distinct" CHECK ("transactions"."buyer_id" <> "transactions"."seller_id")
);
--> statement-breakpoint
CREATE TABLE "user_review_aggregate" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"avg_rating" numeric(3, 2),
	"review_count" integer DEFAULT 0 NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"mode" "notification_preference_mode" DEFAULT 'on' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"dedup_key" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_id" uuid,
	"read_at" timestamp with time zone,
	"email_sent_at" timestamp with time zone,
	"digest_included_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- gear.search_vector exists already as a STORED generated column from postflight 9002.
ALTER TABLE "saved_searches" ADD COLUMN "notify_mode" "saved_search_notify_mode" DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD COLUMN "last_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_message_threads" ADD CONSTRAINT "listing_message_threads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_message_threads" ADD CONSTRAINT "listing_message_threads_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_listing_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."listing_message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_reviews" ADD CONSTRAINT "transaction_reviews_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_reviews" ADD CONSTRAINT "transaction_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_reviews" ADD CONSTRAINT "transaction_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_thread_id_listing_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."listing_message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accepted_offer_message_id_messages_id_fk" FOREIGN KEY ("accepted_offer_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_review_aggregate" ADD CONSTRAINT "user_review_aggregate_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_photos_source_variant_unique" ON "listing_photos" USING btree ("source_id","variant");--> statement-breakpoint
CREATE INDEX "listing_photos_listing_position_idx" ON "listing_photos" USING btree ("listing_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_unique" ON "listings" USING btree ("slug") WHERE "listings"."removed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "listings_gear_status_price_idx" ON "listings" USING btree ("gear_id","status","price");--> statement-breakpoint
CREATE INDEX "listings_seller_status_idx" ON "listings" USING btree ("seller_id","status","created_at");--> statement-breakpoint
CREATE INDEX "listings_status_city_condition_idx" ON "listings" USING btree ("status","location","condition");--> statement-breakpoint
CREATE INDEX "listings_status_expiresat_idx" ON "listings" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "listings_status_removedat_idx" ON "listings" USING btree ("status","removed_at");--> statement-breakpoint
CREATE INDEX "listings_kind_idx" ON "listings" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_message_threads_listing_buyer_unique" ON "listing_message_threads" USING btree ("listing_id","buyer_id");--> statement-breakpoint
CREATE INDEX "listing_message_threads_buyer_recent_idx" ON "listing_message_threads" USING btree ("buyer_id","last_message_at");--> statement-breakpoint
CREATE INDEX "listing_message_threads_listing_idx" ON "listing_message_threads" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_attachments_source_variant_unique" ON "message_attachments" USING btree ("source_id","variant");--> statement-breakpoint
CREATE INDEX "message_attachments_message_idx" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messages_thread_created_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_reviews_txn_reviewer_unique" ON "transaction_reviews" USING btree ("transaction_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "transaction_reviews_reviewee_idx" ON "transaction_reviews" USING btree ("reviewee_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_thread_unique" ON "transactions" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "transactions_seller_status_idx" ON "transactions" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "transactions_buyer_status_idx" ON "transactions" USING btree ("buyer_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_kind_channel_unique" ON "notification_preferences" USING btree ("user_id","kind","channel");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id","created_at") WHERE "notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "notifications_dedup_idx" ON "notifications" USING btree ("dedup_key","recipient_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_history_idx" ON "notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_email_queue_idx" ON "notifications" USING btree ("created_at") WHERE "notifications"."channel" IN ('email','both') AND "notifications"."email_sent_at" IS NULL;