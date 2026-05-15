import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PendingPostRow {
  id: string;
  threadId: string;
  threadSlug: string;
  threadTitle: string;
  categorySlug: string;
  bodyHtml: string;
  authorId: string | null;
  authorUsername: string | null;
  authorFullName: string | null;
  topLevelSeq: number;
  subSeq: number | null;
  createdAt: string;
}

export interface PendingPostsResponse {
  items: PendingPostRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ForumQueueService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(page = 1, pageSize = 25): Promise<PendingPostsResponse> {
    return firstValueFrom(
      this.http.get<PendingPostsResponse>(
        `${this.base}/forum/mod/pending-posts?page=${page}&pageSize=${pageSize}`,
        { withCredentials: true },
      ),
    );
  }

  approve(postId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/forum/mod/posts/${postId}/approve`,
        {},
        { withCredentials: true },
      ),
    );
  }

  reject(postId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/forum/mod/posts/${postId}/reject`,
        {},
        { withCredentials: true },
      ),
    );
  }
}
