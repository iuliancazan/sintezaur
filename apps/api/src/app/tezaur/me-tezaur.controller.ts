import {
  Body,
  Controller,
  Delete,
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
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { GearReviewService } from './gear-review.service';
import { UserGearStatusService } from './user-gear-status.service';
import type {
  CreateGearReviewDto,
  SetGearStatusDto,
  UpdateGearReviewDto,
} from './tezaur.dto';

/**
 * Logged-in user surface for personal collection + own reviews.
 *
 * Cookie-based auth via the global JwtAuthGuard; we re-apply UseGuards
 * here so the controller still works if app-level guards are bypassed
 * by future config.
 */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeTezaurController {
  constructor(
    private readonly collection: UserGearStatusService,
    private readonly reviews: GearReviewService,
  ) {}

  /* ============ personal collection ============ */

  @Get('gear-status')
  listMyCollection(@CurrentUser() user: AuthenticatedUser) {
    return this.collection.listForUser(user.sub);
  }

  @Get('gear-status/:gearId')
  listForGear(
    @CurrentUser() user: AuthenticatedUser,
    @Param('gearId', ParseUUIDPipe) gearId: string,
  ) {
    return this.collection.listForUserAndGear(user.sub, gearId);
  }

  @Post('gear-status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async set(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetGearStatusDto,
  ) {
    await this.collection.set(user.sub, dto);
  }

  @Delete('gear-status/:gearId/:status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('gearId', ParseUUIDPipe) gearId: string,
    @Param('status') status: SetGearStatusDto['status'],
  ) {
    await this.collection.unset(user.sub, gearId, status);
  }

  /* ============ reviews (own) ============ */

  @Post('reviews/:gearId')
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('gearId', ParseUUIDPipe) gearId: string,
    @Body() dto: CreateGearReviewDto,
  ) {
    return this.reviews.create(gearId, user.sub, dto);
  }

  @Patch('reviews/:reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateGearReviewDto,
  ) {
    await this.reviews.update(reviewId, user.sub, dto);
  }

  @Delete('reviews/:reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ) {
    await this.reviews.deleteOwn(reviewId, user.sub);
  }

  @Get('reviews/mine/:gearId')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('gearId', ParseUUIDPipe) gearId: string,
  ) {
    return this.reviews.findMine(gearId, user.sub);
  }
}
