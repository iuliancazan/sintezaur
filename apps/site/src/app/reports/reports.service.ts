import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type ReportTargetType =
  | 'listing'
  | 'message'
  | 'gear_review'
  | 'forum_post'
  | 'forum_thread'
  | 'article_comment'
  | 'user_profile';

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  /** Honeypot anti-spam — always empty in real submissions. */
  hp?: string;
  /** Epoch ms when the form opened — used by anti-spam time-on-form. */
  formStartedAt?: number;
}

/**
 * Generic site-side wrapper for `/content-reports` (created in M5-G).
 * Forum surfaces wire this via `forum.service.reportContent`; M6-E2
 * extends usage to Bazar (`listing` / `message` / `gear_review`) and
 * `user_profile`. All targets share the same endpoint + queue.
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  submit(payload: CreateReportPayload): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${this.base}/content-reports`, payload, {
        withCredentials: true,
      }),
    );
  }
}
