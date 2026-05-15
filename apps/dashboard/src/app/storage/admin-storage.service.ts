import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type StorageLimitScope =
  | 'per_file'
  | 'per_user_daily'
  | 'per_user_lifetime_alert';
export type StorageFileTypeValue =
  | 'image'
  | 'audio'
  | 'pdf'
  | 'zip'
  | '*';
export type StorageModuleValue =
  | 'tezaur'
  | 'bazar'
  | 'revista'
  | 'forum'
  | 'avatar'
  | '*';

export interface AdminLimitRow {
  id: string;
  scope: StorageLimitScope;
  fileType: StorageFileTypeValue;
  module: StorageModuleValue;
  maxBytes: number;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
}

export interface AdminOverview {
  totalBytes: number;
  totalEvents: number;
  perModule: Array<{ module: StorageModuleValue; bytes: number; events: number }>;
  perFileType: Array<{ fileType: string; bytes: number; events: number }>;
}

export interface AdminFolderRow {
  module: StorageModuleValue;
  resourceId: string;
  totalBytes: number;
  fileCount: number;
  updatedAt: string;
}

export interface AdminTrendsPoint {
  bucket: string;
  bytes: number;
  events: number;
}

export interface AdminTopUserRow {
  userId: string;
  username: string | null;
  bytes: number;
  events: number;
}

@Injectable({ providedIn: 'root' })
export class AdminStorageDashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listLimits(): Promise<AdminLimitRow[]> {
    return firstValueFrom(
      this.http.get<AdminLimitRow[]>(`${this.base}/admin/storage/limits`, {
        withCredentials: true,
      }),
    );
  }

  updateLimit(id: string, maxBytes: number): Promise<AdminLimitRow> {
    return firstValueFrom(
      this.http.put<AdminLimitRow>(
        `${this.base}/admin/storage/limits/${id}`,
        { maxBytes },
        { withCredentials: true },
      ),
    );
  }

  overview(): Promise<AdminOverview> {
    return firstValueFrom(
      this.http.get<AdminOverview>(`${this.base}/admin/storage/overview`, {
        withCredentials: true,
      }),
    );
  }

  folders(opts: {
    module?: StorageModuleValue;
    limit?: number;
  } = {}): Promise<AdminFolderRow[]> {
    let params = new HttpParams();
    if (opts.module && opts.module !== '*')
      params = params.set('module', opts.module);
    if (opts.limit !== undefined)
      params = params.set('limit', String(opts.limit));
    return firstValueFrom(
      this.http.get<AdminFolderRow[]>(`${this.base}/admin/storage/folders`, {
        params,
        withCredentials: true,
      }),
    );
  }

  trends(opts: {
    granularity?: 'day' | 'week' | 'month';
    from?: string;
    to?: string;
  } = {}): Promise<AdminTrendsPoint[]> {
    let params = new HttpParams();
    if (opts.granularity)
      params = params.set('granularity', opts.granularity);
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    return firstValueFrom(
      this.http.get<AdminTrendsPoint[]>(`${this.base}/admin/storage/trends`, {
        params,
        withCredentials: true,
      }),
    );
  }

  topUsers(opts: {
    from?: string;
    to?: string;
    limit?: number;
  } = {}): Promise<AdminTopUserRow[]> {
    let params = new HttpParams();
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    if (opts.limit !== undefined)
      params = params.set('limit', String(opts.limit));
    return firstValueFrom(
      this.http.get<AdminTopUserRow[]>(`${this.base}/admin/storage/users`, {
        params,
        withCredentials: true,
      }),
    );
  }

  reconcile(): Promise<{ jobId: string | null }> {
    return firstValueFrom(
      this.http.post<{ jobId: string | null }>(
        `${this.base}/admin/storage/reconcile`,
        {},
        { withCredentials: true },
      ),
    );
  }
}
