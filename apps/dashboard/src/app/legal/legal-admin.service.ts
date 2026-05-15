import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LegalPageAdminRow {
  slug: string;
  title: string;
  bodyMd: string;
  metaDescription: string | null;
  updatedAt: string;
  updatedByUserId: string | null;
}

export interface UpdateLegalPagePayload {
  title: string;
  bodyMd: string;
  metaDescription?: string | null;
}

export type ContactCategory =
  | 'cumparator'
  | 'vanzator'
  | 'editor'
  | 'juridic'
  | 'altele';
export type ContactStatus = 'new' | 'read' | 'archived';

export interface ContactMessageRow {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  category: ContactCategory;
  subject: string;
  body: string;
  status: ContactStatus;
  ipAddress: string | null;
  userAgent: string | null;
  readByUserId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ContactMessagesResponse {
  items: ContactMessageRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class LegalAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Promise<LegalPageAdminRow[]> {
    return firstValueFrom(
      this.http.get<LegalPageAdminRow[]>(`${this.base}/admin/legal`, {
        withCredentials: true,
      }),
    );
  }

  update(slug: string, payload: UpdateLegalPagePayload): Promise<unknown> {
    return firstValueFrom(
      this.http.put(`${this.base}/admin/legal/${slug}`, payload, {
        withCredentials: true,
      }),
    );
  }

  listMessages(params: {
    status?: ContactStatus;
    category?: ContactCategory;
    page?: number;
    pageSize?: number;
  }): Promise<ContactMessagesResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.category) qs.set('category', params.category);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const url = `${this.base}/admin/contact-messages${
      qs.toString() ? `?${qs}` : ''
    }`;
    return firstValueFrom(
      this.http.get<ContactMessagesResponse>(url, { withCredentials: true }),
    );
  }

  setMessageStatus(
    id: string,
    status: 'read' | 'archived',
  ): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(
        `${this.base}/admin/contact-messages/${id}`,
        { status },
        { withCredentials: true },
      ),
    );
  }
}
