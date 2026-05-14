import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DASHBOARD_ROLES, hasAnyRole, type AuthUser } from './auth.types';

interface MeResponse {
  user: AuthUser;
}

/**
 * Dashboard-side auth surface. Cookie-based; relies on the same
 * `.sintezaur.ro`-scoped cookies the site sets — in dev, both api
 * (3000), site (4200) and dashboard (4201) share `localhost`, so
 * the cookies travel transparently.
 *
 * Adds an extra rule on top of the site service: only users with
 * roles in DASHBOARD_ROLES can sign in here. Anyone else is bounced
 * back with a friendly error.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly _currentUser = signal<AuthUser | null>(null);
  readonly ready = signal<boolean>(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isStaff = computed(() => hasAnyRole(this._currentUser(), DASHBOARD_ROLES));

  async loadCurrentUser(): Promise<void> {
    const result = await firstValueFrom(
      this.http
        .get<MeResponse>(`${this.base}/auth/me`, { withCredentials: true })
        .pipe(catchError(() => of(null))),
    );
    this._currentUser.set(result?.user ?? null);
    this.ready.set(true);
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.post<MeResponse>(
        `${this.base}/auth/login`,
        { email, password },
        { withCredentials: true },
      ),
    );
    this._currentUser.set(res.user);
    return res.user;
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http
        .post<void>(`${this.base}/auth/logout`, null, { withCredentials: true })
        .pipe(catchError(() => of(null))),
    );
    this._currentUser.set(null);
  }

  async refresh(): Promise<AuthUser | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<MeResponse>(`${this.base}/auth/refresh`, null, {
          withCredentials: true,
        }),
      );
      this._currentUser.set(res.user);
      return res.user;
    } catch {
      this._currentUser.set(null);
      return null;
    }
  }
}
