import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '@sintezaur/ui';
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

export interface GearFamilyAdminRow {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  gearCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandAdminRow {
  name: string;
  count: number;
  sampleId: string;
}

@Injectable({ providedIn: 'root' })
export class TezaurAdminService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
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

  /** M5-I — turn ON the official forum thread for this gear. */
  enableOfficialThread(gearId: string): Promise<{
    threadId: string;
    threadSlug: string;
    created: boolean;
  }> {
    return firstValueFrom(
      this.http.post<{ threadId: string; threadSlug: string; created: boolean }>(
        `${this.base}/admin/tezaur/gear/${gearId}/canonical-thread`,
        {},
        { withCredentials: true },
      ),
    );
  }

  /** M5-I — turn OFF (unlink, thread preserved with replies). */
  disableOfficialThread(gearId: string): Promise<void> {
    return firstValueFrom(
      this.http.request<void>(
        'DELETE',
        `${this.base}/admin/tezaur/gear/${gearId}/canonical-thread`,
        { withCredentials: true },
      ),
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

  listFamiliesAdmin(): Promise<GearFamilyAdminRow[]> {
    return firstValueFrom(
      this.http.get<GearFamilyAdminRow[]>(
        `${this.base}/admin/tezaur/families/admin`,
        { withCredentials: true },
      ),
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

  updateFamily(
    id: string,
    payload: { name?: string; slug?: string; summary?: string },
  ): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(
        `${this.base}/admin/tezaur/families/${id}`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  deleteFamily(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/admin/tezaur/families/${id}`,
        { withCredentials: true },
      ),
    );
  }

  mergeFamily(
    fromId: string,
    intoId: string,
  ): Promise<{ movedGearCount: number }> {
    return firstValueFrom(
      this.http.post<{ movedGearCount: number }>(
        `${this.base}/admin/tezaur/families/${fromId}/merge`,
        { intoId },
        { withCredentials: true },
      ),
    );
  }

  listBrandsAdmin(): Promise<BrandAdminRow[]> {
    return firstValueFrom(
      this.http.get<BrandAdminRow[]>(`${this.base}/admin/tezaur/brands`, {
        withCredentials: true,
      }),
    );
  }

  renameBrand(payload: {
    from: string;
    to: string;
    caseInsensitive?: boolean;
  }): Promise<{ moved: number }> {
    return firstValueFrom(
      this.http.post<{ moved: number }>(
        `${this.base}/admin/tezaur/brands/rename`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  imageUrl(relativePath: string | null | undefined): string {
    return this.appConfig.imageUrl(relativePath);
  }
}
