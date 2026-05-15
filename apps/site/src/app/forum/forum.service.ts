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

export interface CreateThreadPayload {
  categoryId: string;
  title: string;
  body: Record<string, unknown>;
  bodyHtml: string;
}

export interface CreateReplyPayload {
  parentPostId?: string | null;
  body: Record<string, unknown>;
  bodyHtml: string;
}

export interface UpdatePostPayload {
  body: Record<string, unknown>;
  bodyHtml: string;
}

export interface MentionUser {
  id: string;
  username: string;
  fullName: string;
}

export type SubscriptionLevel =
  | 'watching'
  | 'tracking'
  | 'mentioned_only'
  | 'muted';

export interface ThreadSubscriptionItem {
  threadId: string;
  threadSlug: string;
  threadTitle: string;
  categorySlug: string;
  categoryName: string;
  level: SubscriptionLevel;
  updatedAt: string;
}

export interface CategorySubscriptionItem {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  level: SubscriptionLevel;
  updatedAt: string;
}

export interface MySubscriptionsResponse {
  threads: ThreadSubscriptionItem[];
  categories: CategorySubscriptionItem[];
}

export interface UserBadgeItem {
  key: string;
  nameRo: string;
  nameEn: string;
  category: string;
  descriptionRo: string | null;
  descriptionEn: string | null;
  awardedAt: string;
  position: number;
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

  /* ============ writes (M5-D) ============ */

  createThread(payload: CreateThreadPayload): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/forum/threads`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  createReply(threadId: string, payload: CreateReplyPayload): Promise<PostListItem> {
    return firstValueFrom(
      this.http.post<PostListItem>(
        `${this.base}/forum/threads/${threadId}/posts`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  updatePost(postId: string, patch: UpdatePostPayload): Promise<PostListItem> {
    return firstValueFrom(
      this.http.patch<PostListItem>(
        `${this.base}/forum/posts/${postId}`,
        patch,
        { withCredentials: true },
      ),
    );
  }

  deletePost(postId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/forum/posts/${postId}`, {
        withCredentials: true,
      }),
    );
  }

  searchMentions(query: string): Promise<MentionUser[]> {
    return firstValueFrom(
      this.http.get<MentionUser[]>(`${this.base}/forum/mention-search`, {
        params: { q: query },
        withCredentials: true,
      }),
    );
  }

  /* ============ likes (M5-E) ============ */

  toggleLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
    return firstValueFrom(
      this.http.post<{ liked: boolean; likeCount: number }>(
        `${this.base}/forum/posts/${postId}/like`,
        {},
        { withCredentials: true },
      ),
    );
  }

  listMyLikes(threadId: string): Promise<{ postIds: string[] }> {
    return firstValueFrom(
      this.http.get<{ postIds: string[] }>(
        `${this.base}/forum/threads/${threadId}/my-likes`,
        { withCredentials: true },
      ),
    );
  }

  /* ============ subscriptions (M5-E) ============ */

  getThreadSubscription(threadId: string): Promise<{ level: SubscriptionLevel | null }> {
    return firstValueFrom(
      this.http.get<{ level: SubscriptionLevel | null }>(
        `${this.base}/forum/threads/${threadId}/subscription`,
        { withCredentials: true },
      ),
    );
  }

  setThreadSubscription(
    threadId: string,
    level: SubscriptionLevel | null,
  ): Promise<{ level: SubscriptionLevel | null }> {
    return firstValueFrom(
      this.http.patch<{ level: SubscriptionLevel | null }>(
        `${this.base}/forum/threads/${threadId}/subscription`,
        { level },
        { withCredentials: true },
      ),
    );
  }

  getCategorySubscription(categoryId: string): Promise<{ level: SubscriptionLevel | null }> {
    return firstValueFrom(
      this.http.get<{ level: SubscriptionLevel | null }>(
        `${this.base}/forum/categories/${categoryId}/subscription`,
        { withCredentials: true },
      ),
    );
  }

  setCategorySubscription(
    categoryId: string,
    level: SubscriptionLevel | null,
  ): Promise<{ level: SubscriptionLevel | null }> {
    return firstValueFrom(
      this.http.patch<{ level: SubscriptionLevel | null }>(
        `${this.base}/forum/categories/${categoryId}/subscription`,
        { level },
        { withCredentials: true },
      ),
    );
  }

  listMySubscriptions(): Promise<MySubscriptionsResponse> {
    return firstValueFrom(
      this.http.get<MySubscriptionsResponse>(
        `${this.base}/forum/subscriptions/me`,
        { withCredentials: true },
      ),
    );
  }

  /* ============ badges (M5-F) ============ */

  listBadgesForUsername(username: string): Promise<UserBadgeItem[]> {
    return firstValueFrom(
      this.http.get<UserBadgeItem[]>(
        `${this.base}/badges/users/${encodeURIComponent(username)}`,
      ),
    );
  }

  /* ============ reports + mod actions (M5-G) ============ */

  reportContent(payload: {
    targetType: 'forum_post' | 'forum_thread';
    targetId: string;
    reason: string;
  }): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        `${this.base}/content-reports`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  /* mod actions */
  modHidePost(postId: string, reason: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/forum/mod/posts/${postId}/hide`,
        { reason },
        { withCredentials: true },
      ),
    );
  }

  modUnhidePost(postId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/forum/mod/posts/${postId}/unhide`,
        {},
        { withCredentials: true },
      ),
    );
  }

  modApprovePost(postId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/forum/mod/posts/${postId}/approve`,
        {},
        { withCredentials: true },
      ),
    );
  }

  modRejectPost(postId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/forum/mod/posts/${postId}/reject`,
        {},
        { withCredentials: true },
      ),
    );
  }

  modLockThread(threadId: string, lock: boolean): Promise<void> {
    const path = lock ? 'lock' : 'unlock';
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/forum/mod/threads/${threadId}/${path}`,
        {},
        { withCredentials: true },
      ),
    );
  }

  modPinThread(threadId: string, pin: boolean): Promise<{ pinPosition?: number }> {
    const path = pin ? 'pin' : 'unpin';
    return firstValueFrom(
      this.http.post<{ pinPosition?: number }>(
        `${this.base}/forum/mod/threads/${threadId}/${path}`,
        {},
        { withCredentials: true },
      ),
    );
  }

  modDeleteThread(threadId: string, reason?: string): Promise<void> {
    return firstValueFrom(
      this.http.request<void>('DELETE', `${this.base}/forum/mod/threads/${threadId}`, {
        body: { reason },
        withCredentials: true,
      }),
    );
  }
}
