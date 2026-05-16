import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '@sintezaur/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type ArticleCategoryLiteral =
  | 'reviews'
  | 'tutorials'
  | 'news'
  | 'interviews'
  | 'buying_guides'
  | 'hardware_deep_dives';

export type ArticleStatusLiteral = 'draft' | 'published' | 'archived';

export const ARTICLE_CATEGORIES: ArticleCategoryLiteral[] = [
  'reviews',
  'tutorials',
  'news',
  'interviews',
  'buying_guides',
  'hardware_deep_dives',
];

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: ArticleCategoryLiteral;
  tags: string[];
  heroThumb: string | null;
  publishedAt: string | null;
  viewCount: number;
  author: { id: string; username: string; fullName: string };
}

export interface ArticleListResponse {
  items: ArticleListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ArticleListQuery {
  q?: string;
  category?: ArticleCategoryLiteral;
  authorId?: string;
  gearId?: string;
  tag?: string;
  sort?: 'newest' | 'oldest' | 'most_viewed';
  page?: number;
  pageSize?: number;
}

export interface ArticleDetail {
  article: {
    id: string;
    slug: string;
    authorId: string;
    title: string;
    excerpt: string | null;
    body: Record<string, unknown>;
    bodyHtml: string;
    category: ArticleCategoryLiteral;
    tags: string[];
    heroSourceId: string | null;
    status: ArticleStatusLiteral;
    publishedAt: string | null;
    threadId: string | null;
    isPremium: boolean;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
  };
  heroImage: { sourceId: string; path: string } | null;
  inlineImages: { sourceId: string; path: string; caption: string | null }[];
  author: {
    id: string;
    username: string;
    fullName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
    position: number;
  }[];
  thread: { id: string; slug: string; postCount: number } | null;
}

export interface AuthorProfile {
  author: {
    id: string;
    username: string;
    fullName: string;
    bio: string | null;
    location: string | null;
    avatarUrl: string | null;
    websiteUrl: string | null;
    socialInstagram: string | null;
    socialSoundcloud: string | null;
    socialBandcamp: string | null;
    createdAt: string;
  };
  articles: ArticleListItem[];
}

@Injectable({ providedIn: 'root' })
export class RevistaService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
  private readonly base = environment.apiBaseUrl;

  list(query: ArticleListQuery = {}): Promise<ArticleListResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return firstValueFrom(
      this.http.get<ArticleListResponse>(`${this.base}/revista`, { params }),
    );
  }

  detail(slug: string): Promise<ArticleDetail> {
    return firstValueFrom(
      this.http.get<ArticleDetail>(`${this.base}/revista/${slug}`),
    );
  }

  author(username: string): Promise<AuthorProfile> {
    return firstValueFrom(
      this.http.get<AuthorProfile>(`${this.base}/autor/${username}`),
    );
  }

  /* ============ editor surface (M4-D) ============ */

  loadOwn(id: string): Promise<ArticleDetail> {
    return firstValueFrom(
      this.http.get<ArticleDetail>(`${this.base}/me/revista/articles/${id}`, {
        withCredentials: true,
      }),
    );
  }

  loadOwnBySlug(slug: string): Promise<ArticleDetail> {
    return firstValueFrom(
      this.http.get<ArticleDetail>(
        `${this.base}/me/revista/by-slug/${slug}`,
        { withCredentials: true },
      ),
    );
  }

  create(payload: CreateArticlePayload): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/me/revista/articles`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  update(
    id: string,
    patch: Partial<CreateArticlePayload>,
  ): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.patch<{ id: string; slug: string }>(
        `${this.base}/me/revista/articles/${id}`,
        patch,
        { withCredentials: true },
      ),
    );
  }

  publish(id: string): Promise<{ slug: string; threadId: string }> {
    return firstValueFrom(
      this.http.post<{ slug: string; threadId: string }>(
        `${this.base}/me/revista/articles/${id}/publish`,
        {},
        { withCredentials: true },
      ),
    );
  }

  unpublish(id: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/me/revista/articles/${id}/unpublish`,
        {},
        { withCredentials: true },
      ),
    );
  }

  archive(id: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/me/revista/articles/${id}/archive`,
        {},
        { withCredentials: true },
      ),
    );
  }

  uploadImage(
    articleId: string,
    file: File,
    caption?: string,
  ): Promise<{ sourceId: string; path: string }> {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    return firstValueFrom(
      this.http.post<{ sourceId: string; path: string }>(
        `${this.base}/me/revista/articles/${articleId}/images`,
        form,
        { withCredentials: true },
      ),
    );
  }

  deleteImage(articleId: string, sourceId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/revista/articles/${articleId}/images/${sourceId}`,
        { withCredentials: true },
      ),
    );
  }

  imageUrl(relativePath: string | null | undefined): string {
    return this.appConfig.imageUrl(relativePath);
  }

  /* ============ follow toggles (M4-F) ============ */

  listFollows(): Promise<ArticleCategoryLiteral[]> {
    return firstValueFrom(
      this.http.get<ArticleCategoryLiteral[]>(
        `${this.base}/me/revista/follows`,
        { withCredentials: true },
      ),
    );
  }

  follow(category: ArticleCategoryLiteral): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/me/revista/follows/${category}`,
        {},
        { withCredentials: true },
      ),
    );
  }

  unfollow(category: ArticleCategoryLiteral): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/revista/follows/${category}`,
        { withCredentials: true },
      ),
    );
  }
}

export interface CreateArticlePayload {
  title: string;
  excerpt?: string;
  category: ArticleCategoryLiteral;
  body: Record<string, unknown>;
  bodyHtml?: string;
  tags?: string[];
  gearIds?: string[];
  heroSourceId?: string;
  isPremium?: boolean;
}
