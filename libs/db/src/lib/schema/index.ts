/**
 * Sintezaur Drizzle schema barrel.
 *
 * Empty for M0. Tables land milestone by milestone:
 *   - M1: users, refresh_tokens, email_verification_tokens, password_reset_tokens
 *   - M2: gear, gear_family, gear_image, gear_video, gear_link, gear_review,
 *         gear_relationship, gear_description + cross-cutting foundation
 *         (user_gear_status, user_listing_watch, saved_search, user_badge,
 *          user_block, user_email_history, content_report, audit_log,
 *          slug_redirect, currency_rate, listing_price_history)
 *   - M3: listing, listing_photo, message, transaction, transaction_review
 *   - M4: article, article_gear, forum_thread (minimal)
 *   - M5: forum_category, forum_thread (full), forum_post, forum_subscription,
 *         forum_report, forum_post_like
 *
 * Drizzle-kit's `generate` treats an empty barrel as a no-op, so no
 * migration files are written until tables are actually declared.
 */
export {};
