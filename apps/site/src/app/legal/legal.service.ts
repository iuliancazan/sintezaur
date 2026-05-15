import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LegalPageSummary {
  slug: string;
  title: string;
  updatedAt: string;
}

export interface LegalPage {
  slug: string;
  title: string;
  bodyMd: string;
  metaDescription: string | null;
  updatedAt: string;
}

export type ContactCategory =
  | 'cumparator'
  | 'vanzator'
  | 'editor'
  | 'juridic'
  | 'altele';

export interface ContactSubmission {
  name: string;
  email: string;
  category: ContactCategory;
  subject: string;
  body: string;
  hp?: string;
  formStartedAt?: number;
}

/**
 * Static legal/info pages + public contact form (M6-A).
 *
 * Pages are GET'd lazily by slug from `/legal/:slug`. Caches are
 * keyed by slug so navigating between routes (termeni →
 * confidentialitate) doesn't refetch what we already have.
 */
@Injectable({ providedIn: 'root' })
export class LegalService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, LegalPage>();

  async getPage(slug: string): Promise<LegalPage> {
    const cached = this.cache.get(slug);
    if (cached) return cached;
    const page = await firstValueFrom(
      this.http.get<LegalPage>(`${environment.apiBaseUrl}/legal/${slug}`),
    );
    this.cache.set(slug, page);
    return page;
  }

  async listSummary(): Promise<LegalPageSummary[]> {
    return firstValueFrom(
      this.http.get<LegalPageSummary[]>(`${environment.apiBaseUrl}/legal`),
    );
  }

  async submitContact(payload: ContactSubmission): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${environment.apiBaseUrl}/contact`, payload),
    );
  }
}
