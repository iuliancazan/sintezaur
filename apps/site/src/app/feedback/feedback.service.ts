import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type FeedbackKind = 'bug' | 'sugestie' | 'altele';

export interface FeedbackPayload {
  kind: FeedbackKind;
  body: string;
  pageUrl?: string;
}

/**
 * Site-side feedback client (M6-D). Owns:
 *   - the modal-open signal (so the link in /cont can flip it via
 *     `feedback.open()` and the modal listens to it from the root shell)
 *   - the submit HTTP call
 *
 * The modal lives at the root shell (mounted in app.ts) so a single
 * instance handles open/close anywhere on the site. Auth-gated: the
 * call site (account menu link) is already behind authGuard.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly isOpen = signal(false);
  readonly open$ = this.isOpen.asReadonly();

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  async submit(payload: FeedbackPayload): Promise<{ id: string }> {
    return firstValueFrom(
      this.http.post<{ id: string }>(
        `${environment.apiBaseUrl}/feedback`,
        payload,
      ),
    );
  }
}
