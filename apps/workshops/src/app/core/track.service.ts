import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

/** Fire-and-forget access analytics (workshops-spec.md §9). */
@Injectable({ providedIn: 'root' })
export class TrackService {
  private readonly http = inject(HttpClient);

  view(document: string, lang: 'en' | 'ro') {
    this.send({ event: 'view', document, lang });
  }

  download(document: string, lang: 'en' | 'ro') {
    this.send({ event: 'download', document, lang });
  }

  private send(body: Record<string, string>) {
    this.http.post('/api/events', body).subscribe({
      error: () => {
        // Analytics must never disturb the user experience.
      },
    });
  }
}
