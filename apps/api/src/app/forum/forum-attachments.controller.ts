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
import { ForumAttachmentsService } from './forum-attachments.service';

class UploadAttachmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;
}

/**
 * `POST   /forum/posts/:postId/attachments` — multipart upload, body
 *                                              field `file`. Returns
 *                                              the persisted attachment row.
 * `DELETE /forum/posts/:postId/attachments/:attachmentId` — owner-only.
 *
 * Authentication: requires a logged-in user (the global JwtAuthGuard
 * already enforces this; not marked `@Public`).
 */
@Controller('forum/posts/:postId/attachments')
export class ForumAttachmentsController {
  constructor(private readonly attachments: ForumAttachmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_ATTACHMENT_INPUT_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId', ParseUUIDPipe) postId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
  ) {
    return this.attachments.addAttachment(
      user.sub,
      postId,
      dto.filename ?? file.originalname ?? 'file',
      file,
    );
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.attachments.removeAttachment(user.sub, postId, attachmentId);
  }
}
