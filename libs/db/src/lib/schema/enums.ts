import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Sintezaur role hierarchy per spec §7.2. `guest` is implicit (no row;
 * an unauthenticated request). Promotion path:
 *   user → editor (Revista grant by admin)
 *   user → moderator (Bazar + Forum mod, by admin)
 *   anything → admin (manually, never self-grant)
 */
export const userRoleEnum = pgEnum('user_role', [
  'user',
  'editor',
  'moderator',
  'admin',
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
]);
export type AuditLogAction = (typeof auditLogActionEnum.enumValues)[number];

/** Locale for editorial copy (gear_description, articles in M4). */
export const localeEnum = pgEnum('locale', ['ro', 'en']);
export type Locale = (typeof localeEnum.enumValues)[number];

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
