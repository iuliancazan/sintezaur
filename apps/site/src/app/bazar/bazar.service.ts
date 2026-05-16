import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  DisplayCurrencyLiteral,
  ListingConditionLiteral,
  ListingDeliveryLiteral,
  ListingKindLiteral,
  ListingSortLiteral,
  ListingStatusLiteral,
} from '@sintezaur/shared';
import { AppConfigService } from '@sintezaur/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BazarListItem {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model: string | null;
  gearId: string | null;
  gearSlug: string | null;
  price: string;
  currency: DisplayCurrencyLiteral;
  condition: ListingConditionLiteral;
  kind: ListingKindLiteral;
  delivery: ListingDeliveryLiteral;
  acceptsOffers: boolean;
  location: string;
  thumb: string | null;
  status: ListingStatusLiteral;
  createdAt: string;
  expiresAt: string | null;
  refreshedAt: string | null;
  seller: {
    id: string;
    username: string;
    avgRating: string | null;
    reviewCount: number;
    transactionCount: number;
  };
}

export interface BazarListResponse {
  items: BazarListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface BazarListQuery {
  q?: string;
  gearId?: string;
  brand?: string;
  category?: string;
  conditions?: ListingConditionLiteral[];
  kinds?: ListingKindLiteral[];
  deliveries?: ListingDeliveryLiteral[];
  location?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: DisplayCurrencyLiteral;
  sort?: ListingSortLiteral;
  page?: number;
  pageSize?: number;
}

export interface RecentlySoldResponse {
  items: BazarListItem[];
}

export interface ListingPayload {
  gearId?: string | null;
  rawMake?: string | null;
  rawModel?: string | null;
  rawYear?: number | null;
  title: string;
  tagline?: string | null;
  description: Record<string, unknown>;
  descriptionHtml?: string;
  price: number;
  currency: DisplayCurrencyLiteral;
  condition: ListingConditionLiteral;
  conditionNote?: string | null;
  defects?: string | null;
  kind: ListingKindLiteral;
  lookingFor?: string | null;
  delivery: ListingDeliveryLiteral;
  shippingCost?: number | null;
  shippingCarriers?: string[];
  acceptsOffers: boolean;
  location: string;
  contactPhone?: string | null;
}

export interface DraftSeedPayload {
  gearId?: string;
  rawMake?: string;
  rawModel?: string;
  rawYear?: number;
  title?: string;
}

export interface InboxThread {
  threadId: string;
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  listingStatus: ListingStatusLiteral;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  sellerLastReadAt: string | null;
  buyerLastReadAt: string | null;
  otherUsername: string;
}

export type ChatMessageKind =
  | 'text'
  | 'offer'
  | 'counter_offer'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'transaction_confirmed'
  | 'system';

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string | null;
  kind: ChatMessageKind;
  body: string | null;
  offerAmount: string | null;
  offerCurrency: DisplayCurrencyLiteral | null;
  offerExpiresAt: string | null;
  repliesToMessageId: string | null;
  createdAt: string;
  editedAt: string | null;
}

export interface ThreadView {
  thread: {
    id: string;
    listingId: string;
    buyerId: string;
    lastMessageAt: string;
    lastMessagePreview: string | null;
    sellerLastReadAt: string | null;
    buyerLastReadAt: string | null;
    offerRoundCount: number;
    createdAt: string;
  };
  listing: {
    id: string;
    slug: string;
    sellerId: string;
    title: string;
    price: string;
    currency: DisplayCurrencyLiteral;
    condition: ListingConditionLiteral;
    status: ListingStatusLiteral;
    acceptsOffers: boolean;
  };
  messages: ChatMessage[];
}

export interface TransactionDto {
  id: string;
  listingId: string;
  threadId: string;
  sellerId: string;
  buyerId: string;
  status: 'pending' | 'confirmed' | 'disputed' | 'cancelled';
  finalPrice: string;
  currency: DisplayCurrencyLiteral;
  acceptedOfferMessageId: string | null;
  sellerConfirmedAt: string | null;
  buyerConfirmedAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionReviewDto {
  id: string;
  transactionId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  body: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearchRow {
  id: string;
  userId: string;
  target: 'bazar' | 'tezaur' | 'forum';
  name: string;
  query: Record<string, unknown>;
  notifyMode: 'instant' | 'daily_digest' | 'off';
  lastEvaluatedAt: string | null;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WatchedListingRow {
  listingId: string;
  slug: string;
  title: string;
  price: string;
  currency: DisplayCurrencyLiteral;
  status: ListingStatusLiteral;
  location: string;
  condition: ListingConditionLiteral;
  createdAt: string;
  watchedAt: string;
  thumb: string | null;
}

export interface QuickListSuggestion {
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
  };
  suggestedTitle: string;
  suggestedConditions: string[];
  priceStats: {
    currency: 'ron' | 'eur';
    avg: number | null;
    median: number | null;
    low: number | null;
    high: number | null;
    soldCount: number;
    activeCount: number;
  };
}

export interface BazarListingDetail {
  listing: {
    id: string;
    slug: string;
    sellerId: string;
    gearId: string | null;
    rawMake: string | null;
    rawModel: string | null;
    rawYear: number | null;
    title: string;
    tagline: string | null;
    description: Record<string, unknown>;
    descriptionHtml: string;
    price: string;
    currency: DisplayCurrencyLiteral;
    condition: ListingConditionLiteral;
    conditionNote: string | null;
    defects: string | null;
    kind: ListingKindLiteral;
    lookingFor: string | null;
    delivery: ListingDeliveryLiteral;
    shippingCost: string | null;
    shippingCarriers: string[];
    acceptsOffers: boolean;
    location: string;
    contactPhone: string | null;
    status: ListingStatusLiteral;
    viewCount: number;
    expiresAt: string | null;
    refreshedAt: string | null;
    removedAt: string | null;
    soldAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  photos: {
    id: string;
    sourceId: string;
    variant: string;
    path: string;
    width: number;
    height: number;
    position: number;
  }[];
  gear: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    category: string;
  } | null;
  seller: {
    id: string;
    username: string;
    fullName: string;
    avgRating: string | null;
    reviewCount: number;
    transactionCount: number;
    createdAt: string;
  };
  isWatched: boolean;
}

@Injectable({ providedIn: 'root' })
export class BazarService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
  private readonly base = environment.apiBaseUrl;

  list(query: BazarListQuery = {}): Promise<BazarListResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        for (const item of v) params = params.append(k, String(item));
      } else {
        params = params.set(k, String(v));
      }
    }
    return firstValueFrom(
      this.http.get<BazarListResponse>(`${this.base}/bazar`, { params }),
    );
  }

  detail(slug: string): Promise<BazarListingDetail> {
    return firstValueFrom(
      this.http.get<BazarListingDetail>(`${this.base}/bazar/${slug}`, {
        withCredentials: true,
      }),
    );
  }

  watch(listingId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/me/bazar/listings/${listingId}/watch`,
        {},
        { withCredentials: true },
      ),
    );
  }

  unwatch(listingId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/bazar/listings/${listingId}/watch`,
        { withCredentials: true },
      ),
    );
  }

  quickList(gearId: string): Promise<QuickListSuggestion> {
    return firstValueFrom(
      this.http.get<QuickListSuggestion>(`${this.base}/bazar/quick-list`, {
        params: new HttpParams().set('gearId', gearId),
        withCredentials: true,
      }),
    );
  }

  create(payload: ListingPayload): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/me/bazar/listings`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  /** V07 sell flow: spin up an empty draft so auto-save has somewhere to write. */
  createDraft(
    seed: DraftSeedPayload = {},
  ): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/me/bazar/listings/draft`,
        seed,
        { withCredentials: true },
      ),
    );
  }

  /** Flip a draft into status='active'. Throws 409 with `missing[]` if incomplete. */
  publishDraft(listingId: string): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.post<{ id: string; slug: string }>(
        `${this.base}/me/bazar/listings/${listingId}/publish`,
        {},
        { withCredentials: true },
      ),
    );
  }

  /** Owner-only fetch by id. Returns drafts too. */
  findOwn(listingId: string): Promise<BazarListingDetail> {
    return firstValueFrom(
      this.http.get<BazarListingDetail>(
        `${this.base}/me/bazar/listings/${listingId}`,
        { withCredentials: true },
      ),
    );
  }

  updateOwn(
    listingId: string,
    patch: Partial<ListingPayload>,
  ): Promise<{ id: string; slug: string }> {
    return firstValueFrom(
      this.http.patch<{ id: string; slug: string }>(
        `${this.base}/me/bazar/listings/${listingId}`,
        patch,
        { withCredentials: true },
      ),
    );
  }

  removeOwn(listingId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/bazar/listings/${listingId}`,
        { withCredentials: true },
      ),
    );
  }

  uploadPhoto(
    listingId: string,
    file: File,
  ): Promise<{ sourceId: string }> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(
      this.http.post<{ sourceId: string }>(
        `${this.base}/me/bazar/listings/${listingId}/photos`,
        form,
        { withCredentials: true },
      ),
    );
  }

  removePhoto(listingId: string, sourceId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/bazar/listings/${listingId}/photos/${sourceId}`,
        { withCredentials: true },
      ),
    );
  }

  reorderPhotos(listingId: string, order: string[]): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/me/bazar/listings/${listingId}/photos/reorder`,
        { order },
        { withCredentials: true },
      ),
    );
  }

  startThread(
    listingId: string,
    body: string,
  ): Promise<{ thread: { id: string }; message: { id: string } }> {
    return firstValueFrom(
      this.http.post<{ thread: { id: string }; message: { id: string } }>(
        `${this.base}/me/bazar/listings/${listingId}/threads/messages`,
        { body },
        { withCredentials: true },
      ),
    );
  }

  /* ============ inbox + chat (M3-E4) ============ */

  listInbox(): Promise<InboxThread[]> {
    return firstValueFrom(
      this.http.get<InboxThread[]>(`${this.base}/me/bazar/threads`, {
        withCredentials: true,
      }),
    );
  }

  readThread(threadId: string): Promise<ThreadView> {
    return firstValueFrom(
      this.http.get<ThreadView>(`${this.base}/me/bazar/threads/${threadId}`, {
        withCredentials: true,
      }),
    );
  }

  sendMessage(threadId: string, body: string): Promise<{ message: ChatMessage }> {
    return firstValueFrom(
      this.http.post<{ thread: { id: string }; message: ChatMessage }>(
        `${this.base}/me/bazar/threads/${threadId}/messages`,
        { body },
        { withCredentials: true },
      ),
    );
  }

  makeOffer(
    threadId: string,
    payload: {
      amount: number;
      currency: DisplayCurrencyLiteral;
      note?: string;
      repliesToMessageId?: string;
    },
  ): Promise<{ message: ChatMessage }> {
    return firstValueFrom(
      this.http.post<{ thread: { id: string }; message: ChatMessage }>(
        `${this.base}/me/bazar/threads/${threadId}/offers`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  acceptOffer(
    threadId: string,
    offerId: string,
  ): Promise<{ message: ChatMessage }> {
    return firstValueFrom(
      this.http.post<{ message: ChatMessage }>(
        `${this.base}/me/bazar/threads/${threadId}/offers/${offerId}/accept`,
        {},
        { withCredentials: true },
      ),
    );
  }

  rejectOffer(
    threadId: string,
    offerId: string,
  ): Promise<{ message: ChatMessage }> {
    return firstValueFrom(
      this.http.post<{ message: ChatMessage }>(
        `${this.base}/me/bazar/threads/${threadId}/offers/${offerId}/reject`,
        {},
        { withCredentials: true },
      ),
    );
  }

  confirmTransaction(threadId: string): Promise<{
    transaction: TransactionDto;
    confirmed: boolean;
  }> {
    return firstValueFrom(
      this.http.post<{ transaction: TransactionDto; confirmed: boolean }>(
        `${this.base}/me/bazar/threads/${threadId}/confirm-transaction`,
        {},
        { withCredentials: true },
      ),
    );
  }

  getTransaction(threadId: string): Promise<TransactionDto | null> {
    return firstValueFrom(
      this.http.get<TransactionDto | null>(
        `${this.base}/me/bazar/threads/${threadId}/transaction`,
        { withCredentials: true },
      ),
    );
  }

  submitReview(
    transactionId: string,
    rating: number,
    body: string,
  ): Promise<TransactionReviewDto> {
    return firstValueFrom(
      this.http.post<TransactionReviewDto>(
        `${this.base}/me/bazar/transactions/${transactionId}/review`,
        { rating, body },
        { withCredentials: true },
      ),
    );
  }

  listOwn(status?: ListingStatusLiteral): Promise<BazarListItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return firstValueFrom(
      this.http.get<BazarListItem[]>(`${this.base}/me/bazar/listings`, {
        params,
        withCredentials: true,
      }),
    );
  }

  refreshOwn(listingId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.base}/me/bazar/listings/${listingId}/refresh`,
        {},
        { withCredentials: true },
      ),
    );
  }

  listSavedSearches(): Promise<SavedSearchRow[]> {
    return firstValueFrom(
      this.http.get<SavedSearchRow[]>(`${this.base}/me/bazar/saved-searches`, {
        withCredentials: true,
      }),
    );
  }

  createSavedSearch(payload: {
    name: string;
    query: Record<string, unknown>;
    notifyMode?: 'instant' | 'daily_digest' | 'off';
  }): Promise<SavedSearchRow> {
    return firstValueFrom(
      this.http.post<SavedSearchRow>(
        `${this.base}/me/bazar/saved-searches`,
        payload,
        { withCredentials: true },
      ),
    );
  }

  updateSavedSearch(
    id: string,
    patch: {
      name?: string;
      query?: Record<string, unknown>;
      notifyMode?: 'instant' | 'daily_digest' | 'off';
    },
  ): Promise<SavedSearchRow> {
    return firstValueFrom(
      this.http.patch<SavedSearchRow>(
        `${this.base}/me/bazar/saved-searches/${id}`,
        patch,
        { withCredentials: true },
      ),
    );
  }

  deleteSavedSearch(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.base}/me/bazar/saved-searches/${id}`,
        { withCredentials: true },
      ),
    );
  }

  listWatches(): Promise<WatchedListingRow[]> {
    return firstValueFrom(
      this.http.get<WatchedListingRow[]>(`${this.base}/me/bazar/watches`, {
        withCredentials: true,
      }),
    );
  }

  recentlySold(query: { gearId?: string; limit?: number } = {}): Promise<RecentlySoldResponse> {
    let params = new HttpParams();
    if (query.gearId) params = params.set('gearId', query.gearId);
    if (query.limit) params = params.set('limit', String(query.limit));
    return firstValueFrom(
      this.http.get<RecentlySoldResponse>(`${this.base}/bazar/recently-sold`, {
        params,
      }),
    );
  }

  /** Absolute URL to an uploaded image variant. Resolved against the storage public base. */
  imageUrl(relativePath: string | null | undefined): string {
    return this.appConfig.imageUrl(relativePath);
  }
}
