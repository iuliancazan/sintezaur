import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import type { Request } from 'express';
import {
  ListListingsQueryDto,
  QuickListSuggestionQueryDto,
  RecentlySoldQueryDto,
} from './bazar.dto';
import { ListingsService } from './listings.service';

@Controller('bazar')
@Public()
export class PublicBazarController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list(@Query() q: ListListingsQueryDto, @Req() req: Request) {
    // viewer is optional — pass undefined when not logged in. Sub claim
    // is set by JwtAuthGuard when a valid cookie is present.
    const viewerId = (req as { user?: { sub?: string } }).user?.sub;
    return this.listings.listPublic(q, viewerId);
  }

  @Get('quick-list')
  async quickList(@Query() q: QuickListSuggestionQueryDto) {
    const sug = await this.listings.quickListSuggestion(q.gearId);
    if (!sug) throw new NotFoundException(`gear ${q.gearId} not found`);
    return sug;
  }

  @Get('recently-sold')
  async recentlySold(@Query() q: RecentlySoldQueryDto) {
    return { items: await this.listings.recentlySold(q) };
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string, @Req() req: Request) {
    const viewerId = (req as { user?: { sub?: string } }).user?.sub;
    const data = await this.listings.findBySlug(slug, viewerId);
    if (!data) throw new NotFoundException(`listing ${slug} not found`);
    return data;
  }
}
