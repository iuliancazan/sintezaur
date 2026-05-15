import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Sintezaur role enum per spec §7.2. `guest` is implicit (no row; an
 * unauthenticated request). Roles are **multi-valued** — stored in the
 * `user_roles` join table, not as a column on `users`. A single user
 * may hold any combination (e.g. `editor` + `curator`).
 *
 * Promotion paths:
 *   user → contributor       auto, at 100 published Forum posts (revocable)
 *   contributor → curator    manual, by admin
 *   user → editor            manual, by admin (Revista grant)
 *   user → moderator         manual, by admin
 *   * → admin                **superadmin only**
 *   * → superadmin           **superadmin only** (bootstrapped at install)
 */
export const userRoleEnum = pgEnum('user_role', [
  'user',
  'contributor',
  'curator',
  'editor',
  'moderator',
  'admin',
  'superadmin',
]);
export type UserRole = (typeof userRoleEnum.enumValues)[number];

/**
 * Trust verification tiers per spec §7.4. All columns + enum values
 * present from M1 even though phone/ID verification UIs ship post-MVP.
 */
export const trustLevelEnum = pgEnum('trust_level', [
  'unverified',
  'email_verified',
  'phone_verified',
  'id_verified',
  'trusted_seller',
]);
export type TrustLevel = (typeof trustLevelEnum.enumValues)[number];

/** Display currency per spec §7.12. */
export const displayCurrencyEnum = pgEnum('display_currency', [
  'ron',
  'eur',
]);
export type DisplayCurrency = (typeof displayCurrencyEnum.enumValues)[number];

/** Subscription tier per spec §9. MVP only uses `free`. */
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'premium',
]);
export type SubscriptionTier =
  (typeof subscriptionTierEnum.enumValues)[number];

/**
 * Tezaur categories per spec §8.1 — 18 flat categories, no nested
 * hierarchy. Filtering UI uses `category` as primary; `specs.type`
 * (sub-enum) as secondary where present.
 */
export const gearCategoryEnum = pgEnum('gear_category', [
  'synthesizer',
  'drum_machine',
  'sampler',
  'sequencer',
  'effect',
  'midi_controller',
  'eurorack_module',
  'eurorack_case',
  'audio_interface',
  'mixer',
  'monitor',
  'headphones',
  'microphone',
  'recorder',
  'software_synth',
  'software_fx',
  'daw',
  'accessory',
]);
export type GearCategory = (typeof gearCategoryEnum.enumValues)[number];

/**
 * Form factor — physical chassis style. Shared across categories so
 * filtering UI can offer "all keyboards" or "all desktop modules"
 * cross-category.
 */
export const formFactorEnum = pgEnum('form_factor', [
  'desktop',
  'keyboard',
  'pedal',
  'rack_unit',
  'eurorack',
  'module',
  'standalone',
  'software',
]);
export type FormFactor = (typeof formFactorEnum.enumValues)[number];

/**
 * Typed gear relationships per spec §8.1. Directed: `parent → child`.
 * Examples:
 *   successor:   Moog Sub 37 → Subsequent 37 (newer model)
 *   variant:     Roland Juno-60 → Juno-106 (same family, different SKU)
 *   inspired_by: Minimoog → Moog Voyager
 *   based_on:    Roland Model D → Behringer Model D (clone)
 *   replaces:    Sub 37 → Subsequent 37 (discontinued superseded)
 */
export const gearRelationshipTypeEnum = pgEnum('gear_relationship_type', [
  'successor',
  'variant',
  'inspired_by',
  'based_on',
  'replaces',
]);
export type GearRelationshipType =
  (typeof gearRelationshipTypeEnum.enumValues)[number];

/**
 * Personal-collection flags per spec §8.1. A user can hold multiple
 * statuses per gear simultaneously (uniqueness is the triple
 * `(user_id, gear_id, status)`).
 */
export const userGearStatusFlagEnum = pgEnum('user_gear_status_flag', [
  'owned',
  'wishlist',
  'wanted',
  'used_to_own',
  'loaned_out',
]);
export type UserGearStatusFlag =
  (typeof userGearStatusFlagEnum.enumValues)[number];

/** Provider for external video embeds on gear pages. */
export const gearVideoProviderEnum = pgEnum('gear_video_provider', [
  'youtube',
  'vimeo',
  'soundcloud',
  'bandcamp',
]);
export type GearVideoProvider =
  (typeof gearVideoProviderEnum.enumValues)[number];

/** External link kinds on gear pages. */
export const gearLinkKindEnum = pgEnum('gear_link_kind', [
  'manual',
  'service_notes',
  'manufacturer',
  'wikipedia',
  'price_guide',
  'firmware',
  'affiliate',
  'other',
]);
export type GearLinkKind = (typeof gearLinkKindEnum.enumValues)[number];

/**
 * Image aspect-ratio variants Sharp generates per uploaded source
 * image. The same source produces multiple variants so cards/listings
 * can pick the right ratio without per-image cropping decisions.
 */
export const imageVariantEnum = pgEnum('image_variant', [
  'square_thumb',
  'square_medium',
  'landscape_4x3_medium',
  'landscape_4x3_large',
  'landscape_16x9_medium',
  'landscape_16x9_large',
  'original',
]);
export type ImageVariant = (typeof imageVariantEnum.enumValues)[number];

/**
 * Slug-redirect target type per spec §7.13. Polymorphic FK enforced
 * application-side; DB stores type discriminator + target_id pair.
 */
export const slugRedirectTargetEnum = pgEnum('slug_redirect_target', [
  'gear',
  'article',
  'forum_thread',
]);
export type SlugRedirectTarget =
  (typeof slugRedirectTargetEnum.enumValues)[number];

/**
 * Content-report target type per spec §7.10. Polymorphic; one queue
 * for all reportable surfaces.
 */
export const contentReportTargetEnum = pgEnum('content_report_target', [
  'gear_review',
  'listing',
  'message',
  'forum_post',
  'forum_thread',
  'article_comment',
  'user_profile',
]);
export type ContentReportTarget =
  (typeof contentReportTargetEnum.enumValues)[number];

/** Content-report resolution state. */
export const contentReportStatusEnum = pgEnum('content_report_status', [
  'open',
  'reviewing',
  'resolved_action_taken',
  'resolved_no_action',
  'duplicate',
]);
export type ContentReportStatus =
  (typeof contentReportStatusEnum.enumValues)[number];

/**
 * Audit-log action enum per spec §7.10. Extensible — when a new
 * privileged action lands, add the discriminator here. Action names
 * are deliberately verb-first ("hide_post", "promote_user") so
 * sorting + searching reads naturally in admin tools.
 */
export const auditLogActionEnum = pgEnum('audit_log_action', [
  'hide_post',
  'unhide_post',
  'lock_thread',
  'unlock_thread',
  'delete_thread',
  'pin_thread',
  'unpin_thread',
  'hide_gear_review',
  'hide_transaction_review',
  'remove_listing',
  'ban_user',
  'unban_user',
  'promote_user',
  'demote_user',
  'soft_delete_gear',
  'restore_gear',
  'edit_gear',
  'create_gear',
  'create_gear_family',
  'edit_gear_family',
  'set_canonical_thread',
  'update_currency_rate',
  'resolve_content_report',
  'first_post_approve',
  'first_post_reject',
  'gdpr_self_delete',
]);
export type AuditLogAction = (typeof auditLogActionEnum.enumValues)[number];

/** Locale for editorial copy (gear_description, articles in M4). */
export const localeEnum = pgEnum('locale', ['ro', 'en']);
export type Locale = (typeof localeEnum.enumValues)[number];

/* ============================================================
   M4 — Revista enums (spec §8.3)
   ============================================================ */

/**
 * Article lifecycle. `draft` is editor-only; `published` is the only
 * status visible to anonymous traffic; `archived` is soft-removed but
 * editor-recoverable (per §7.11).
 */
export const articleStatusEnum = pgEnum('article_status', [
  'draft',
  'published',
  'archived',
]);
export type ArticleStatus = (typeof articleStatusEnum.enumValues)[number];

/**
 * Six content pillars per spec §8.3. All ship in MVP.
 */
export const articleCategoryEnum = pgEnum('article_category', [
  'reviews',
  'tutorials',
  'news',
  'interviews',
  'buying_guides',
  'hardware_deep_dives',
]);
export type ArticleCategory =
  (typeof articleCategoryEnum.enumValues)[number];

/**
 * Forum category kind per spec §8.4. `user` = community-visible;
 * `system` = auto-managed (article discussion, canonical gear
 * threads, admin announcements).
 */
export const forumCategoryKindEnum = pgEnum('forum_category_kind', [
  'user',
  'system',
]);
export type ForumCategoryKind =
  (typeof forumCategoryKindEnum.enumValues)[number];

/**
 * Forum post lifecycle per spec §8.4 ("first-post approval queue").
 * `approved` is the steady state; `pending` means the first-post queue
 * is holding the row from public view; `rejected` is the mod outcome
 * (the row stays for audit but never surfaces).
 */
export const forumPostStatusEnum = pgEnum('forum_post_status', [
  'approved',
  'pending',
  'rejected',
]);
export type ForumPostStatus =
  (typeof forumPostStatusEnum.enumValues)[number];

/**
 * Forum subscription level per spec §7.5. One value per (user × target).
 * `watching` = every reply notifies; `tracking` = daily digest; etc.
 */
export const forumSubscriptionLevelEnum = pgEnum('forum_subscription_level', [
  'watching',
  'tracking',
  'mentioned_only',
  'muted',
]);
export type ForumSubscriptionLevel =
  (typeof forumSubscriptionLevelEnum.enumValues)[number];

/**
 * Saved-search target section per spec §8.2. MVP populates only
 * `bazar`; reserved for future Tezaur/Forum saved searches.
 */
export const savedSearchTargetEnum = pgEnum('saved_search_target', [
  'bazar',
  'tezaur',
  'forum',
]);
export type SavedSearchTarget =
  (typeof savedSearchTargetEnum.enumValues)[number];

/* ============================================================
   M3 — Bazar enums (spec §8.2)
   ============================================================ */

/**
 * Lifecycle states for a listing. `active` listings are visible in
 * `/bazar`; `expired` rows stay visible for 30 days with a grey badge
 * (per §8.2) and then flip to `removed` via the daily cron + `removed_at`.
 */
export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'active',
  'sold',
  'expired',
  'removed',
]);
export type ListingStatus = (typeof listingStatusEnum.enumValues)[number];

/**
 * Condition tiers per spec §8.2. `mint` requires a ≥50-char
 * justification at submit time (enforced in DTO, not schema).
 */
export const listingConditionEnum = pgEnum('listing_condition', [
  'new',
  'mint',
  'very_good',
  'good',
  'fair',
  'for_parts',
]);
export type ListingCondition =
  (typeof listingConditionEnum.enumValues)[number];

/** Sell / trade / sell_or_trade per spec §8.2. */
export const listingKindEnum = pgEnum('listing_kind', [
  'sell',
  'trade',
  'sell_or_trade',
]);
export type ListingKind = (typeof listingKindEnum.enumValues)[number];

/** Delivery options per spec §8.2. */
export const listingDeliveryEnum = pgEnum('listing_delivery', [
  'pickup_only',
  'shipping_only',
  'both',
]);
export type ListingDelivery =
  (typeof listingDeliveryEnum.enumValues)[number];

/** RO shipping carriers per spec §8.2. */
export const shippingCarrierEnum = pgEnum('shipping_carrier', [
  'sameday',
  'cargus',
  'fan_courier',
  'dpd',
  'gls',
  'posta_romana',
]);
export type ShippingCarrier =
  (typeof shippingCarrierEnum.enumValues)[number];

/**
 * Chat message kinds per spec §8.2. Text is the default; offer kinds
 * carry the structured-offer payload (amount/currency/expires).
 * `transaction_confirmed` is a system message inserted when the
 * second party clicks "Confirmă tranzacția".
 */
export const messageKindEnum = pgEnum('message_kind', [
  'text',
  'offer',
  'counter_offer',
  'offer_accepted',
  'offer_rejected',
  'transaction_confirmed',
  'system',
]);
export type MessageKind = (typeof messageKindEnum.enumValues)[number];

/**
 * Transaction lifecycle per spec §8.2. A pending transaction exists
 * the moment the first party clicks "Confirmă tranzacția"; it flips
 * to `confirmed` when the second clicks. `disputed` is post-MVP but
 * the enum value is reserved so a future dispute flow doesn't need
 * a migration.
 */
export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'confirmed',
  'disputed',
  'cancelled',
]);
export type TransactionStatus =
  (typeof transactionStatusEnum.enumValues)[number];

/**
 * Saved-search notification cadence per spec §8.2. Evaluator queues
 * an instant notification for `instant`, accumulates a digest for
 * `daily_digest`, skips entirely for `off`.
 */
export const savedSearchNotifyModeEnum = pgEnum(
  'saved_search_notify_mode',
  ['instant', 'daily_digest', 'off'],
);
export type SavedSearchNotifyMode =
  (typeof savedSearchNotifyModeEnum.enumValues)[number];

/**
 * Notification kinds per spec §7.5. One enum value per trigger so a
 * dashboard can filter / aggregate cleanly. New triggers land here
 * (add the enum value + the wiring; schema stays put).
 */
export const notificationKindEnum = pgEnum('notification_kind', [
  // Bazar
  'bazar_new_message',
  'bazar_new_offer',
  'bazar_counter_offer',
  'bazar_offer_accepted',
  'bazar_offer_rejected',
  'bazar_price_drop_watched',
  'bazar_saved_search_match',
  'bazar_listing_expiring',
  'bazar_transaction_confirmed_by_other',
  'bazar_review_submitted_on_me',
  // Tezaur
  'tezaur_review_on_my_gear',
  // Revista (M4)
  'revista_article_in_followed_category',
  'revista_reply_to_my_article',
  // Forum (M5)
  'forum_reply_in_subscribed',
  'forum_mention',
  'forum_badge_earned',
  'forum_mod_action_on_my_content',
  'forum_report_resolved',
  // Cross-cutting
  'admin_announcement',
]);
export type NotificationKind =
  (typeof notificationKindEnum.enumValues)[number];

/** Delivery channel for a single notification row. */
export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'email',
  'both',
]);
export type NotificationChannel =
  (typeof notificationChannelEnum.enumValues)[number];

/** Notification preference per (user × kind × channel) row. */
export const notificationPreferenceModeEnum = pgEnum(
  'notification_preference_mode',
  ['off', 'on', 'digest'],
);
export type NotificationPreferenceMode =
  (typeof notificationPreferenceModeEnum.enumValues)[number];
