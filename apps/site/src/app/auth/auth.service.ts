import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { AuthUser } from './auth.types';

interface MeResponse {
  user: AuthUser;
}

/**
 * Site-side auth surface. Single source of truth for "am I logged
 * in?" via the `currentUser` signal; everything else (guard, nav,
 * profile pages) reads from here.
 *
 * Auth state is driven entirely by the HttpOnly cookie pair set by
 * the API — we never see the tokens in JS. The flip between
 * "anonymous" and "logged in" happens when `loadCurrentUser()`
 * returns a user (i.e. the cookie was valid). The 401-triggered
 * refresh-and-retry loop lives in `auth.interceptor.ts`, not here.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly _currentUser = signal<AuthUser | null>(null);
  /** Becomes true after the boot `loadCurrentUser()` resolves either
   *  way — gives guards a "wait for me" semaphore. */
  readonly ready = signal<boolean>(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);

  /**
   * Best-effort silent session restore on app boot. Hits /auth/me
   * with the cookie; on 401 we stay anonymous (no refresh attempt
   * here — the interceptor handles 401 on *real* requests, and a
   * silent /me on boot doesn't justify a token rotation).
   */
  async loadCurrentUser(): Promise<void> {
    const result = await firstValueFrom(
      this.http
        .get<MeResponse>(`${this.base}/auth/me`, { withCredentials: true })
        .pipe(catchError(() => of(null))),
    );
    this._currentUser.set(result?.user ?? null);
    this.ready.set(true);
  }

  setCurrentUser(user: AuthUser | null): void {
    this._currentUser.set(user);
  }

  signup(body: {
    email: string;
    password: string;
    username: string;
    fullName: string;
  }): Promise<{ userId: string }> {
    return firstValueFrom(
      this.http.post<{ userId: string }>(`${this.base}/auth/signup`, body, {
        withCredentials: true,
      }),
    );
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

  /**
   * Used by the interceptor on 401. Hits /auth/refresh; success
   * returns the user (and rotates cookies server-side), failure
   * leaves state untouched.
   */
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

  verifyEmail(token: string): Promise<{ verified: boolean }> {
    return firstValueFrom(
      this.http.post<{ verified: boolean }>(`${this.base}/auth/verify-email`, {
        token,
      }),
    );
  }

  forgotPassword(email: string): Promise<{ sent: boolean }> {
    return firstValueFrom(
      this.http.post<{ sent: boolean }>(`${this.base}/auth/forgot-password`, {
        email,
      }),
    );
  }

  resetPassword(token: string, password: string): Promise<{ reset: boolean }> {
    return firstValueFrom(
      this.http.post<{ reset: boolean }>(`${this.base}/auth/reset-password`, {
        token,
        password,
      }),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http
        .post<MeResponse>(
          `${this.base}/auth/change-password`,
          { currentPassword, newPassword },
          { withCredentials: true },
        )
        .pipe(catchError((err: HttpErrorResponse) => Promise.reject(err))),
    ).then(() => {
      // Server revoked all sessions — drop local user immediately.
      this._currentUser.set(null);
    });
  }

  changeEmail(currentPassword: string, newEmail: string): Promise<{ sent: boolean }> {
    return firstValueFrom(
      this.http.post<{ sent: boolean }>(
        `${this.base}/auth/change-email`,
        { currentPassword, newEmail },
        { withCredentials: true },
      ),
    );
  }

  async updateProfile(patch: UpdateProfilePayload): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.patch<MeResponse>(`${this.base}/auth/me/profile`, patch, {
        withCredentials: true,
      }),
    );
    this._currentUser.set(res.user);
    return res.user;
  }

  async uploadAvatar(file: File): Promise<AuthUser> {
    const data = new FormData();
    data.append('file', file);
    const res = await firstValueFrom(
      this.http.post<MeResponse>(`${this.base}/auth/me/avatar`, data, {
        withCredentials: true,
      }),
    );
    this._currentUser.set(res.user);
    return res.user;
  }

  async removeAvatar(): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.delete<MeResponse>(`${this.base}/auth/me/avatar`, {
        withCredentials: true,
      }),
    );
    this._currentUser.set(res.user);
    return res.user;
  }

  /** GDPR Art. 15 — returns the full export as a JS object. */
  async exportMyData(): Promise<unknown> {
    return firstValueFrom(
      this.http.get(`${this.base}/auth/me/export`, {
        withCredentials: true,
      }),
    );
  }

  /** GDPR Art. 17 — soft-deletes account, server clears cookies. */
  async deleteAccount(): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.base}/auth/me/account`, {
        withCredentials: true,
      }),
    );
    this._currentUser.set(null);
  }
}

export interface UpdateProfilePayload {
  fullName?: string;
  bio?: string | null;
  location?: string | null;
  displayCurrency?: 'ron' | 'eur';
  websiteUrl?: string | null;
  socialInstagram?: string | null;
  socialSoundcloud?: string | null;
  socialBandcamp?: string | null;
  collectionPublic?: boolean;
}
