import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateThreadDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @Length(4, 200)
  title!: string;

  @IsObject()
  body!: Record<string, unknown>;

  @IsString()
  bodyHtml!: string;
}

export class CreateReplyDto {
  @IsOptional()
  @IsUUID()
  parentPostId?: string;

  @IsObject()
  body!: Record<string, unknown>;

  @IsString()
  bodyHtml!: string;
}

export class UpdatePostDto {
  @IsObject()
  body!: Record<string, unknown>;

  @IsString()
  bodyHtml!: string;
}

export class HidePostDto {
  @IsString()
  @Length(2, 200)
  reason!: string;
}

export class ListThreadsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ListPostsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class SetSubscriptionDto {
  /** `null` clears the subscription entirely (unsubscribe). */
  @ValidateIf((_, value) => value !== null)
  @IsIn(['watching', 'tracking', 'mentioned_only', 'muted'])
  level!: 'watching' | 'tracking' | 'mentioned_only' | 'muted' | null;
}

export class BadgeCriteriaDto {
  @IsIn(['post_count', 'account_age_days', 'likes_received'])
  kind!: 'post_count' | 'account_age_days' | 'likes_received';

  @IsInt()
  @Min(1)
  threshold!: number;
}

export class CreateBadgeDto {
  @IsString()
  @Length(2, 64)
  key!: string;

  @IsString()
  @Length(2, 80)
  nameRo!: string;

  @IsString()
  @Length(2, 80)
  nameEn!: string;

  @IsString()
  @Length(2, 32)
  category!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descriptionRo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descriptionEn?: string;

  @IsObject()
  criteria!: { kind: string; threshold: number };

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateBadgeDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  nameRo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @Length(2, 32)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descriptionRo?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descriptionEn?: string | null;

  @IsOptional()
  @IsObject()
  criteria?: { kind: string; threshold: number };

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
