import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type NotificationKindLiteral =
  | 'bazar_new_message'
  | 'bazar_new_offer'
  | 'bazar_counter_offer'
  | 'bazar_offer_accepted'
  | 'bazar_offer_rejected'
  | 'bazar_price_drop_watched'
  | 'bazar_saved_search_match'
  | 'bazar_listing_expiring'
  | 'bazar_transaction_confirmed_by_other'
  | 'bazar_review_submitted_on_me'
  | 'tezaur_review_on_my_gear'
  | 'revista_article_in_followed_category'
  | 'revista_reply_to_my_article'
  | 'forum_reply_in_subscribed'
  | 'forum_mention'
  | 'forum_badge_earned'
  | 'forum_mod_action_on_my_content'
  | 'forum_report_resolved'
  | 'admin_announcement';

export interface NotificationRow {
  id: string;
  recipientId: string;
  kind: NotificationKindLiteral;
  channel: 'in_app' | 'email' | 'both';
  dedupKey: string;
  targetType: string | null;
  targetId: string | null;
  payload: Record<string, unknown>;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Bell + panel state. Holds unread count + most-recent items.
 * Polls every 60s while logged in (WS push lands in a later phase).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  readonly unread = signal<number>(0);
  readonly items = signal<NotificationRow[]>([]);
  readonly loading = signal(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  startPolling(): void {
    if (this.pollTimer) return;
    void this.refreshUnreadCount();
    this.pollTimer = setInterval(
      () => void this.refreshUnreadCount(),
      60_000,
    );
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.unread.set(0);
    this.items.set([]);
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ count: number }>(
          `${this.base}/me/notifications/unread-count`,
          { withCredentials: true },
        ),
      );
      this.unread.set(res.count);
    } catch {
      // ignore polling errors
    }
  }

  async loadList(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: NotificationRow[]; unread: number }>(
          `${this.base}/me/notifications`,
          {
            params: new HttpParams().set('limit', '30'),
            withCredentials: true,
          },
        ),
      );
      this.items.set(res.items);
      this.unread.set(res.unread);
    } catch (err) {
      console.error('[notifications] load failed', err);
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch<void>(
          `${this.base}/me/notifications/mark-all-read`,
          {},
          { withCredentials: true },
        ),
      );
      this.items.update((rows) =>
        rows.map((r) => (r.readAt ? r : { ...r, readAt: new Date().toISOString() })),
      );
      this.unread.set(0);
    } catch (err) {
      console.error('[notifications] mark-all-read failed', err);
    }
  }

  async markRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      await firstValueFrom(
        this.http.patch<void>(
          `${this.base}/me/notifications/mark-read`,
          { ids },
          { withCredentials: true },
        ),
      );
      const idSet = new Set(ids);
      this.items.update((rows) =>
        rows.map((r) =>
          idSet.has(r.id) && !r.readAt
            ? { ...r, readAt: new Date().toISOString() }
            : r,
        ),
      );
      this.unread.update((n) => Math.max(0, n - ids.length));
    } catch (err) {
      console.error('[notifications] mark-read failed', err);
    }
  }
}
