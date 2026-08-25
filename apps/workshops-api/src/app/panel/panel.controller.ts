import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import bcrypt from 'bcryptjs';
import { count, countDistinct, desc, eq, sql } from 'drizzle-orm';
import { RequireRoles } from '../auth/roles';
import { DbService } from '../db/db.service';
import { accessEvents, workshops } from '../../db/schema';

class CreateWorkshopDto {
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case (a-z, 0-9, dashes)',
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @IsString()
  @IsNotEmpty()
  titleRo!: string;

  @IsString()
  @IsOptional()
  subtitleEn?: string;

  @IsString()
  @IsOptional()
  subtitleRo?: string;

  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @IsString()
  @IsOptional()
  venue?: string;
}

class UpdateWorkshopDto {
  @IsString()
  @IsOptional()
  titleEn?: string;

  @IsString()
  @IsOptional()
  titleRo?: string;

  @IsString()
  @IsOptional()
  subtitleEn?: string;

  @IsString()
  @IsOptional()
  subtitleRo?: string;

  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsBoolean()
  @IsOptional()
  guestSeesSlides?: boolean;
}

class SetPasswordsDto {
  @IsString()
  @MinLength(8)
  @IsOptional()
  guestPassword?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  adminPassword?: string;
}

/** Workshop row shape returned to the panel — never includes hashes. */
const panelWorkshopColumns = {
  id: workshops.id,
  slug: workshops.slug,
  titleEn: workshops.titleEn,
  titleRo: workshops.titleRo,
  subtitleEn: workshops.subtitleEn,
  subtitleRo: workshops.subtitleRo,
  eventDate: workshops.eventDate,
  venue: workshops.venue,
  published: workshops.published,
  guestSeesSlides: workshops.guestSeesSlides,
  hasGuestPassword: sql<boolean>`(${workshops.guestPasswordHash} is not null)`,
  hasAdminPassword: sql<boolean>`(${workshops.adminPasswordHash} is not null)`,
  createdAt: workshops.createdAt,
};

@Controller('panel/workshops')
@RequireRoles('superadmin')
export class PanelController {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  @Get()
  list() {
    return this.db
      .select(panelWorkshopColumns)
      .from(workshops)
      .orderBy(workshops.createdAt);
  }

  @Post()
  async create(@Body() dto: CreateWorkshopDto) {
    const inserted = await this.db
      .insert(workshops)
      .values({ ...dto })
      .returning({ id: workshops.id });
    return this.getOne(inserted[0].id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopDto,
  ) {
    const updated = await this.db
      .update(workshops)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(workshops.id, id))
      .returning({ id: workshops.id });
    if (updated.length === 0) {
      throw new NotFoundException();
    }
    return this.getOne(id);
  }

  @Put(':id/passwords')
  async setPasswords(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPasswordsDto,
  ) {
    const patch: Record<string, string | Date> = { updatedAt: new Date() };
    if (dto.guestPassword) {
      patch['guestPasswordHash'] = bcrypt.hashSync(dto.guestPassword, 12);
    }
    if (dto.adminPassword) {
      patch['adminPasswordHash'] = bcrypt.hashSync(dto.adminPassword, 12);
    }
    const updated = await this.db
      .update(workshops)
      .set(patch)
      .where(eq(workshops.id, id))
      .returning({ id: workshops.id });
    if (updated.length === 0) {
      throw new NotFoundException();
    }
    return this.getOne(id);
  }

  @Get(':id/stats')
  async stats(@Param('id', ParseUUIDPipe) id: string) {
    const logins = await this.db
      .select({ role: accessEvents.role, total: count() })
      .from(accessEvents)
      .where(
        sql`${accessEvents.workshopId} = ${id} and ${accessEvents.event} = 'login'`,
      )
      .groupBy(accessEvents.role);

    const views = await this.db
      .select({
        document: accessEvents.document,
        event: accessEvents.event,
        total: count(),
      })
      .from(accessEvents)
      .where(
        sql`${accessEvents.workshopId} = ${id} and ${accessEvents.event} in ('view', 'download')`,
      )
      .groupBy(accessEvents.document, accessEvents.event);

    const uniques = await this.db
      .select({ total: countDistinct(accessEvents.visitorId) })
      .from(accessEvents)
      .where(eq(accessEvents.workshopId, id));

    const recent = await this.db
      .select({
        role: accessEvents.role,
        event: accessEvents.event,
        document: accessEvents.document,
        lang: accessEvents.lang,
        createdAt: accessEvents.createdAt,
      })
      .from(accessEvents)
      .where(eq(accessEvents.workshopId, id))
      .orderBy(desc(accessEvents.createdAt))
      .limit(20);

    return {
      logins,
      views,
      uniqueVisitors: uniques[0]?.total ?? 0,
      recent,
    };
  }

  private async getOne(id: string) {
    const rows = await this.db
      .select(panelWorkshopColumns)
      .from(workshops)
      .where(eq(workshops.id, id));
    if (rows.length === 0) {
      throw new NotFoundException();
    }
    return rows[0];
  }
}
