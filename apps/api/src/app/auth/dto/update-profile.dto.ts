import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Profile fields editable from `/cont/profil`. All optional — only
 * keys present in the payload are touched. Pass `null` to clear an
 * optional field (bio / location / website / socials).
 *
 * `displayCurrency` enum: matches `display_currency` Postgres enum
 * (`ron`, `eur`, `usd`). Validated app-side because class-validator
 * can't introspect a Drizzle enum.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fullName?: string;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @IsIn(['ron', 'eur'])
  displayCurrency?: 'ron' | 'eur';

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  websiteUrl?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  socialInstagram?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  socialSoundcloud?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  socialBandcamp?: string | null;
}
