/**
 * Bazar taxonomy constants per spec §8.2.
 *
 * Mirror of the Drizzle enum values, lifted to the FE so the listing
 * list/detail/create UI can import without depending on @sintezaur/db
 * (which pulls drizzle-orm + pg, not browser-safe).
 */

export const LISTING_CONDITIONS = [
  'new',
  'mint',
  'very_good',
  'good',
  'fair',
  'for_parts',
] as const;
export type ListingConditionLiteral = (typeof LISTING_CONDITIONS)[number];

export const LISTING_KINDS = ['sell', 'trade', 'sell_or_trade'] as const;
export type ListingKindLiteral = (typeof LISTING_KINDS)[number];

export const LISTING_DELIVERIES = [
  'pickup_only',
  'shipping_only',
  'both',
] as const;
export type ListingDeliveryLiteral = (typeof LISTING_DELIVERIES)[number];

export const SHIPPING_CARRIERS = [
  'sameday',
  'cargus',
  'fan_courier',
  'dpd',
  'gls',
  'posta_romana',
] as const;
export type ShippingCarrierLiteral = (typeof SHIPPING_CARRIERS)[number];

export const DISPLAY_CURRENCIES = ['ron', 'eur'] as const;
export type DisplayCurrencyLiteral = (typeof DISPLAY_CURRENCIES)[number];

export const LISTING_STATUSES = [
  'draft',
  'active',
  'sold',
  'expired',
  'removed',
] as const;
export type ListingStatusLiteral = (typeof LISTING_STATUSES)[number];

/** Sort options accepted by `GET /bazar` — mirrors api DTO. */
export const LISTING_SORTS = [
  'newest',
  'price_asc',
  'price_desc',
  'expiring_soon',
  'most_viewed',
] as const;
export type ListingSortLiteral = (typeof LISTING_SORTS)[number];

/** Formatter helper — RON/EUR with native locale numerals. */
export function formatPrice(
  amount: string | number,
  currency: DisplayCurrencyLiteral,
  locale = 'ro-RO',
): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(n);
}
