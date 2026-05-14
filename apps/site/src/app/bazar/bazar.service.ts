import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  DisplayCurrencyLiteral,
  ListingConditionLiteral,
  ListingDeliveryLiteral,
  ListingKindLiteral,
  ListingSortLiteral,
  ListingStatusLiteral,
} from '@sintezaur/shared';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BazarListItem {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model: string | null;
  gearId: string | null;
  gearSlug: string | null;
  price: string;
  currency: DisplayCurrencyLiteral;
  condition: ListingConditionLiteral;
  kind: ListingKindLiteral;
  delivery: ListingDeliveryLiteral;
  acceptsOffers: boolean;
  location: string;
  thumb: string | null;
  status: ListingStatusLiteral;
  createdAt: string;
  expiresAt: string | null;
  refreshedAt: string | null;
  seller: {
    id: string;
    username: string;
    avgRating: string | null;
    reviewCount: number;
    transactionCount: number;
  };
}

export interface BazarListResponse {
  items: BazarListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface BazarListQuery {
  q?: string;
  gearId?: string;
  brand?: string;
  category?: string;
  conditions?: ListingConditionLiteral[];
  kinds?: ListingKindLiteral[];
  deliveries?: ListingDeliveryLiteral[];
  location?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: DisplayCurrencyLiteral;
  sort?: ListingSortLiteral;
  page?: number;
  pageSize?: number;
}

export interface RecentlySoldResponse {
  items: BazarListItem[];
}

@Injectable({ providedIn: 'root' })
export class BazarService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(query: BazarListQuery = {}): Promise<BazarListResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        for (const item of v) params = params.append(k, String(item));
      } else {
        params = params.set(k, String(v));
      }
    }
    return firstValueFrom(
      this.http.get<BazarListResponse>(`${this.base}/bazar`, { params }),
    );
  }

  recentlySold(query: { gearId?: string; limit?: number } = {}): Promise<RecentlySoldResponse> {
    let params = new HttpParams();
    if (query.gearId) params = params.set('gearId', query.gearId);
    if (query.limit) params = params.set('limit', String(query.limit));
    return firstValueFrom(
      this.http.get<RecentlySoldResponse>(`${this.base}/bazar/recently-sold`, {
        params,
      }),
    );
  }

  /** Absolute URL to an uploaded image variant. */
  imageUrl(relativePath: string): string {
    return `${this.base.replace(/\/api$/, '')}/uploads/${relativePath}`;
  }
}
