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
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  CurrentUser,
  JwtAuthGuard,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type { Request } from 'express';
import { TezaurService } from './tezaur.service';
import { GearReviewService } from './gear-review.service';
import { StorageService } from '../common/storage.service';
import type {
  CreateGearDto,
  CreateGearFamilyDto,
  CreateGearLinkDto,
  CreateGearRelationshipDto,
  CreateGearVideoDto,
  ListModerationQueueDto,
  MergeGearFamilyDto,
  RejectGearDto,
  RenameBrandDto,
  UpdateGearDto,
  UpdateGearFamilyDto,
  UpsertGearDescriptionDto,
} from './tezaur.dto';

/**
 * Catalog-editor surface for Tezaur. Mounted at `/api/admin/tezaur/...`
 * (the path is a legacy convention — `curator` doesn't enter the
 * dashboard; the dashboard UI for these endpoints lives only for
 * `admin`/`superadmin`). Public read surface is `/api/tezaur/...`.
 *
 * Role gating per spec §7.2:
 *   - `curator` (or higher) edits catalog entries
 *   - `admin`/`superadmin` can also soft-delete / restore
 *   - `moderator`/`admin`/`superadmin` can mod-hide gear reviews
 *
 * `contributor` (auto-granted at 100 forum posts) gets create + edit-own
 * lands later — needs an ownership check in the service layer that
 * isn't wired yet.
 */
@Controller('admin/tezaur')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('curator', 'admin', 'superadmin')
export class AdminTezaurController {
  constructor(
    private readonly tezaur: TezaurService,
    private readonly reviews: GearReviewService,
  ) {}

  /* gear */
  @Post('gear')
  createGear(
    @Body() dto: CreateGearDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tezaur.createGear(dto, user.sub, req);
  }

  @Patch('gear/:id')
  updateGear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGearDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tezaur.updateGear(id, dto, user.sub, req);
  }

  @Delete('gear/:id')
  @RolesAllowed('admin', 'superadmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteGear(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.tezaur.softDeleteGear(id, user.sub, req);
  }

  @Post('gear/:id/restore')
  @RolesAllowed('admin', 'superadmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreGear(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.tezaur.restoreGear(id, user.sub, req);
  }

  /* canonical (official) forum thread per spec §8.1 — editor toggle. */

  @Post('gear/:id/canonical-thread')
  enableOfficial(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tezaur.enableOfficialThread(id, user.sub, req);
  }

  @Delete('gear/:id/canonical-thread')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableOfficial(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.tezaur.disableOfficialThread(id, user.sub, req);
  }

  /* description */
  @Put('gear/:id/description')
  @HttpCode(HttpStatus.NO_CONTENT)
  async upsertDescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertGearDescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.tezaur.upsertDescription(id, dto, user.sub);
  }

  /* image */
  @Post('gear/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_INPUT_BYTES },
    }),
  )
  attachImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tezaur.attachImage(id, user.sub, file, caption);
  }

  @Delete('gear/:id/images/:sourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    await this.tezaur.detachImage(id, sourceId);
  }

  /* video */
  @Post('gear/:id/videos')
  addVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGearVideoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tezaur.addVideo(id, dto, user.sub);
  }

  @Delete('gear/:id/videos/:videoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('videoId', ParseUUIDPipe) videoId: string,
  ) {
    await this.tezaur.removeVideo(id, videoId);
  }

  /* link */
  @Post('gear/:id/links')
  addLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGearLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tezaur.addLink(id, dto, user.sub);
  }

  @Delete('gear/:id/links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    await this.tezaur.removeLink(id, linkId);
  }

  /* relationship */
  @Post('gear/:id/relationships')
  addRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGearRelationshipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tezaur.addRelationship(id, dto, user.sub);
  }

  @Delete('relationships/:relId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRelationship(@Param('relId', ParseUUIDPipe) relId: string) {
    await this.tezaur.removeRelationship(relId);
  }

  /* family */
  @Post('families')
  createFamily(
    @Body() dto: CreateGearFamilyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tezaur.createFamily(dto, user.sub, req);
  }

  @Patch('families/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateFamily(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGearFamilyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.tezaur.updateFamily(id, dto, user.sub, req);
  }

  @Get('families')
  listFamilies() {
    return this.tezaur.listFamilies();
  }

  /** Admin-only listing with gear count + timestamps for the families page. */
  @Get('families/admin')
  listFamiliesAdmin() {
    return this.tezaur.listFamiliesAdmin();
  }

  @Delete('families/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFamily(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.tezaur.deleteFamily(id, user.sub, req);
  }

  @Post('families/:id/merge')
  async mergeFamily(
    @Param('id', ParseUUIDPipe) fromId: string,
    @Body() dto: MergeGearFamilyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tezaur.mergeFamilies(fromId, dto.intoId, user.sub, req);
  }

  /* ============================================================
     brands admin
     ============================================================ */

  @Get('brands')
  listBrandsAdmin() {
    return this.tezaur.listBrandsAdmin();
  }

  @Post('brands/rename')
  async renameBrand(
    @Body() dto: RenameBrandDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.tezaur.renameBrand(
      dto.from,
      dto.to,
      dto.caseInsensitive ?? false,
      user.sub,
      req,
    );
  }

  /* ============================================================
     moderation queue (community contributions per spec §7.2)
     ============================================================ */

  @Get('moderation')
  listModeration(@Query() q: ListModerationQueueDto) {
    return this.tezaur.listModeration(q);
  }

  @Post('gear/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approveGear(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.tezaur.approveGear(id, user.sub, req);
  }

  @Post('gear/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectGear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectGearDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.tezaur.rejectGear(id, user.sub, dto.reason, req);
  }

  /* mod-hide review */
  @Post('reviews/:reviewId/hide')
  @RolesAllowed('moderator', 'admin', 'superadmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hideReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.reviews.modHide(reviewId, user.sub, reason ?? '', req);
  }
}
