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
  forumPostAttachments,
  forumPosts,
  type SintezaurDb,
  type StorageAttachmentKind,
} from '@sintezaur/db';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { StorageService } from '../common/storage.service';
import { detectFileType } from '../storage/file-type-detector';
import { UploadQuotaService } from '../storage/upload-quota.service';

const MAX_ATTACHMENTS_PER_POST = 3;

export interface ForumAttachmentDto {
  id: string;
  postId: string;
  kind: StorageAttachmentKind;
  url: string;
  bytes: number;
  contentType: string;
  originalFilename: string;
  position: number;
  createdAt: string;
}

/**
 * Forum attachments per spec §M7 ("max 3 attachments/post, any mix
 * of audio/PDF/ZIP"). Image inline embeds stay in Tiptap body (no
 * change there); this service handles only the three non-image kinds.
 *
 * Authorization: only the post's author can add or remove. Mods can
 * remove via the existing mod surface (kept separate).
 */
@Injectable()
export class ForumAttachmentsService {
  private readonly logger = new Logger(ForumAttachmentsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly storage: StorageService,
    private readonly quota: UploadQuotaService,
  ) {}

  async addAttachment(
    actorId: string,
    postId: string,
    originalFilename: string,
    file: Express.Multer.File,
  ): Promise<ForumAttachmentDto> {
    const post = await this.requireOwnedPost(actorId, postId);

    const count = await this.countForPost(postId);
    if (count >= MAX_ATTACHMENTS_PER_POST) {
      throw new BadRequestException(
        `Maxim ${MAX_ATTACHMENTS_PER_POST} atașamente pe postare.`,
      );
    }

    const detected = detectFileType(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        'Tip de fișier nedetectat. Acceptăm audio (MP3/WAV/OGG), PDF, ZIP.',
      );
    }
    if (detected.fileType === 'image') {
      throw new BadRequestException(
        'Imaginile se inserează direct în corpul postării, nu ca atașament.',
      );
    }

    const processed = await this.processByKind(
      detected.fileType as StorageAttachmentKind,
      postId,
      file,
      actorId,
    );

    const [row] = await this.db
      .insert(forumPostAttachments)
      .values({
        postId,
        uploadedBy: actorId,
        kind: processed.kind,
        objectKey: processed.objectKey,
        originalFilename: this.sanitizeFilename(originalFilename),
        contentType: processed.contentType,
        bytes: processed.bytes,
        contentHash: processed.contentHash,
        position: count,
      })
      .returning({
        id: forumPostAttachments.id,
        createdAt: forumPostAttachments.createdAt,
      });

    return {
      id: row.id,
      postId,
      kind: processed.kind,
      url: this.storage.url(processed.objectKey),
      bytes: processed.bytes,
      contentType: processed.contentType,
      originalFilename: this.sanitizeFilename(originalFilename),
      position: count,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async removeAttachment(
    actorId: string,
    postId: string,
    attachmentId: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({
        id: forumPostAttachments.id,
        objectKey: forumPostAttachments.objectKey,
        bytes: forumPostAttachments.bytes,
      })
      .from(forumPostAttachments)
      .innerJoin(forumPosts, eq(forumPosts.id, forumPostAttachments.postId))
      .where(
        and(
          eq(forumPostAttachments.id, attachmentId),
          eq(forumPostAttachments.postId, postId),
          eq(forumPosts.authorId, actorId),
        ),
      )
      .limit(1);
    if (!row)
      throw new NotFoundException(`atașament ${attachmentId} inexistent`);

    await this.db
      .delete(forumPostAttachments)
      .where(eq(forumPostAttachments.id, attachmentId));
    await this.storage.deleteObjects([row.objectKey]);
    await this.quota.untrack('forum', postId, Number(row.bytes));
  }

  async listForPosts(postIds: string[]): Promise<ForumAttachmentDto[]> {
    if (postIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(forumPostAttachments)
      .where(inArray(forumPostAttachments.postId, postIds))
      .orderBy(asc(forumPostAttachments.position));
    return rows.map((r) => this.toDto(r));
  }

  /**
   * Read endpoint by thread slug — used by the public thread page to
   * fetch all attachments in a single request, then merge them into
   * the post list client-side.
   */
  async listForThread(threadId: string): Promise<ForumAttachmentDto[]> {
    const rows = await this.db
      .select({
        id: forumPostAttachments.id,
        postId: forumPostAttachments.postId,
        kind: forumPostAttachments.kind,
        objectKey: forumPostAttachments.objectKey,
        bytes: forumPostAttachments.bytes,
        contentType: forumPostAttachments.contentType,
        originalFilename: forumPostAttachments.originalFilename,
        position: forumPostAttachments.position,
        createdAt: forumPostAttachments.createdAt,
      })
      .from(forumPostAttachments)
      .innerJoin(forumPosts, eq(forumPosts.id, forumPostAttachments.postId))
      .where(eq(forumPosts.threadId, threadId))
      .orderBy(
        asc(forumPostAttachments.postId),
        asc(forumPostAttachments.position),
      );
    return rows.map((r) => this.toDto(r));
  }

  private toDto(r: {
    id: string;
    postId: string;
    kind: StorageAttachmentKind;
    objectKey: string;
    bytes: number | string;
    contentType: string;
    originalFilename: string;
    position: number;
    createdAt: Date;
  }): ForumAttachmentDto {
    return {
      id: r.id,
      postId: r.postId,
      kind: r.kind,
      url: this.storage.url(r.objectKey),
      bytes: Number(r.bytes),
      contentType: r.contentType,
      originalFilename: r.originalFilename,
      position: r.position,
      createdAt: r.createdAt.toISOString(),
    };
  }

  private async countForPost(postId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(forumPostAttachments)
      .where(eq(forumPostAttachments.postId, postId));
    return row?.n ?? 0;
  }

  private async requireOwnedPost(
    actorId: string,
    postId: string,
  ): Promise<{ id: string }> {
    const [row] = await this.db
      .select({ id: forumPosts.id, authorId: forumPosts.authorId })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);
    if (!row) throw new NotFoundException(`postare ${postId} inexistentă`);
    if (row.authorId !== actorId) {
      throw new ForbiddenException(
        'Doar autorul postării poate gestiona atașamentele.',
      );
    }
    return { id: row.id };
  }

  private async processByKind(
    kind: StorageAttachmentKind,
    postId: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    switch (kind) {
      case 'audio':
        return this.storage.processAudio('forum', postId, file, actorId);
      case 'pdf':
        return this.storage.processPdf('forum', postId, file, actorId);
      case 'zip':
        return this.storage.processZip('forum', postId, file, actorId);
      default:
        throw new BadRequestException(`Tip atașament neacceptat: ${kind}.`);
    }
  }

  /** Strip path separators + control chars; keep filename safe to render. */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[\\/]/g, '_')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f]/g, '')
      .slice(0, 200) || 'file';
  }
}
