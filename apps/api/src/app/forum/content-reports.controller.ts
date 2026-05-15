import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type {
  ContentReportStatus,
  ContentReportTarget,
} from '@sintezaur/db';
import type { Request } from 'express';
import { AntiSpamService } from './anti-spam.service';
import { ContentReportsService } from './content-reports.service';
import { CreateReportDto, ResolveReportDto } from './forum.dto';

const MOD_ROLES = new Set(['moderator', 'admin', 'superadmin']);

function isMod(user: AuthenticatedUser): boolean {
  return user.roles.some((r) => MOD_ROLES.has(r));
}

/**
 * Spec §7.10: polymorphic abuse-report queue. Endpoints:
 *
 *   POST  /content-reports                (auth) — create a report
 *   GET   /content-reports                (mod)  — list with filters
 *   PATCH /content-reports/:id/resolve    (mod)  — resolve (+ optional combined action)
 *
 * Forum surfaces are wired in M5-G; Bazar / Tezaur add their own
 * create endpoints (or share this one) when those surfaces land.
 */
@Controller('content-reports')
@UseGuards(JwtAuthGuard)
export class ContentReportsController {
  constructor(
    private readonly reports: ContentReportsService,
    private readonly antiSpam: AntiSpamService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
    @Req() req: Request,
  ) {
    this.antiSpam.enforce(req, { hp: dto.hp, formStartedAt: dto.formStartedAt });
    return this.reports.create(user.sub, {
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
    });
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: ContentReportStatus,
    @Query('targetType') targetType?: ContentReportTarget,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!isMod(user)) throw new ForbiddenException();
    return this.reports.list({
      status,
      targetType,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch(':id/resolve')
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
    @Req() req: Request,
  ) {
    if (!isMod(user)) throw new ForbiddenException();
    return this.reports.resolve(
      user.sub,
      id,
      {
        resolution: dto.resolution,
        action: dto.action,
        actionReason: dto.actionReason,
        resolutionNote: dto.resolutionNote,
      },
      req,
    );
  }
}
