import { Controller, Get } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { workshops } from '../../db/schema';

/**
 * Unauthenticated, deliberately minimal: just what the login screen needs
 * to render its workshop picker (title metadata is not secret).
 */
@Controller('workshops')
export class PublicWorkshopsController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  async listPublished() {
    return this.dbService.db
      .select({
        slug: workshops.slug,
        titleEn: workshops.titleEn,
        titleRo: workshops.titleRo,
      })
      .from(workshops)
      .where(eq(workshops.published, true))
      .orderBy(workshops.createdAt);
  }
}
