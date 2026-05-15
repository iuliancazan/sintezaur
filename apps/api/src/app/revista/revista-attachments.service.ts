import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  articles,
  revistaArticleAttachments,
  type SintezaurDb,
  type StorageAttachmentKind,
} from '@sintezaur/db';
import { and, asc, eq, sql } from 'drizzle-orm';
import { StorageService } from '../common/storage.service';
import { detectFileType } from '../storage/file-type-detector';
import { UploadQuotaService } from '../storage/upload-quota.service';

export interface RevistaAttachmentDto {
  id: string;
  articleId: string;
  kind: StorageAttachmentKind;
  url: string;
  bytes: number;
  contentType: string;
  originalFilename: string;
  caption: string | null;
  position: number;
  createdAt: string;
}

/**
 * Revista article attachments per spec §M7 ("no hard cap, quota only").
 * Image inline embeds stay in Tiptap body; this service handles only
 * the non-image kinds: audio, PDF, ZIP.
 *
 * Authorization: only the article author can add or remove. Admins
 * + editors can also modify any article — kept consistent with how
 * `ArticlesService.requireOwnable` works.
 */
@Injectable()
export class RevistaAttachmentsService {
  private readonly logger = new Logger(RevistaAttachmentsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly storage: StorageService,
    private readonly quota: UploadQuotaService,
  ) {}

  async addAttachment(
    actorId: string,
    actorIsPrivileged: boolean,
    articleId: string,
    originalFilename: string,
    caption: string | null | undefined,
    file: Express.Multer.File,
  ): Promise<RevistaAttachmentDto> {
    await this.requireWritable(actorId, actorIsPrivileged, articleId);

    const detected = detectFileType(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        'Tip de fișier nedetectat. Acceptăm audio (MP3/WAV/OGG), PDF, ZIP.',
      );
    }
    if (detected.fileType === 'image') {
      throw new BadRequestException(
        'Imaginile se inserează direct în corpul articolului, nu ca atașament.',
      );
    }

    const processed = await this.processByKind(
      detected.fileType as StorageAttachmentKind,
      articleId,
      file,
      actorId,
    );

    const position = await this.nextPosition(articleId);
    const trimmedCaption = caption?.trim() || null;

    const [row] = await this.db
      .insert(revistaArticleAttachments)
      .values({
        articleId,
        uploadedBy: actorId,
        kind: processed.kind,
        objectKey: processed.objectKey,
        originalFilename: this.sanitizeFilename(originalFilename),
        contentType: processed.contentType,
        bytes: processed.bytes,
        contentHash: processed.contentHash,
        caption: trimmedCaption,
        position,
      })
      .returning({
        id: revistaArticleAttachments.id,
        createdAt: revistaArticleAttachments.createdAt,
      });

    return {
      id: row.id,
      articleId,
      kind: processed.kind,
      url: this.storage.url(processed.objectKey),
      bytes: processed.bytes,
      contentType: processed.contentType,
      originalFilename: this.sanitizeFilename(originalFilename),
      caption: trimmedCaption,
      position,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async removeAttachment(
    actorId: string,
    actorIsPrivileged: boolean,
    articleId: string,
    attachmentId: string,
  ): Promise<void> {
    await this.requireWritable(actorId, actorIsPrivileged, articleId);
    const [row] = await this.db
      .select({
        id: revistaArticleAttachments.id,
        objectKey: revistaArticleAttachments.objectKey,
        bytes: revistaArticleAttachments.bytes,
      })
      .from(revistaArticleAttachments)
      .where(
        and(
          eq(revistaArticleAttachments.id, attachmentId),
          eq(revistaArticleAttachments.articleId, articleId),
        ),
      )
      .limit(1);
    if (!row)
      throw new NotFoundException(`atașament ${attachmentId} inexistent`);

    await this.db
      .delete(revistaArticleAttachments)
      .where(eq(revistaArticleAttachments.id, attachmentId));
    await this.storage.deleteObjects([row.objectKey]);
    await this.quota.untrack('revista', articleId, Number(row.bytes));
  }

  async listForArticle(articleId: string): Promise<RevistaAttachmentDto[]> {
    const rows = await this.db
      .select()
      .from(revistaArticleAttachments)
      .where(eq(revistaArticleAttachments.articleId, articleId))
      .orderBy(asc(revistaArticleAttachments.position));
    return rows.map((r) => ({
      id: r.id,
      articleId: r.articleId,
      kind: r.kind,
      url: this.storage.url(r.objectKey),
      bytes: Number(r.bytes),
      contentType: r.contentType,
      originalFilename: r.originalFilename,
      caption: r.caption,
      position: r.position,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async requireWritable(
    actorId: string,
    actorIsPrivileged: boolean,
    articleId: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({ id: articles.id, authorId: articles.authorId })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);
    if (!row) throw new NotFoundException(`articol ${articleId} inexistent`);
    if (!actorIsPrivileged && row.authorId !== actorId) {
      throw new ForbiddenException(
        'Doar autorul articolului poate gestiona atașamentele.',
      );
    }
  }

  private async nextPosition(articleId: string): Promise<number> {
    const [row] = await this.db
      .select({
        max: sql<number>`coalesce(max(${revistaArticleAttachments.position}), -1)`,
      })
      .from(revistaArticleAttachments)
      .where(eq(revistaArticleAttachments.articleId, articleId));
    return (row?.max ?? -1) + 1;
  }

  private async processByKind(
    kind: StorageAttachmentKind,
    articleId: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    switch (kind) {
      case 'audio':
        return this.storage.processAudio('revista', articleId, file, actorId);
      case 'pdf':
        return this.storage.processPdf('revista', articleId, file, actorId);
      case 'zip':
        return this.storage.processZip('revista', articleId, file, actorId);
      default:
        throw new BadRequestException(`Tip atașament neacceptat: ${kind}.`);
    }
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[\\/]/g, '_')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f]/g, '')
      .slice(0, 200) || 'file';
  }
}
