import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type ForumCategoryKind = 'user' | 'system';

export interface ForumCategory {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string | null;
  kind: ForumCategoryKind;
  position: number;
}

export interface ThreadListItem {
  id: string;
  slug: string;
  title: string;
  authorId: string | null;
  authorUsername: string | null;
  authorFullName: string | null;
  categoryId: string;
  categorySlug: string;
  postCount: number;
  lastPostAt: string | null;
  createdAt: string;
  pinnedAt: string | null;
  pinPosition: number | null;
  lockedAt: string | null;
}

export interface ThreadListResponse {
  category: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    kind: ForumCategoryKind;
  };
  items: ThreadListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ThreadDetail {
  thread: {
    id: string;
    slug: string;
    categoryId: string;
    authorId: string | null;
    title: string;
    postCount: number;
    lastPostAt: string | null;
    pinnedAt: string | null;
    pinPosition: number | null;
    lockedAt: string | null;
    firstPostId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  category: {
    id: string;
    key: string;
    slug: string;
    name: string;
    kind: ForumCategoryKind;
  };
  author: { id: string; username: string; fullName: string } | null;
  sourceLink:
    | { type: 'article' | 'gear'; slug: string; title: string }
    | null;
}

export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface PostListItem {
  id: string;
  threadId: string;
  parentPostId: string | null;
  authorId: string | null;
  authorUsername: string | null;
  authorFullName: string | null;
  body: Record<string, unknown> | null;
  bodyHtml: string | null;
  topLevelSeq: number;
  subSeq: number | null;
  status: PostStatus;
  editedAt: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  likeCount: number;
  createdAt: string;
}

export interface PostsResponse {
  op: PostListItem | null;
  replies: PostListItem[];
  page: number;
  pageSize: number;
  totalReplies: number;
}

@Injectable({ providedIn: 'root' })
export class ForumService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listCategories(): Promise<ForumCategory[]> {
    return firstValueFrom(
      this.http.get<ForumCategory[]>(`${this.base}/forum/categories`),
    );
  }

  listThreads(
    categorySlug: string,
    opts: { page?: number; pageSize?: number } = {},
  ): Promise<ThreadListResponse> {
    let params = new HttpParams();
    if (opts.page !== undefined) params = params.set('page', String(opts.page));
    if (opts.pageSize !== undefined)
      params = params.set('pageSize', String(opts.pageSize));
    return firstValueFrom(
      this.http.get<ThreadListResponse>(
        `${this.base}/forum/categories/${categorySlug}/threads`,
        { params },
      ),
    );
  }

  getThread(slug: string): Promise<ThreadDetail> {
    return firstValueFrom(
      this.http.get<ThreadDetail>(`${this.base}/forum/threads/${slug}`),
    );
  }

  listPosts(
    slug: string,
    opts: { page?: number; pageSize?: number } = {},
  ): Promise<PostsResponse> {
    let params = new HttpParams();
    if (opts.page !== undefined) params = params.set('page', String(opts.page));
    if (opts.pageSize !== undefined)
      params = params.set('pageSize', String(opts.pageSize));
    return firstValueFrom(
      this.http.get<PostsResponse>(
        `${this.base}/forum/threads/${slug}/posts`,
        { params },
      ),
    );
  }
}
