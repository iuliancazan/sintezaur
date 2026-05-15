import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BlockListItem {
  id: string;
  blockedUserId: string;
  blockedUsername: string;
  blockedFullName: string;
  blockedAvatarUrl: string | null;
  reason: string | null;
  createdAt: string;
}

/**
 * `/me/blocks` client. Backed by a single in-memory cache: when the
 * user blocks/unblocks somebody from any surface, the cache flips so
 * the next pageload (or current page that consumes `isBlocked()`)
 * reflects the change without re-fetching the entire list.
 *
 * Anti-pattern guard: not a route guard / interceptor. Feature pages
 * must call `loadIfStale()` when they mount if they care about a
 * specific user's block state and weren't reached from a flow that
 * already hydrated us.
 */
@Injectable({ providedIn: 'root' })
export class BlocksService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly _items = signal<BlockListItem[]>([]);
  private readonly _loaded = signal(false);
  private readonly _blockedIds = computed(
    () => new Set(this._items().map((b) => b.blockedUserId)),
  );

  readonly items = this._items.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  async load(): Promise<BlockListItem[]> {
    const data = await firstValueFrom(
      this.http.get<BlockListItem[]>(`${this.base}/me/blocks`, {
        withCredentials: true,
      }),
    );
    this._items.set(data);
    this._loaded.set(true);
    return data;
  }

  async loadIfStale(): Promise<void> {
    if (!this._loaded()) await this.load();
  }

  isBlocked(userId: string): boolean {
    return this._blockedIds().has(userId);
  }

  async block(input: {
    blockedUserId?: string;
    blockedUsername?: string;
    reason?: string;
  }): Promise<BlockListItem> {
    const created = await firstValueFrom(
      this.http.post<BlockListItem>(`${this.base}/me/blocks`, input, {
        withCredentials: true,
      }),
    );
    this._items.update((cur) => [created, ...cur]);
    this._loaded.set(true);
    return created;
  }

  async unblock(blockedUserId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/blocks/${blockedUserId}`,
        { withCredentials: true },
      ),
    );
    this._items.update((cur) =>
      cur.filter((b) => b.blockedUserId !== blockedUserId),
    );
  }
}
