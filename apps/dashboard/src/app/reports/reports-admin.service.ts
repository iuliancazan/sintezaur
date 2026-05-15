import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type ReportTarget =
  | 'gear_review'
  | 'listing'
  | 'message'
  | 'forum_post'
  | 'forum_thread'
  | 'article_comment'
  | 'user_profile';

export type ReportStatus =
  | 'open'
  | 'reviewing'
  | 'resolved_action_taken'
  | 'resolved_no_action'
  | 'duplicate';

export type ResolveResolution =
  | 'resolved_action_taken'
  | 'resolved_no_action'
  | 'duplicate';

export type ResolveAction =
  | 'none'
  | 'hide_post'
  | 'lock_thread'
  | 'delete_thread';

export interface ReportRow {
  id: string;
  reporterId: string | null;
  reporterUsername: string | null;
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  status: ReportStatus;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  targetSnapshot: {
    kind: ReportTarget;
    title?: string;
    slug?: string;
    bodyExcerpt?: string;
  } | null;
}

export interface ReportsResponse {
  items: ReportRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ResolveBody {
  resolution: ResolveResolution;
  action?: ResolveAction;
  actionReason?: string;
  resolutionNote?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(opts: {
    status?: ReportStatus;
    targetType?: ReportTarget;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ReportsResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(opts)) {
      if (v === undefined || v === null) continue;
      const s = String(v);
      if (s === '') continue;
      params = params.set(k, s);
    }
    return firstValueFrom(
      this.http.get<ReportsResponse>(`${this.base}/content-reports`, {
        params,
        withCredentials: true,
      }),
    );
  }

  resolve(id: string, body: ResolveBody): Promise<ReportRow> {
    return firstValueFrom(
      this.http.patch<ReportRow>(
        `${this.base}/content-reports/${id}/resolve`,
        body,
        { withCredentials: true },
      ),
    );
  }
}
