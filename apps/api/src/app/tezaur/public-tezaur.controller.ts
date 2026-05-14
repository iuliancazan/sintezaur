import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import { GearReviewService } from './gear-review.service';
import { TezaurService } from './tezaur.service';
import type { ListGearQueryDto } from './tezaur.dto';

/**
 * Public read-only Tezaur surface. Unauthenticated requests work; the
 * global guard short-circuits on `@Public()`.
 */
@Controller('tezaur')
@Public()
export class PublicTezaurController {
  constructor(
    private readonly tezaur: TezaurService,
    private readonly reviews: GearReviewService,
  ) {}

  @Get()
  list(@Query() q: ListGearQueryDto) {
    return this.tezaur.listPublic(q);
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const data = await this.tezaur.findBySlug(slug, 'ro');
    if (!data) {
      // Try a slug redirect (spec §7.13). On hit, return 410-ish hint —
      // the site router will issue an HTTP 301 client-side.
      const redirect = await this.tezaur.lookupSlugRedirect('gear', slug);
      if (redirect) {
        throw new NotFoundException({
          message: 'redirect',
          redirectTo: `/tezaur/${redirect.newSlug}`,
        });
      }
      throw new NotFoundException(`gear ${slug} not found`);
    }
    return data;
  }

  @Get(':slug/reviews')
  async listReviews(
    @Param('slug') slug: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    const found = await this.tezaur.findBySlug(slug, 'ro');
    if (!found) throw new NotFoundException(`gear ${slug} not found`);
    return this.reviews.listForGear(found.gear.id, { page, pageSize });
  }
}
