import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type FeedbackKind = 'bug' | 'sugestie' | 'altele';
export type FeedbackStatus = 'new' | 'read' | 'archived';

export interface FeedbackRow {
  id: string;
  userId: string;
  kind: FeedbackKind;
  body: string;
  pageUrl: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  status: FeedbackStatus;
  readByUserId: string | null;
  readAt: string | null;
  createdAt: string;
  authorUsername: string | null;
  authorEmail: string | null;
  authorFullName: string | null;
}

export interface FeedbackResponse {
  items: FeedbackRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class FeedbackAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(params: {
    status?: FeedbackStatus;
    kind?: FeedbackKind;
    page?: number;
    pageSize?: number;
  }): Promise<FeedbackResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.kind) qs.set('kind', params.kind);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const url = `${this.base}/admin/feedback${qs.toString() ? `?${qs}` : ''}`;
    return firstValueFrom(
      this.http.get<FeedbackResponse>(url, { withCredentials: true }),
    );
  }

  setStatus(id: string, status: 'read' | 'archived'): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(
        `${this.base}/admin/feedback/${id}`,
        { status },
        { withCredentials: true },
      ),
    );
  }
}
