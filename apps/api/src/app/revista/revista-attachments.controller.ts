import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthenticatedUser } from '@sintezaur/auth';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { StorageService } from '../common/storage.service';
import { RevistaAttachmentsService } from './revista-attachments.service';

class UploadRevistaAttachmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}

/**
 * `POST   /revista/articles/:articleId/attachments` — multipart upload.
 * `DELETE /revista/articles/:articleId/attachments/:attachmentId` — owner-only
 *                                                                   (or editor/admin).
 */
@Controller('revista/articles/:articleId/attachments')
export class RevistaAttachmentsController {
  constructor(
    private readonly attachments: RevistaAttachmentsService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_ATTACHMENT_INPUT_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadRevistaAttachmentDto,
  ) {
    return this.attachments.addAttachment(
      user.sub,
      hasPrivilegedRole(user),
      articleId,
      dto.filename ?? file.originalname ?? 'file',
      dto.caption,
      file,
    );
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.attachments.removeAttachment(
      user.sub,
      hasPrivilegedRole(user),
      articleId,
      attachmentId,
    );
  }
}

function hasPrivilegedRole(user: AuthenticatedUser): boolean {
  return user.roles.some(
    (r) => r === 'admin' || r === 'superadmin' || r === 'editor',
  );
}
