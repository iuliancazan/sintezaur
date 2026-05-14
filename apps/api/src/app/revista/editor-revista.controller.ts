import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { StorageService } from '../common/storage.service';
import { ArticlesService } from './articles.service';
import {
  CreateArticleDto,
  RenameSlugDto,
  UpdateArticleDto,
  UploadArticleImageDto,
} from './revista.dto';

/**
 * Editor surface — `/me/revista/*`. Spec §8.3: editors work inline
 * on the public site (not in the dashboard), so these endpoints sit
 * under the `/me/` namespace alongside Bazar's seller endpoints.
 *
 * Role gate: `editor`, `admin`, `superadmin`. Admins implicitly bypass
 * the "own article" check inside ArticlesService.
 */
@Controller('me/revista')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('editor', 'admin', 'superadmin')
export class EditorRevistaController {
  constructor(private readonly articles: ArticlesService) {}

  @Get('articles/:id')
  async getOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.articles.findOwnedById(
      user.sub,
      isAdmin(user),
      id,
    );
    if (!data) throw new NotFoundException(`article ${id} not found`);
    return data;
  }

  @Post('articles')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateArticleDto,
  ) {
    return this.articles.create(user.sub, dto);
  }

  @Patch('articles/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articles.update(user.sub, isAdmin(user), id, dto);
  }

  @Patch('articles/:id/slug')
  renameSlug(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameSlugDto,
  ) {
    return this.articles.renameSlug(user.sub, isAdmin(user), id, dto.slug);
  }

  @Post('articles/:id/publish')
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.articles.publish(user.sub, isAdmin(user), id, req);
  }

  @Post('articles/:id/unpublish')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.articles.unpublish(user.sub, isAdmin(user), id);
  }

  @Post('articles/:id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.articles.archive(user.sub, isAdmin(user), id);
  }

  /* ============ images ============ */

  @Post('articles/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_INPUT_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadArticleImageDto,
  ) {
    return this.articles.attachImage(
      user.sub,
      isAdmin(user),
      id,
      file,
      dto.caption,
    );
  }

  @Delete('articles/:id/images/:sourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    await this.articles.detachImage(user.sub, isAdmin(user), id, sourceId);
  }
}

function isAdmin(user: AuthenticatedUser): boolean {
  return user.roles.some((r) => r === 'admin' || r === 'superadmin');
}
