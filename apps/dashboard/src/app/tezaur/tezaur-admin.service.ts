import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type { TezaurListResponse, TezaurDetail } from './tezaur.types';

export interface CreateGearPayload {
  category: string;
  brand: string;
  model: string;
  slug?: string;
  formFactor?: string;
  familyId?: string;
  yearReleased?: number;
  yearDiscontinued?: number;
  msrpAtLaunchEur?: number;
  latestFirmwareVersion?: string;
  firmwareNotesUrl?: string;
  specs?: Record<string, unknown>;
  published?: boolean;
}

export type UpdateGearPayload = Partial<CreateGearPayload>;

export interface GearFamily {
  id: string;
  slug: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class TezaurAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(query: {
    q?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<TezaurListResponse> {
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

  create(payload: CreateGearPayload): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/admin/tezaur/gear`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  update(
    id: string,
    payload: UpdateGearPayload,
  ): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.patch<{ id: string; slug: string }>(
        `${this.base}/admin/tezaur/gear/${id}`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  softDelete(id: string): Promise<void> {
    return firstValueFrom(
      this.http
        .delete(`${this.base}/admin/tezaur/gear/${id}`, { withCredentials: true })
        .pipe() as any,
    );
  }

  upsertDescription(
    gearId: string,
    body: { lang: 'ro' | 'en'; body: unknown; bodyHtml: string },
  ): Promise<void> {
    return firstValueFrom(
      this.http.put(
        `${this.base}/admin/tezaur/gear/${gearId}/description`,
        body,
        { withCredentials: true },
      ) as any,
    );
  }

  uploadImage(
    gearId: string,
    file: File,
    caption?: string,
  ): Promise<{ sourceId: string }> {
    const fd = new FormData();
    fd.append('file', file);
    if (caption) fd.append('caption', caption);
    return firstValueFrom(
      this.http.post<{ sourceId: string }>(
        `${this.base}/admin/tezaur/gear/${gearId}/images`,
        fd,
        { withCredentials: true },
      ),
    );
  }

  deleteImage(gearId: string, sourceId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete(
        `${this.base}/admin/tezaur/gear/${gearId}/images/${sourceId}`,
        { withCredentials: true },
      ) as any,
    );
  }

  listFamilies(): Promise<GearFamily[]> {
    return firstValueFrom(
      this.http.get<GearFamily[]>(`${this.base}/admin/tezaur/families`, {
        withCredentials: true,
      }),
    );
  }

  createFamily(payload: {
    name: string;
    slug?: string;
    summary?: string;
  }): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/admin/tezaur/families`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  imageUrl(relativePath: string): string {
    return `${this.base.replace(/\/api$/, '')}/uploads/${relativePath}`;
  }
}
