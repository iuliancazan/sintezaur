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

export interface BazarListingDetail {
  listing: {
    id: string;
    slug: string;
    sellerId: string;
    gearId: string | null;
    rawMake: string | null;
    rawModel: string | null;
    rawYear: number | null;
    title: string;
    description: Record<string, unknown>;
    descriptionHtml: string;
    price: string;
    currency: DisplayCurrencyLiteral;
    condition: ListingConditionLiteral;
    conditionNote: string | null;
    kind: ListingKindLiteral;
    lookingFor: string | null;
    delivery: ListingDeliveryLiteral;
    shippingCost: string | null;
    shippingCarriers: string[];
    acceptsOffers: boolean;
    location: string;
    contactPhone: string | null;
    status: ListingStatusLiteral;
    viewCount: number;
    expiresAt: string | null;
    refreshedAt: string | null;
    removedAt: string | null;
    soldAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  photos: {
    id: string;
    sourceId: string;
    variant: string;
    path: string;
    width: number;
    height: number;
    position: number;
  }[];
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
  } | null;
  seller: {
    id: string;
    username: string;
    fullName: string;
    avgRating: string | null;
    reviewCount: number;
    transactionCount: number;
    createdAt: string;
  };
  isWatched: boolean;
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

  detail(slug: string): Promise<BazarListingDetail> {
    return firstValueFrom(
      this.http.get<BazarListingDetail>(`${this.base}/bazar/${slug}`, {
        withCredentials: true,
      }),
    );
  }

  watch(listingId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/me/bazar/listings/${listingId}/watch`,
        {},
        { withCredentials: true },
      ),
    );
  }

  unwatch(listingId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/bazar/listings/${listingId}/watch`,
        { withCredentials: true },
      ),
    );
  }

  startThread(
    listingId: string,
    body: string,
  ): Promise<{ thread: { id: string }; message: { id: string } }> {
    return firstValueFrom(
      this.http.post<{ thread: { id: string }; message: { id: string } }>(
        `${this.base}/me/bazar/listings/${listingId}/threads/messages`,
        { body },
        { withCredentials: true },
      ),
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
