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
 * present from M1 even though phone/ID verification UIs ship post-MVP
 * (avoids a painful migration later).
 *   unverified     → fresh signup, email not yet confirmed
 *   email_verified → email click-through done (default after M1 signup)
 *   phone_verified → SMS OTP done (post-MVP)
 *   id_verified    → KYC document accepted (post-MVP)
 *   trusted_seller → admin-granted senior tier
 */
export const trustLevelEnum = pgEnum('trust_level', [
  'unverified',
  'email_verified',
  'phone_verified',
  'id_verified',
  'trusted_seller',
]);
export type TrustLevel = (typeof trustLevelEnum.enumValues)[number];

/**
 * Display currency per spec §7.12. Prices are stored in the seller's
 * chosen currency; the UI converts to the viewer's `display_currency`
 * using monthly `currency_rate` rows (M2). Only RON + EUR for MVP.
 */
export const displayCurrencyEnum = pgEnum('display_currency', [
  'ron',
  'eur',
]);
export type DisplayCurrency = (typeof displayCurrencyEnum.enumValues)[number];

/**
 * User subscription tier per spec §9. Schema-ready for post-MVP
 * premium tiers; MVP only uses `free`. Stored on the user row so
 * gating logic can be a single column read.
 */
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'premium',
]);
export type SubscriptionTier =
  (typeof subscriptionTierEnum.enumValues)[number];
