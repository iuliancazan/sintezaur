import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

const LEGAL_SLUGS = [
  'termeni',
  'confidentialitate',
  'cookies',
  'regulament-forum',
  'despre',
  'contact',
] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
export const LEGAL_SLUG_VALUES = LEGAL_SLUGS;

const CONTACT_CATEGORIES = [
  'cumparator',
  'vanzator',
  'editor',
  'juridic',
  'altele',
] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export class UpdateLegalPageDto {
  @IsString()
  @Length(2, 200)
  title!: string;

  @IsString()
  @Length(10, 100_000)
  bodyMd!: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  metaDescription?: string | null;

  // M16-H: optional English translation. NULL = not yet translated;
  // the public route falls back to the RO column when missing.
  @IsOptional()
  @IsString()
  @Length(0, 200)
  titleEn?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 100_000)
  bodyMdEn?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  metaDescriptionEn?: string | null;
}

export class CreateContactMessageDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsEmail()
  @Length(5, 254)
  email!: string;

  @IsIn(CONTACT_CATEGORIES)
  category!: ContactCategory;

  @IsString()
  @Length(3, 200)
  subject!: string;

  @IsString()
  @Length(10, 10_000)
  body!: string;

  /** Honeypot — bots fill it, humans never see it. */
  @IsOptional()
  @IsString()
  hp?: string;

  /** Epoch ms when the form mounted; rejects submissions <3s after load. */
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value == null ? value : Number(value)))
  formStartedAt?: number;
}

export class UpdateContactMessageDto {
  @IsIn(['read', 'archived'])
  status!: 'read' | 'archived';
}

export class ListContactMessagesQueryDto {
  @IsOptional()
  @IsIn(CONTACT_STATUSES)
  status?: ContactStatus;

  @IsOptional()
  @IsIn(CONTACT_CATEGORIES)
  category?: ContactCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value == null ? value : Number(value)))
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value == null ? value : Number(value)))
  pageSize?: number;
}
