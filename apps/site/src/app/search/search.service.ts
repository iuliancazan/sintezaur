import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UnifiedSearchSection<T> {
  items: T[];
  totalCount: number;
}

export interface TezaurHit {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  yearReleased: number | null;
  heroImage?: { path: string | null } | null;
}

export interface BazarHit {
  id: string;
  slug: string;
  title: string;
  price: string;
  currency: 'ron' | 'eur';
  condition: string;
  status: string;
  city: string | null;
  heroPhoto?: { path: string | null } | null;
}

export interface RevistaHit {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  publishedAt: string | null;
}

export interface ForumHit {
  threadId: string;
  threadSlug: string;
  threadTitle: string;
  categorySlug: string;
  categoryName: string;
  postCount: number;
  snippet: string | null;
}

export interface UnifiedSearchResponse {
  query: string;
  tooShort: boolean;
  tezaur: UnifiedSearchSection<TezaurHit>;
  bazar: UnifiedSearchSection<BazarHit>;
  revista: UnifiedSearchSection<RevistaHit>;
  forum: UnifiedSearchSection<ForumHit>;
  totalHits: number;
}

@Injectable({ providedIn: 'root' })
export class UnifiedSearchService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async search(query: string, limit = 5): Promise<UnifiedSearchResponse> {
    let params = new HttpParams().set('q', query);
    if (limit !== 5) params = params.set('limit', String(limit));
    return firstValueFrom(
      this.http.get<UnifiedSearchResponse>(`${this.base}/search`, { params }),
    );
  }
}
