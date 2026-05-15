import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

const FEEDBACK_KINDS = ['bug', 'sugestie', 'altele'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

const FEEDBACK_STATUSES = ['new', 'read', 'archived'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_KINDS)
  kind!: FeedbackKind;

  @IsString()
  @Length(10, 10_000)
  body!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2_000)
  pageUrl?: string;
}

export class UpdateFeedbackDto {
  @IsIn(['read', 'archived'])
  status!: 'read' | 'archived';
}

export class ListFeedbackQueryDto {
  @IsOptional()
  @IsIn(FEEDBACK_STATUSES)
  status?: FeedbackStatus;

  @IsOptional()
  @IsIn(FEEDBACK_KINDS)
  kind?: FeedbackKind;

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
