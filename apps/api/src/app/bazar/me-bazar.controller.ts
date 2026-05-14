import {
  Body,
  Controller,
  Delete,
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
import { CreateListingDto, UpdateListingDto } from './bazar.dto';
import { ListingsService } from './listings.service';

@Controller('me/bazar')
@UseGuards(JwtAuthGuard)
export class MeBazarController {
  constructor(private readonly listings: ListingsService) {}

  /* ============ listings ============ */

  @Post('listings')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListingDto,
  ) {
    return this.listings.create(user.sub, dto);
  }

  @Patch('listings/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.update(user.sub, id, dto);
  }

  @Post('listings/:id/refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listings.refresh(user.sub, id);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listings.removeOwn(user.sub, id);
  }

  /* ============ photos ============ */

  @Post('listings/:id/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_INPUT_BYTES },
    }),
  )
  attachPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.listings.attachPhoto(user.sub, id, file);
  }

  @Delete('listings/:id/photos/:sourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    await this.listings.detachPhoto(user.sub, id, sourceId);
  }

  @Post('listings/:id/photos/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('order') order: string[],
  ) {
    await this.listings.reorderPhotos(user.sub, id, order);
  }
}
