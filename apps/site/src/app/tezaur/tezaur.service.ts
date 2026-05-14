import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TezaurListItem {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  formFactor: string | null;
  yearReleased: number | null;
  yearDiscontinued: number | null;
  ownersPublicCount: number;
  avgRating: string | null;
  reviewCount: number;
  thumb: string | null;
  type: string | null;
}

export interface TezaurListResponse {
  items: TezaurListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface TezaurListQuery {
  q?: string;
  category?: string;
  brand?: string;
  type?: string;
  yearMin?: number;
  yearMax?: number;
  status?: 'in_production' | 'discontinued';
  sort?: 'popular' | 'alpha' | 'newest' | 'year_asc' | 'year_desc';
  page?: number;
  pageSize?: number;
}

export interface TezaurDetail {
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
    formFactor: string | null;
    yearReleased: number | null;
    yearDiscontinued: number | null;
    msrpAtLaunchEur: string | null;
    ownersPublicCount: number;
    avgRating: string | null;
    reviewCount: number;
    latestFirmwareVersion: string | null;
    firmwareNotesUrl: string | null;
    specs: Record<string, unknown>;
    publishedAt?: string;
  };
  family: { id: string; slug: string; name: string } | null;
  siblings: { id: string; slug: string; brand: string; model: string; yearReleased: number | null }[];
  images: { sourceId: string; variant: string; path: string; width: number; height: number; position: number; caption: string | null }[];
  videos: { id: string; provider: string; externalId: string; title: string | null }[];
  links: { id: string; kind: string; url: string; label: string | null; vendor: string | null }[];
  description: { body: unknown; bodyHtml: string } | null;
  relationships: {
    parent: { id: string; slug: string; brand: string; model: string; type: string }[];
    child: { id: string; slug: string; brand: string; model: string; type: string }[];
  };
}

@Injectable({ providedIn: 'root' })
export class TezaurService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(query: TezaurListQuery = {}): Promise<TezaurListResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return firstValueFrom(
      this.http.get<TezaurListResponse>(`${this.base}/tezaur`, { params }),
    );
  }

  detail(slug: string): Promise<TezaurDetail> {
    return firstValueFrom(
      this.http.get<TezaurDetail>(`${this.base}/tezaur/${slug}`),
    );
  }

  /** Absolute URL to an uploaded image variant (served by api on /uploads). */
  imageUrl(relativePath: string): string {
    // `apiBaseUrl` ends with /api; strip that to land on the host root
    // where /uploads/* is served.
    return `${this.base.replace(/\/api$/, '')}/uploads/${relativePath}`;
  }
}
