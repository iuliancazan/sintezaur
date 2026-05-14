import {
  Injectable,
  effect,
  inject,
  signal,
} from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import type {
  ChatMessage,
  TransactionDto,
} from '../bazar/bazar.service';
import type { NotificationRow } from '../notifications/notifications.service';

/**
 * Socket.io client wired against the API gateway exposed at
 * `${API_HOST}/api/socket.io`. The handshake carries the
 * `sintezaur_access` cookie (browsers attach it automatically on
 * same-origin / withCredentials), so we don't ship a token over the
 * wire.
 *
 * Lifecycle: an `effect` connects when the user becomes logged in,
 * disconnects on logout. Reconnect logic is owned by socket.io's
 * built-in exponential backoff — we only resubscribe rooms when a
 * fresh connect fires.
 *
 * Event surface kept narrow on purpose: this service exposes RxJS
 * subjects per server event, and consumers (NotificationsService,
 * the chat thread page) subscribe via the standard async patterns.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeClientService {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;

  readonly connected = signal(false);

  readonly notification$ = new Subject<NotificationRow>();
  readonly chatMessage$ = new Subject<ChatMessage>();
  readonly transactionConfirmed$ = new Subject<TransactionDto>();

  /** Threads we want server-pushed `chat:message` events for. */
  private readonly joinedThreads = new Set<string>();

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.ensureConnected();
      } else {
        this.disconnect();
      }
    });
  }

  joinThread(threadId: string): void {
    this.joinedThreads.add(threadId);
    if (this.socket?.connected) this.socket.emit('chat:join', threadId);
  }

  leaveThread(threadId: string): void {
    this.joinedThreads.delete(threadId);
    if (this.socket?.connected) this.socket.emit('chat:leave', threadId);
  }

  private ensureConnected(): void {
    if (this.socket) return;
    const url = this.deriveOrigin();
    this.socket = io(url, {
      path: '/api/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 15_000,
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      // Re-subscribe rooms after a reconnect.
      for (const t of this.joinedThreads) {
        this.socket?.emit('chat:join', t);
      }
    });
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', (err) => {
      // 401-like errors come back here; the auth interceptor will refresh
      // on the next HTTP call. We just keep retrying.
      console.warn('[realtime] connect error:', err.message);
    });

    this.socket.on('notification:new', (row: NotificationRow) => {
      this.notification$.next(row);
    });
    this.socket.on('chat:message', (msg: ChatMessage) => {
      this.chatMessage$.next(msg);
    });
    this.socket.on('transaction:confirmed', (tx: TransactionDto) => {
      this.transactionConfirmed$.next(tx);
    });
  }

  private disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.joinedThreads.clear();
  }

  /**
   * Strip `/api` from the configured base URL so socket.io connects to
   * the host root (its path is `/api/socket.io`). When the API is on
   * the same origin, an empty string lets the client use the page
   * origin directly.
   */
  private deriveOrigin(): string {
    const base = environment.apiBaseUrl;
    if (!base) return '';
    if (base.startsWith('/')) return '';
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return '';
    }
  }
}
