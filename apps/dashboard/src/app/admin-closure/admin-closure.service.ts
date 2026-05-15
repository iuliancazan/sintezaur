import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type AuditAction = string;

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorUsername: string | null;
  action: AuditAction;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  items: AuditLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CurrencyRateRow {
  id: string;
  currencyCode: 'ron' | 'eur';
  rateToRon: string;
  validFrom: string;
  updatedBy: string | null;
  note: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminClosureService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listAudit(params: {
    action?: string;
    targetType?: string;
    actorId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AuditLogResponse> {
    const qs = new URLSearchParams();
    if (params.action) qs.set('action', params.action);
    if (params.targetType) qs.set('targetType', params.targetType);
    if (params.actorId) qs.set('actorId', params.actorId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const url = `${this.base}/admin/audit-log${qs.toString() ? `?${qs}` : ''}`;
    return firstValueFrom(
      this.http.get<AuditLogResponse>(url, { withCredentials: true }),
    );
  }

  listCurrencyRates(): Promise<CurrencyRateRow[]> {
    return firstValueFrom(
      this.http.get<CurrencyRateRow[]>(
        `${this.base}/admin/currency-rates`,
        { withCredentials: true },
      ),
    );
  }

  createCurrencyRate(input: {
    currencyCode: 'eur';
    rateToRon: string;
    note?: string;
  }): Promise<CurrencyRateRow> {
    return firstValueFrom(
      this.http.post<CurrencyRateRow>(
        `${this.base}/admin/currency-rates`,
        input,
        { withCredentials: true },
      ),
    );
  }
}
