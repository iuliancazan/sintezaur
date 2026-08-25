import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type SessionRole = 'guest' | 'admin' | 'superadmin';

export interface WorkshopInfo {
  slug: string;
  titleEn: string;
  titleRo: string;
  subtitleEn: string | null;
  subtitleRo: string | null;
  eventDate: string | null;
  venue: string | null;
  published: boolean;
  guestSeesSlides: boolean;
}

export interface Session {
  role: SessionRole;
  workshop?: WorkshopInfo | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** undefined = not yet checked; null = no session. */
  readonly session = signal<Session | null | undefined>(undefined);

  /** Resolves the current session, asking the API only when unknown. */
  async resolve(): Promise<Session | null> {
    const current = this.session();
    if (current !== undefined) {
      return current;
    }
    try {
      const me = await firstValueFrom(this.http.get<Session>('/api/auth/me'));
      this.session.set(me);
      return me;
    } catch {
      this.session.set(null);
      return null;
    }
  }

  async login(slug: string, password: string): Promise<Session> {
    await firstValueFrom(
      this.http.post('/api/auth/login', { slug, password }),
    );
    this.session.set(undefined);
    return (await this.resolve()) as Session;
  }

  async loginSuperadmin(password: string): Promise<Session> {
    await firstValueFrom(this.http.post('/api/auth/superadmin', { password }));
    this.session.set(undefined);
    return (await this.resolve()) as Session;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } finally {
      this.session.set(null);
    }
  }

  /** Called by the 401 interceptor — session expired server-side. */
  invalidate() {
    this.session.set(null);
  }
}
