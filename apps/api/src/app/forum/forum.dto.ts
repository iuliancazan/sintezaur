import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
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
