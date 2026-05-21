import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '@sintezaur/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/* ============================================================
   M11 — community contributor flow
   ============================================================ */

export type GearState = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface TezaurBrandSuggestion {
  name: string;
  count: number;
}

export interface TezaurFamilySuggestion {
  id: string;
  slug: string;
  name: string;
}

export interface TezaurMyDraft {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  state: GearState;
  rejectionReason: string | null;
  submittedAt: string | null;
  updatedAt: string;
  thumb: string | null;
}

export interface TezaurModerationItem {
  id: string;
  slug: string;
  brand: string;
  model: string;
  category: string;
  state: GearState;
  submittedAt: string | null;
  createdBy: string | null;
  thumb: string | null;
}

export interface TezaurModerationResponse {
  items: TezaurModerationItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface TezaurModerationQuery {
  state?: GearState;
  page?: number;
  pageSize?: number;
}

export interface TezaurDraftPayload {
  brand?: string;
  model?: string;
  category?: string;
  formFactor?: string | null;
  familyLabel?: string | null;
  yearReleased?: number | null;
  yearDiscontinued?: number | null;
  msrpAtLaunchEur?: number | null;
  tagline?: string;
  taglineEn?: string;
  descriptionText?: string;
  descriptionTextEn?: string;
  specs?: Record<string, unknown>;
}

export interface TezaurDraftImage {
  id: string;
  gearId: string;
  sourceId: string;
  variant: string;
  path: string;
  width: number;
  height: number;
  position: number;
  caption: string | null;
  /** Manual crop rect in original image coords; only set on `original` variant rows. */
  crop?: { x: number; y: number; w: number; h: number } | null;
}

export interface ImageCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TezaurDraftLink {
  id: string;
  kind: string;
  url: string;
  label: string | null;
  vendor: string | null;
}

export interface TezaurDraftRelationship {
  relId: string;
  id: string;
  slug: string;
  brand: string;
  model: string;
  type: string;
  note: string | null;
}

export interface TezaurDraftDetail {
  gear: {
    id: string;
    slug: string;
    state: GearState;
    rejectionReason: string | null;
    brand: string;
    model: string;
    category: string;
    formFactor: string | null;
    familyId: string | null;
    yearReleased: number | null;
    yearDiscontinued: number | null;
    msrpAtLaunchEur: string | null;
    specs: Record<string, unknown>;
    taglineRo: string | null;
    taglineEn: string | null;
    submittedAt: string | null;
    updatedAt: string;
    createdBy: string | null;
  };
  family: { id: string; slug: string; name: string } | null;
  images: TezaurDraftImage[];
  links: TezaurDraftLink[];
  relationships: { parent: TezaurDraftRelationship[] };
  description: { body: unknown; bodyHtml: string } | null;
  descriptionEn: { body: unknown; bodyHtml: string } | null;
}

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
  /** Spec §8.1 official forum thread (RO: „Thread oficial"). */
  officialThread: {
    id: string;
    slug: string;
    title: string;
    postCount: number;
    lastPostAt: string | null;
  } | null;
  /** Count of threads with this gear in their `gear_tag[]` (excluding canonical). */
  relatedThreadsCount: number;
}

@Injectable({ providedIn: 'root' })
export class TezaurService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
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

  /** Absolute URL to an uploaded image variant. Resolved against the storage public base. */
  imageUrl(relativePath: string | null | undefined): string {
    return this.appConfig.imageUrl(relativePath);
  }

  /* ============================================================
     M11 — auto-suggest meta endpoints
     ============================================================ */

  listBrandSuggestions(): Promise<TezaurBrandSuggestion[]> {
    return firstValueFrom(
      this.http.get<TezaurBrandSuggestion[]>(
        `${this.base}/tezaur/meta/brands`,
      ),
    );
  }

  /**
   * Contributor brand list — includes the caller's own drafts so a freshly
   * created brand isn't missing from autocomplete while it's in moderation.
   */
  listMyBrandSuggestions(): Promise<TezaurBrandSuggestion[]> {
    return firstValueFrom(
      this.http.get<TezaurBrandSuggestion[]>(
        `${this.base}/me/tezaur/meta/brands`,
      ),
    );
  }

  listFamilySuggestions(): Promise<TezaurFamilySuggestion[]> {
    return firstValueFrom(
      this.http.get<TezaurFamilySuggestion[]>(
        `${this.base}/tezaur/meta/families`,
      ),
    );
  }

  /* ============================================================
     M11 — own drafts (contributor flow)
     ============================================================ */

  listMyDrafts(): Promise<TezaurMyDraft[]> {
    return firstValueFrom(
      this.http.get<TezaurMyDraft[]>(`${this.base}/me/tezaur/drafts`),
    );
  }

  createDraft(payload: TezaurDraftPayload): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/me/tezaur/gear`,
        payload,
      ),
    );
  }

  getDraft(id: string): Promise<TezaurDraftDetail> {
    return firstValueFrom(
      this.http.get<TezaurDraftDetail>(`${this.base}/me/tezaur/gear/${id}`),
    );
  }

  updateDraft(id: string, payload: TezaurDraftPayload): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(`${this.base}/me/tezaur/gear/${id}`, payload),
    );
  }

  deleteDraft(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/me/tezaur/gear/${id}`),
    );
  }

  submitDraft(id: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/me/tezaur/gear/${id}/submit`, {}),
    );
  }

  /* ---- images ---- */

  uploadDraftImage(
    gearId: string,
    file: File,
    caption?: string,
  ): Promise<{ sourceId: string }> {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    return firstValueFrom(
      this.http.post<{ sourceId: string }>(
        `${this.base}/me/tezaur/gear/${gearId}/images`,
        form,
      ),
    );
  }

  deleteDraftImage(gearId: string, sourceId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/tezaur/gear/${gearId}/images/${sourceId}`,
      ),
    );
  }

  reorderDraftImages(gearId: string, sourceIds: string[]): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(
        `${this.base}/me/tezaur/gear/${gearId}/images/reorder`,
        { sourceIds },
      ),
    );
  }

  setDraftImageCrop(
    gearId: string,
    sourceId: string,
    crop: ImageCropRect,
  ): Promise<void> {
    return firstValueFrom(
      this.http.patch<void>(
        `${this.base}/me/tezaur/gear/${gearId}/images/${sourceId}/crop`,
        crop,
      ),
    );
  }

  /* ---- links ---- */

  addDraftLink(
    gearId: string,
    payload: { kind: string; url: string; label?: string; vendor?: string },
  ): Promise<{ id: string }> {
    return firstValueFrom(
      this.http.post<{ id: string }>(
        `${this.base}/me/tezaur/gear/${gearId}/links`,
        payload,
      ),
    );
  }

  deleteDraftLink(gearId: string, linkId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/tezaur/gear/${gearId}/links/${linkId}`,
      ),
    );
  }

  /* ---- relationships ---- */

  addDraftRelationship(
    gearId: string,
    payload: { childGearId: string; type: string; note?: string },
  ): Promise<{ id: string }> {
    return firstValueFrom(
      this.http.post<{ id: string }>(
        `${this.base}/me/tezaur/gear/${gearId}/relationships`,
        payload,
      ),
    );
  }

  deleteDraftRelationship(gearId: string, relId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/tezaur/gear/${gearId}/relationships/${relId}`,
      ),
    );
  }

  /* ============================================================
     Moderation queue (curator+ only) — site-side surface so the
     "De moderat" tab on /cont/contributii-tezaur can read and act
     on submitted gear without sending users into the dashboard.
     ============================================================ */

  listModerationQueue(
    query: TezaurModerationQuery = {},
  ): Promise<TezaurModerationResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return firstValueFrom(
      this.http.get<TezaurModerationResponse>(
        `${this.base}/admin/tezaur/moderation`,
        { params },
      ),
    );
  }

  approveModerationItem(gearId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/admin/tezaur/gear/${gearId}/approve`,
        {},
      ),
    );
  }

  rejectModerationItem(gearId: string, reason: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/admin/tezaur/gear/${gearId}/reject`,
        { reason },
      ),
    );
  }
}
