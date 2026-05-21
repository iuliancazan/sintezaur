import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const ARTICLE_CATEGORIES = [
  'reviews',
  'tutorials',
  'news',
  'interviews',
  'buying_guides',
  'hardware_deep_dives',
] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/* ============================================================
   Create / update
   ============================================================ */

export class CreateArticleDto {
  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  excerpt?: string;

  @IsEnum(ARTICLE_CATEGORIES)
  category!: ArticleCategory;

  /** Tiptap JSON. Body html is computed server-side from the JSON. */
  @IsObject()
  body!: Record<string, unknown>;

  /** Optional pre-rendered HTML from the inline composer. */
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  bodyHtml?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  /** Tezaur gear ids to feature on the article (sidebar + back-refs). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  gearIds?: string[];

  /** Hero image source_id — must have been uploaded via the article. */
  @IsOptional()
  @IsUUID()
  heroSourceId?: string;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  /* ---------- English mirror (bilingual, optional) ---------- */

  /** English title. Empty/whitespace normalised to NULL on save. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  /** English excerpt. Empty/whitespace normalised to NULL on save. */
  @IsOptional()
  @IsString()
  @MaxLength(280)
  excerptEn?: string;

  /** English body — Tiptap JSON. Empty/null body removes the EN row. */
  @IsOptional()
  @IsObject()
  bodyEn?: Record<string, unknown>;

  /** English pre-rendered HTML. */
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  bodyHtmlEn?: string;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

/* ============================================================
   Public list
   ============================================================ */

export class ListArticlesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsEnum(ARTICLE_CATEGORIES)
  category?: ArticleCategory;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsUUID()
  gearId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsEnum(['newest', 'oldest', 'most_viewed'])
  sort?: 'newest' | 'oldest' | 'most_viewed';

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
   Image upload — multipart caption is the only optional text part.
   ============================================================ */

export class UploadArticleImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}

/* ============================================================
   Slug rename — only valid in `draft` status.
   ============================================================ */

export class RenameSlugDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  slug!: string;
}
