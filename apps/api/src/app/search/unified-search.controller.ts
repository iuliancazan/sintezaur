import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UnifiedSearchService } from './unified-search.service';

class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

/**
 * `GET /api/search?q=<term>&limit=<N>` — cross-module search.
 *
 * Public (no auth required). Hits Tezaur + Bazar + Revista + Forum in
 * parallel; each section returns its top N (default 5, max 20) with
 * its own native item shape — frontend renders 4 grouped cards with
 * a "Vezi toate" deep-link per section.
 */
@Controller('search')
@Public()
export class UnifiedSearchController {
  constructor(private readonly svc: UnifiedSearchService) {}

  @Get()
  search(@Query() q: SearchQueryDto) {
    return this.svc.search(q.q ?? '', q.limit);
  }
}
