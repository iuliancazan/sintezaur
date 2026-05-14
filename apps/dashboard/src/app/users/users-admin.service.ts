import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  fullName: string;
  emailVerified: boolean;
  trustLevel: string;
  createdAt: string;
  roles: string[];
}

export interface AdminUsersResponse {
  items: AdminUserRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class UsersAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(query: { q?: string; page?: number; pageSize?: number } = {}): Promise<AdminUsersResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, String(v));
    }
    return firstValueFrom(
      this.http.get<AdminUsersResponse>(`${this.base}/admin/users`, {
        params,
        withCredentials: true,
      }),
    );
  }

  grantRole(userId: string, role: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/admin/users/${userId}/roles`,
        { role },
        { withCredentials: true },
      ),
    );
  }

  revokeRole(userId: string, role: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/admin/users/${userId}/roles/${role}`,
        { withCredentials: true },
      ),
    );
  }
}
