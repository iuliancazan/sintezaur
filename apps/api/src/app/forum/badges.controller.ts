import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { BadgeAwardingService } from './badge-awarding.service';
import { BadgesService } from './badges.service';
import { CreateBadgeDto, UpdateBadgeDto } from './forum.dto';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

function isAdmin(user: AuthenticatedUser): boolean {
  return user.roles.some((r) => ADMIN_ROLES.has(r));
}

/**
 * Public read for badge catalog (used by site to render user profiles)
 * + admin CRUD (used by dashboard `/badges`).
 *
 * Read paths anonymous:
 *   GET /badges                       — full catalog (for category labels)
 *   GET /badges/users/:username       — awards for a profile
 *
 * Write paths admin-only:
 *   POST   /badges
 *   PATCH  /badges/:id
 *   DELETE /badges/:id
 *   POST   /badges/sweep              — manual re-evaluation
 */
@Controller('badges')
export class BadgesController {
  constructor(
    private readonly badges: BadgesService,
    private readonly awarding: BadgeAwardingService,
  ) {}

  @Get()
  @Public()
  list() {
    return this.badges.listAll();
  }

  @Get('users/:username')
  @Public()
  listForUsername(@Param('username') username: string) {
    return this.badges.listForUsername(username);
  }

  /* ============ admin ============ */

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBadgeDto,
  ) {
    if (!isAdmin(user)) throw new ForbiddenException();
    return this.badges.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBadgeDto,
  ) {
    if (!isAdmin(user)) throw new ForbiddenException();
    return this.badges.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!isAdmin(user)) throw new ForbiddenException();
    return this.badges.delete(id);
  }

  /**
   * Manually trigger the awarding sweep across all users (useful right
   * after adding a new badge from dashboard so it propagates without
   * waiting for the nightly cron). Admin-only.
   */
  @Post('sweep')
  @UseGuards(JwtAuthGuard)
  async sweep(@CurrentUser() user: AuthenticatedUser) {
    if (!isAdmin(user)) throw new ForbiddenException();
    const total = await this.awarding.evaluateAll();
    return { awarded: total };
  }
}
