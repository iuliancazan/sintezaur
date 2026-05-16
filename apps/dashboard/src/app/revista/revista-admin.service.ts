import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '@sintezaur/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  viewCount: number;
  heroThumb: string | null;
  author: { id: string; username: string; fullName: string };
}

export interface AdminArticlesResponse {
  items: AdminArticleRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class RevistaAdminService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
  private readonly base = environment.apiBaseUrl;

  list(query: {
    status?: string;
    q?: string;
    authorId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminArticlesResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return firstValueFrom(
      this.http.get<AdminArticlesResponse>(
        `${this.base}/admin/revista/articles`,
        { params, withCredentials: true },
      ),
    );
  }

  unarchive(id: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/admin/revista/articles/${id}/unarchive`,
        {},
        { withCredentials: true },
      ),
    );
  }

  imageUrl(relativePath: string | null | undefined): string {
    return this.appConfig.imageUrl(relativePath);
  }
}
