import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type BadgeCriteriaKind =
  | 'post_count'
  | 'account_age_days'
  | 'likes_received';

export interface BadgeAdminRow {
  id: string;
  key: string;
  nameRo: string;
  nameEn: string;
  category: string;
  descriptionRo: string | null;
  descriptionEn: string | null;
  criteria: { kind: BadgeCriteriaKind; threshold: number };
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBadgePayload {
  key: string;
  nameRo: string;
  nameEn: string;
  category: string;
  descriptionRo?: string | null;
  descriptionEn?: string | null;
  criteria: { kind: BadgeCriteriaKind; threshold: number };
  position?: number;
}

export interface UpdateBadgePayload {
  nameRo?: string;
  nameEn?: string;
  category?: string;
  descriptionRo?: string | null;
  descriptionEn?: string | null;
  criteria?: { kind: BadgeCriteriaKind; threshold: number };
  position?: number;
}

@Injectable({ providedIn: 'root' })
export class BadgesAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Promise<BadgeAdminRow[]> {
    return firstValueFrom(
      this.http.get<BadgeAdminRow[]>(`${this.base}/badges`, {
        withCredentials: true,
      }),
    );
  }

  create(payload: CreateBadgePayload): Promise<BadgeAdminRow> {
    return firstValueFrom(
      this.http.post<BadgeAdminRow>(`${this.base}/badges`, payload, {
        withCredentials: true,
      }),
    );
  }

  update(id: string, patch: UpdateBadgePayload): Promise<BadgeAdminRow> {
    return firstValueFrom(
      this.http.patch<BadgeAdminRow>(`${this.base}/badges/${id}`, patch, {
        withCredentials: true,
      }),
    );
  }

  delete(id: string): Promise<{ removedAwards: number }> {
    return firstValueFrom(
      this.http.delete<{ removedAwards: number }>(
        `${this.base}/badges/${id}`,
        { withCredentials: true },
      ),
    );
  }

  sweep(): Promise<{ awarded: number }> {
    return firstValueFrom(
      this.http.post<{ awarded: number }>(
        `${this.base}/badges/sweep`,
        {},
        { withCredentials: true },
      ),
    );
  }
}
