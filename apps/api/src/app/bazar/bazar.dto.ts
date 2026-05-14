import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const LISTING_CONDITIONS = [
  'new',
  'mint',
  'very_good',
  'good',
  'fair',
  'for_parts',
] as const;
const LISTING_KINDS = ['sell', 'trade', 'sell_or_trade'] as const;
const LISTING_DELIVERIES = ['pickup_only', 'shipping_only', 'both'] as const;
const SHIPPING_CARRIERS = [
  'sameday',
  'cargus',
  'fan_courier',
  'dpd',
  'gls',
  'posta_romana',
] as const;
const CURRENCIES = ['ron', 'eur'] as const;

export type ListingCondition = (typeof LISTING_CONDITIONS)[number];
export type ListingKind = (typeof LISTING_KINDS)[number];
export type ListingDelivery = (typeof LISTING_DELIVERIES)[number];
export type ShippingCarrier = (typeof SHIPPING_CARRIERS)[number];
export type Currency = (typeof CURRENCIES)[number];

/* ============================================================
   Create listing
   ============================================================ */

export class CreateListingDto {
  /** Optional: when set, listing inherits brand+model from Tezaur. */
  @IsOptional()
  @IsUUID()
  gearId?: string;

  /** Required when gearId is null (free-text fallback per spec §8.2). */
  @ValidateIf((o: CreateListingDto) => !o.gearId)
  @IsString()
  @Length(1, 80)
  rawMake?: string;

  @ValidateIf((o: CreateListingDto) => !o.gearId)
  @IsString()
  @Length(1, 120)
  rawModel?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  rawYear?: number;

  @IsString()
  @Length(3, 140)
  title!: string;

  /** Tiptap JSON body. Service derives `descriptionHtml` server-side. */
  @IsObject()
  description!: Record<string, unknown>;

  /** Optional: pre-rendered HTML the client computed via SzEditor. */
  @IsOptional()
  @IsString()
  @MaxLength(60000)
  descriptionHtml?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  price!: number;

  @IsEnum(CURRENCIES)
  currency!: Currency;

  @IsEnum(LISTING_CONDITIONS)
  condition!: ListingCondition;

  /** Required when condition='mint' — ≥50 chars per spec §8.2. */
  @ValidateIf((o: CreateListingDto) => o.condition === 'mint')
  @IsString()
  @MinLength(50)
  @MaxLength(500)
  conditionNote?: string;

  @IsEnum(LISTING_KINDS)
  kind!: ListingKind;

  /** Required when kind != 'sell'. */
  @ValidateIf((o: CreateListingDto) => o.kind !== 'sell')
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  lookingFor?: string;

  @IsEnum(LISTING_DELIVERIES)
  delivery!: ListingDelivery;

  @ValidateIf((o: CreateListingDto) => o.delivery !== 'pickup_only')
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000)
  shippingCost?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsEnum(SHIPPING_CARRIERS, { each: true })
  shippingCarriers?: ShippingCarrier[];

  @IsBoolean()
  acceptsOffers!: boolean;

  @IsString()
  @Length(2, 80)
  location!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;
}

export class UpdateListingDto extends PartialType(CreateListingDto) {}

/* ============================================================
   List / browse
   ============================================================ */

export class ListListingsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  /** Filter by Tezaur gear id (exact). */
  @IsOptional()
  @IsUUID()
  gearId?: string;

  /** Filter by brand (case-insensitive, exact match). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsEnum(LISTING_CONDITIONS, { each: true })
  @IsArray()
  conditions?: ListingCondition[];

  @IsOptional()
  @IsEnum(LISTING_KINDS, { each: true })
  @IsArray()
  kinds?: ListingKind[];

  @IsOptional()
  @IsEnum(LISTING_DELIVERIES, { each: true })
  @IsArray()
  deliveries?: ListingDelivery[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsEnum(CURRENCIES)
  currency?: Currency;

  @IsOptional()
  @IsEnum(['newest', 'price_asc', 'price_desc', 'expiring_soon', 'most_viewed'])
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'expiring_soon' | 'most_viewed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/* ============================================================
   Saved search
   ============================================================ */

const NOTIFY_MODES = ['instant', 'daily_digest', 'off'] as const;

export class CreateSavedSearchDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsObject()
  query!: Record<string, unknown>;

  @IsOptional()
  @IsEnum(NOTIFY_MODES)
  notifyMode?: 'instant' | 'daily_digest' | 'off';
}

export class UpdateSavedSearchDto extends PartialType(CreateSavedSearchDto) {}

/* ============================================================
   Quick-list suggestion request
   ============================================================ */

export class QuickListSuggestionQueryDto {
  /** Tezaur gear id to pull suggestions for. */
  @IsUUID()
  gearId!: string;
}
