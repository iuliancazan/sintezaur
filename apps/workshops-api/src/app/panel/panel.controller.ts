import {
  Body,
  ConflictException,
  Controller,
  Delete,
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
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import bcrypt from 'bcryptjs';
import { and, count, countDistinct, desc, eq, sql } from 'drizzle-orm';
import { RequireRoles } from '../auth/roles';
import { SUPERADMIN_USERNAME } from '../auth/auth.service';
import { DbService } from '../db/db.service';
import {
  accessEvents,
  workshopAccounts,
  workshops,
} from '../../db/schema';

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

class CreateAccountDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{1,31}$/, {
    message:
      'username must be lowercase letters/digits/dots/dashes, 2–32 chars',
  })
  username!: string;

  @IsIn(['guest', 'admin'])
  role!: 'guest' | 'admin';

  @IsString()
  @MinLength(8)
  password!: string;
}

class SetAccountPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

/** Postgres unique-violation (23505), possibly wrapped by drizzle. */
function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 4; depth++) {
    if ((current as { code?: string }).code === '23505') {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

const accountColumns = {
  id: workshopAccounts.id,
  username: workshopAccounts.username,
  role: workshopAccounts.role,
  updatedAt: workshopAccounts.updatedAt,
};

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
    try {
      const inserted = await this.db
        .insert(workshops)
        .values({ ...dto })
        .returning({ id: workshops.id });
      return this.getOne(inserted[0].id);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('slug_taken');
      }
      throw err;
    }
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

  @Get(':id/accounts')
  listAccounts(@Param('id', ParseUUIDPipe) id: string) {
    return this.db
      .select(accountColumns)
      .from(workshopAccounts)
      .where(eq(workshopAccounts.workshopId, id))
      .orderBy(workshopAccounts.createdAt);
  }

  @Post(':id/accounts')
  async createAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAccountDto,
  ) {
    const username = dto.username.toLowerCase();
    if (username === SUPERADMIN_USERNAME) {
      throw new ConflictException('reserved_username');
    }
    const existing = await this.db
      .select({ id: workshopAccounts.id })
      .from(workshopAccounts)
      .where(
        and(
          eq(workshopAccounts.workshopId, id),
          eq(workshopAccounts.username, username),
        ),
      );
    if (existing.length > 0) {
      throw new ConflictException('username_taken');
    }
    try {
      await this.db.insert(workshopAccounts).values({
        workshopId: id,
        username,
        role: dto.role,
        passwordHash: bcrypt.hashSync(dto.password, 12),
      });
    } catch (err) {
      // Concurrent create racing past the pre-check hits the unique index.
      if (isUniqueViolation(err)) {
        throw new ConflictException('username_taken');
      }
      throw err;
    }
    return this.listAccounts(id);
  }

  @Put(':id/accounts/:accountId/password')
  async setAccountPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: SetAccountPasswordDto,
  ) {
    const updated = await this.db
      .update(workshopAccounts)
      .set({
        passwordHash: bcrypt.hashSync(dto.password, 12),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workshopAccounts.id, accountId),
          eq(workshopAccounts.workshopId, id),
        ),
      )
      .returning({ id: workshopAccounts.id });
    if (updated.length === 0) {
      throw new NotFoundException();
    }
    return this.listAccounts(id);
  }

  @Delete(':id/accounts/:accountId')
  async deleteAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    const deleted = await this.db
      .delete(workshopAccounts)
      .where(
        and(
          eq(workshopAccounts.id, accountId),
          eq(workshopAccounts.workshopId, id),
        ),
      )
      .returning({ id: workshopAccounts.id });
    if (deleted.length === 0) {
      throw new NotFoundException();
    }
    return this.listAccounts(id);
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
