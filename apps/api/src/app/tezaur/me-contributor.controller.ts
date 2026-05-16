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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { StorageService } from '../common/storage.service';
import { TezaurService } from './tezaur.service';
import type {
  CreateGearLinkDto,
  CreateGearRelationshipDto,
  MeCreateGearDto,
  MeUpdateGearDto,
  SetImageCropDto,
} from './tezaur.dto';

/**
 * Community contributor surface (spec §7.2). Any authenticated user
 * can create a draft, edit it, attach images / links / relationships,
 * and submit for moderation. The service layer enforces ownership +
 * editable-state preconditions on every mutation.
 *
 * Mounted at `/api/me/tezaur/...` to mirror the existing `/api/me/...`
 * personal-collection controller.
 */
@Controller('me/tezaur')
@UseGuards(JwtAuthGuard)
export class MeContributorController {
  constructor(private readonly tezaur: TezaurService) {}

  /* ---------- drafts ---------- */

  @Get('drafts')
  listMyDrafts(@CurrentUser() user: AuthenticatedUser) {
    return this.tezaur.meListMyDrafts(user.sub);
  }

  /**
   * Brand auto-suggest for the contributor editor. Same shape as the
   * public `/tezaur/meta/brands` endpoint but also includes the calling
   * user's own pending/rejected/submitted drafts — so a brand they just
   * created shows up immediately instead of waiting for moderator approval.
   */
  @Get('meta/brands')
  listMyBrands(@CurrentUser() user: AuthenticatedUser) {
    return this.tezaur.listBrandsForUser(user.sub);
  }

  @Post('gear')
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MeCreateGearDto,
  ) {
    return this.tezaur.meCreateDraft(user.sub, dto);
  }

  @Get('gear/:id')
  getDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tezaur.meGetDraft(id, user.sub);
  }

  @Patch('gear/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MeUpdateGearDto,
  ) {
    await this.tezaur.meUpdateDraft(id, user.sub, dto);
  }

  @Delete('gear/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tezaur.meDeleteDraft(id, user.sub);
  }

  @Post('gear/:id/submit')
  @HttpCode(HttpStatus.NO_CONTENT)
  async submitDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tezaur.meSubmitDraft(id, user.sub);
  }

  /* ---------- images ---------- */

  @Post('gear/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_INPUT_BYTES },
    }),
  )
  attachImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption: string | undefined,
  ) {
    return this.tezaur.meAttachImage(id, user.sub, file, caption);
  }

  @Delete('gear/:id/images/:sourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    await this.tezaur.meDetachImage(id, user.sub, sourceId);
  }

  @Patch('gear/:id/images/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderImages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('sourceIds') sourceIds: string[],
  ) {
    await this.tezaur.meReorderImages(id, user.sub, sourceIds ?? []);
  }

  @Patch('gear/:id/images/:sourceId/crop')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setImageCrop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() dto: SetImageCropDto,
  ) {
    await this.tezaur.meSetImageCrop(id, user.sub, sourceId, {
      x: dto.x,
      y: dto.y,
      w: dto.w,
      h: dto.h,
    });
  }

  /* ---------- links ---------- */

  @Post('gear/:id/links')
  addLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGearLinkDto,
  ) {
    return this.tezaur.meAddLink(id, user.sub, dto);
  }

  @Delete('gear/:id/links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    await this.tezaur.meRemoveLink(id, user.sub, linkId);
  }

  /* ---------- relationships ---------- */

  @Post('gear/:id/relationships')
  addRelationship(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGearRelationshipDto,
  ) {
    return this.tezaur.meAddRelationship(id, user.sub, dto);
  }

  @Delete('gear/:id/relationships/:relId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRelationship(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('relId', ParseUUIDPipe) relId: string,
  ) {
    await this.tezaur.meRemoveRelationship(id, user.sub, relId);
  }
}
