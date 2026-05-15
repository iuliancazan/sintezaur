import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type NotificationKind =
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
  | 'admin_announcement'
  | 'storage_quota_lifetime_reached';

export type NotificationChannelKey = 'in_app' | 'email';
export type NotificationMode = 'off' | 'on' | 'digest';

export interface PreferenceRow {
  kind: NotificationKind;
  channel: NotificationChannelKey;
  mode: NotificationMode;
}

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Promise<PreferenceRow[]> {
    return firstValueFrom(
      this.http.get<{ items: PreferenceRow[] }>(
        `${this.base}/me/notifications/preferences`,
        { withCredentials: true },
      ),
    ).then((r) => r.items);
  }

  async save(updates: PreferenceRow[]): Promise<void> {
    if (updates.length === 0) return;
    await firstValueFrom(
      this.http.put<void>(
        `${this.base}/me/notifications/preferences`,
        { items: updates },
        { withCredentials: true },
      ),
    );
  }
}
