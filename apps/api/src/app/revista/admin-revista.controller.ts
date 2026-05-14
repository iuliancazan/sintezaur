import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { ArticlesService } from './articles.service';

/**
 * Admin moderation surface. Powers the dashboard list + audit-only
 * actions: see every article regardless of status / unarchive a
 * dead article. Per spec §8.3 editors do their work inline on the
 * site; the dashboard is only for admins.
 */
@Controller('admin/revista')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('admin', 'superadmin')
export class AdminRevistaController {
  constructor(private readonly articles: ArticlesService) {}

  @Get('articles')
  list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('authorId') authorId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.articles.listForAdmin({
      status,
      q,
      authorId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('articles/:id/unarchive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unarchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.articles.unarchive(user.sub, id);
  }
}
