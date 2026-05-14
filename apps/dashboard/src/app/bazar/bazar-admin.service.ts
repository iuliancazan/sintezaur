import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminListingRow {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model: string | null;
  gearId: string | null;
  gearSlug: string | null;
  price: string;
  currency: 'ron' | 'eur';
  condition: string;
  kind: string;
  delivery: string;
  acceptsOffers: boolean;
  location: string;
  thumb: string | null;
  status: 'draft' | 'active' | 'sold' | 'expired' | 'removed';
  createdAt: string;
  expiresAt: string | null;
  refreshedAt: string | null;
  removedAt: string | null;
  seller: {
    id: string;
    username: string;
  };
}

export interface AdminListingsResponse {
  items: AdminListingRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class BazarAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(query: {
    status?: string;
    q?: string;
    sellerUsername?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminListingsResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return firstValueFrom(
      this.http.get<AdminListingsResponse>(
        `${this.base}/admin/bazar/listings`,
        { params, withCredentials: true },
      ),
    );
  }

  remove(id: string, reason: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/admin/bazar/listings/${id}/remove`,
        { reason },
        { withCredentials: true },
      ),
    );
  }

  unremove(id: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/admin/bazar/listings/${id}/unremove`,
        {},
        { withCredentials: true },
      ),
    );
  }

  imageUrl(relativePath: string): string {
    return `${this.base.replace(/\/api$/, '')}/uploads/${relativePath}`;
  }
}
