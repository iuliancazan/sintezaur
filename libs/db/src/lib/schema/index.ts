/**
 * Sintezaur Drizzle schema barrel.
 *
 * M1 ships: enums + users + 3 auth-token tables.
 * M2 ships: Tezaur core (gear + 7 sister tables) + foundation tables
 *   wired in later milestones (M3 Bazar / M5 Forum).
 *
 * Forthcoming:
 *   - M3: listing, listing_photo, message, transaction, transaction_review
 *   - M4: article, article_gear, forum_thread (minimal)
 *   - M5: forum_category, forum_thread (full), forum_post,
 *         forum_subscription, forum_report, forum_post_like
 */
export * from './enums';
export * from './users';
export * from './refresh-tokens';
export * from './email-verification-tokens';
export * from './password-reset-tokens';

// Tezaur (M2)
export * from './gear';
export * from './gear-review';
export * from './user-gear-status';

// Foundation tables (wired by later milestones, schema created here)
export * from './cross-cutting';
export * from './foundation-bazar';
export * from './foundation-forum';

// Bazar (M3)
export * from './listings';
export * from './messaging';
export * from './transactions';
export * from './notifications';

// Revista (M4)
export * from './articles';
