import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  FORM_FACTORS,
  GEAR_CATEGORIES,
  GEAR_RELATIONSHIP_TYPES,
  GEAR_STATES,
  USER_GEAR_STATUS_FLAGS,
  type FormFactorLiteral,
  type GearCategoryLiteral,
  type GearRelationshipTypeLiteral,
  type GearStateLiteral,
  type UserGearStatusFlagLiteral,
} from '@sintezaur/shared';

const CATEGORIES = [...GEAR_CATEGORIES] as string[];
const FORM_FACTOR_VALUES = [...FORM_FACTORS] as string[];
const REL_TYPES = [...GEAR_RELATIONSHIP_TYPES] as string[];
const STATUS_FLAGS = [...USER_GEAR_STATUS_FLAGS] as string[];
const STATES = [...GEAR_STATES] as string[];

/* ============================================================
   Admin: gear CRUD
   ============================================================ */

export class CreateGearDto {
  @IsEnum(CATEGORIES)
  category!: GearCategoryLiteral;

  @IsString()
  @Length(1, 80)
  brand!: string;

  @IsString()
  @Length(1, 120)
  model!: string;

  @IsOptional()
  @IsString()
  @Length(3, 80)
  slug?: string;

  @IsOptional()
  @IsEnum(FORM_FACTOR_VALUES)
  formFactor?: FormFactorLiteral;

  @IsOptional()
  @IsUUID()
  familyId?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearReleased?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearDiscontinued?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  msrpAtLaunchEur?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  latestFirmwareVersion?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  firmwareNotesUrl?: string;

  @IsOptional()
  @IsObject()
  specs?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateGearDto extends PartialType(CreateGearDto) {}

/* ============================================================
   Admin: gear family
   ============================================================ */

export class CreateGearFamilyDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(3, 80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;
}

export class UpdateGearFamilyDto extends PartialType(CreateGearFamilyDto) {}

/* ============================================================
   Admin: gear relationship
   ============================================================ */

export class CreateGearRelationshipDto {
  @IsUUID()
  childGearId!: string;

  @IsEnum(REL_TYPES)
  type!: GearRelationshipTypeLiteral;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

/* ============================================================
   Admin: gear description (per-locale Tiptap)
   ============================================================ */

export class UpsertGearDescriptionDto {
  @IsEnum(['ro', 'en'])
  lang!: 'ro' | 'en';

  @IsObject()
  body!: Record<string, unknown>;

  @IsString()
  bodyHtml!: string;
}

/* ============================================================
   Admin: gear video / link
   ============================================================ */

export class CreateGearVideoDto {
  @IsEnum(['youtube', 'vimeo', 'soundcloud', 'bandcamp'])
  provider!: 'youtube' | 'vimeo' | 'soundcloud' | 'bandcamp';

  @IsString()
  @Length(1, 200)
  externalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class CreateGearLinkDto {
  @IsEnum([
    'manual',
    'service_notes',
    'manufacturer',
    'wikipedia',
    'price_guide',
    'firmware',
    'affiliate',
    'other',
  ])
  kind!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vendor?: string;
}

/* ============================================================
   Public: list / search
   ============================================================ */

export class ListGearQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsEnum(CATEGORIES)
  category?: GearCategoryLiteral;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearMax?: number;

  /** "in_production" / "discontinued" — UI mapping into yearDiscontinued IS NULL. */
  @IsOptional()
  @IsEnum(['in_production', 'discontinued'])
  status?: 'in_production' | 'discontinued';

  @IsOptional()
  @IsEnum(['popular', 'alpha', 'newest', 'year_asc', 'year_desc'])
  sort?: 'popular' | 'alpha' | 'newest' | 'year_asc' | 'year_desc';

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
   Personal collection
   ============================================================ */

export class SetGearStatusDto {
  @IsUUID()
  gearId!: string;

  @IsEnum(STATUS_FLAGS)
  status!: UserGearStatusFlagLiteral;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

/* ============================================================
   Gear review (Discogs-style)
   ============================================================ */

export class CreateGearReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @Length(20, 4000)
  body!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1200)
  ownershipMonths?: number;
}

export class UpdateGearReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @Length(20, 4000)
  body?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1200)
  ownershipMonths?: number;
}

/* ============================================================
   Me (contributor): create / update own draft gear.
   ============================================================ */

/**
 * Same validation rules as `CreateGearDto`, but with `category` and
 * `model` made optional so the auto-save flow can persist a partial
 * row as soon as the user types the brand. The "submit to moderation"
 * endpoint enforces the full required set before transitioning state.
 *
 * `published`, `slug` and `familyId` are removed from the surface —
 * the slug is derived server-side and only locked on approve; the
 * family is resolved via a separate `familyLabel` lookup.
 */
export class MeCreateGearDto {
  @IsOptional()
  @IsEnum(CATEGORIES)
  category?: GearCategoryLiteral;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  brand?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  model?: string;

  @IsOptional()
  @IsEnum(FORM_FACTOR_VALUES)
  formFactor?: FormFactorLiteral;

  /**
   * Free-text family label (e.g. "Roland JUPITER series"). The service
   * does a lookup-or-create against `gear_families` on submit.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  familyLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearReleased?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearDiscontinued?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  msrpAtLaunchEur?: number;

  @IsOptional()
  @IsObject()
  specs?: Record<string, unknown>;

  /** Tagline shown above the long description. Max 200 chars. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  /**
   * Long-form description as plain text. The service splits on blank
   * lines into Tiptap paragraph nodes and stores both `body` (JSON)
   * and `bodyHtml` (escaped) on `gear_descriptions`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  descriptionText?: string;
}

export class MeUpdateGearDto extends PartialType(MeCreateGearDto) {}

/* ============================================================
   Admin moderation
   ============================================================ */

export class RejectGearDto {
  @IsString()
  @Length(10, 1000)
  reason!: string;
}

export class ListModerationQueueDto {
  @IsOptional()
  @IsEnum(STATES)
  state?: GearStateLiteral;

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
   Image manual crop (contributor)
   ============================================================ */

export class SetImageCropDto {
  @IsInt()
  @Min(0)
  x!: number;

  @IsInt()
  @Min(0)
  y!: number;

  @IsInt()
  @Min(1)
  w!: number;

  @IsInt()
  @Min(1)
  h!: number;
}
