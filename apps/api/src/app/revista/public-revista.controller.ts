import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import { ArticlesService } from './articles.service';
import { ListArticlesQueryDto } from './revista.dto';

@Controller('revista')
@Public()
export class PublicRevistaController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query() q: ListArticlesQueryDto) {
    return this.articles.listPublic(q);
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const data = await this.articles.findBySlug(slug);
    if (!data) {
      // Spec §7.13: try a 30-day slug redirect. On expiry the row stays
      // but `expired=true` → site router decides 301 vs 410.
      const redirect = await this.articles.lookupSlugRedirect(slug);
      if (redirect) {
        throw new NotFoundException({
          message: redirect.expired ? 'gone' : 'redirect',
          redirectTo: `/revista/${redirect.newSlug}`,
        });
      }
      throw new NotFoundException(`article ${slug} not found`);
    }
    this.articles.bumpViewCount(data.article.id);
    return data;
  }
}

@Controller('autor')
@Public()
export class PublicAuthorController {
  constructor(private readonly articles: ArticlesService) {}

  @Get(':username')
  async profile(@Param('username') username: string) {
    const data = await this.articles.authorProfile(username);
    if (!data) throw new NotFoundException(`author ${username} not found`);
    return data;
  }
}
