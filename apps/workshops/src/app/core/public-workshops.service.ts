import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface PublicWorkshop {
  slug: string;
  titleEn: string;
  titleRo: string;
  subtitleEn: string | null;
  subtitleRo: string | null;
  eventDate: string | null;
  venue: string | null;
}

/** "sequential-fourm" → "SEQUENTIAL FOURM" — the workshop's brand line. */
export function brandFromSlug(slug: string): string {
  return slug.replace(/-/g, ' ').toUpperCase();
}

@Injectable({ providedIn: 'root' })
export class PublicWorkshopsService {
  private readonly http = inject(HttpClient);
  private cache: PublicWorkshop[] | null = null;

  async list(): Promise<PublicWorkshop[]> {
    if (!this.cache) {
      try {
        this.cache = await firstValueFrom(
          this.http.get<PublicWorkshop[]>('/api/workshops'),
        );
      } catch {
        return [];
      }
    }
    return this.cache;
  }

  async bySlug(slug: string): Promise<PublicWorkshop | null> {
    const all = await this.list();
    return all.find((w) => w.slug === slug) ?? null;
  }
}
