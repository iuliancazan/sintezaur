import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type AttachmentKind = 'audio' | 'pdf' | 'zip';

export interface AttachmentItem {
  id: string;
  kind: AttachmentKind;
  url: string;
  bytes: number;
  contentType: string;
  originalFilename: string;
  position: number;
  createdAt: string;
  /** Only present on forum attachments (postId) or revista (articleId). */
  postId?: string;
  articleId?: string;
  caption?: string | null;
}

export interface StorageLimitRow {
  id: string;
  scope: 'per_file' | 'per_user_daily' | 'per_user_lifetime_alert';
  fileType: 'image' | 'audio' | 'pdf' | 'zip' | '*';
  module: 'tezaur' | 'bazar' | 'revista' | 'forum' | 'avatar' | '*';
  maxBytes: number;
  updatedAt: string;
}

const LIMITS_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Client-side gateway for M7 attachments + storage limits.
 *
 * Endpoints used:
 *   POST   /forum/posts/:postId/attachments         (multipart)
 *   DELETE /forum/posts/:postId/attachments/:id
 *   GET    /forum/threads/:slug/attachments
 *   POST   /revista/articles/:articleId/attachments (multipart)
 *   DELETE /revista/articles/:articleId/attachments/:id
 *   GET    /revista/:slug/attachments
 *   GET    /storage/limits                           (cached 5 min)
 *
 * The limits signal is exposed so uploader components can run a
 * client-side pre-check before hitting the wire. Same source of
 * truth as the backend `UploadQuotaGuard`.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private limitsCache: StorageLimitRow[] | null = null;
  private limitsLoadedAt = 0;
  readonly limitsSignal = signal<StorageLimitRow[]>([]);

  async uploadToForumPost(
    postId: string,
    file: File,
  ): Promise<AttachmentItem> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('filename', file.name);
    return firstValueFrom(
      this.http.post<AttachmentItem>(
        `${this.base}/forum/posts/${postId}/attachments`,
        form,
        { withCredentials: true },
      ),
    );
  }

  async deleteForumAttachment(
    postId: string,
    attachmentId: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.base}/forum/posts/${postId}/attachments/${attachmentId}`,
        { withCredentials: true },
      ),
    );
  }

  async listForumAttachmentsByThread(
    threadSlug: string,
  ): Promise<AttachmentItem[]> {
    const res = await firstValueFrom(
      this.http.get<{ items: AttachmentItem[] }>(
        `${this.base}/forum/threads/${threadSlug}/attachments`,
      ),
    );
    return res.items ?? [];
  }

  async uploadToRevistaArticle(
    articleId: string,
    file: File,
    caption?: string,
  ): Promise<AttachmentItem> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('filename', file.name);
    if (caption) form.append('caption', caption);
    return firstValueFrom(
      this.http.post<AttachmentItem>(
        `${this.base}/revista/articles/${articleId}/attachments`,
        form,
        { withCredentials: true },
      ),
    );
  }

  async deleteRevistaAttachment(
    articleId: string,
    attachmentId: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.base}/revista/articles/${articleId}/attachments/${attachmentId}`,
        { withCredentials: true },
      ),
    );
  }

  async listRevistaAttachmentsBySlug(
    slug: string,
  ): Promise<AttachmentItem[]> {
    const res = await firstValueFrom(
      this.http.get<{ items: AttachmentItem[] }>(
        `${this.base}/revista/${slug}/attachments`,
      ),
    );
    return res.items ?? [];
  }

  async getLimits(): Promise<StorageLimitRow[]> {
    const now = Date.now();
    if (this.limitsCache && now - this.limitsLoadedAt < LIMITS_CACHE_TTL_MS) {
      return this.limitsCache;
    }
    const res = await firstValueFrom(
      this.http.get<{ items: StorageLimitRow[] }>(
        `${this.base}/storage/limits`,
      ),
    );
    this.limitsCache = res.items ?? [];
    this.limitsLoadedAt = now;
    this.limitsSignal.set(this.limitsCache);
    return this.limitsCache;
  }

  /**
   * Look up the per-file cap for `(fileType, module)` with the same
   * wildcard fallback the backend `StorageLimitsService` uses.
   * Returns `null` if no matching row exists.
   */
  async getPerFileMaxBytes(
    fileType: 'image' | 'audio' | 'pdf' | 'zip',
    module: 'tezaur' | 'bazar' | 'revista' | 'forum' | 'avatar',
  ): Promise<number | null> {
    const rows = await this.getLimits();
    const candidates: Array<[StorageLimitRow['fileType'], StorageLimitRow['module']]> = [
      [fileType, module],
      [fileType, '*'],
      ['*', module],
      ['*', '*'],
    ];
    for (const [ft, mod] of candidates) {
      const hit = rows.find(
        (r) => r.scope === 'per_file' && r.fileType === ft && r.module === mod,
      );
      if (hit) return hit.maxBytes;
    }
    return null;
  }

  static describeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message?: unknown }).message;
        if (typeof m === 'string') return m;
      }
      if (err.status === 413) return 'Fișierul e prea mare.';
      if (err.status === 429) return 'Ai atins limita de upload pentru azi.';
      if (err.status === 403)
        return 'Nu ai permisiunea să modifici acest atașament.';
    }
    return 'A apărut o eroare la upload.';
  }
}
