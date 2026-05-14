import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RealtimeClientService } from '../realtime/realtime-client.service';

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
  private readonly realtime = inject(RealtimeClientService);
  private readonly base = environment.apiBaseUrl;

  readonly unread = signal<number>(0);
  readonly items = signal<NotificationRow[]>([]);
  readonly loading = signal(false);

  /**
   * 5-minute fallback poll. With WS push the unread counter stays
   * fresh in real time; this only catches the edge case where the
   * socket couldn't connect (network blip, offline tab refocus).
   */
  private static readonly FALLBACK_POLL_MS = 5 * 60_000;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.realtime.notification$.subscribe((row) => this.onPush(row));
  }

  startPolling(): void {
    if (this.pollTimer) return;
    void this.refreshUnreadCount();
    this.pollTimer = setInterval(
      () => void this.refreshUnreadCount(),
      NotificationsService.FALLBACK_POLL_MS,
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

  private onPush(row: NotificationRow): void {
    // Bump the unread counter (always) + prepend to the cached list
    // if the bell panel has been opened at least once. Dedup by id.
    if (this.items().some((r) => r.id === row.id)) return;
    if (this.items().length > 0) {
      this.items.update((rows) => [row, ...rows].slice(0, 30));
    }
    if (!row.readAt) {
      this.unread.update((n) => n + 1);
    }
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
