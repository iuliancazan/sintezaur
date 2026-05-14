import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  DATABASE,
  notifications,
  type SintezaurDb,
} from '@sintezaur/db';
import { eq } from 'drizzle-orm';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { PG_NOTIFY_CHANNEL } from '../notifications/notifications.service';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Holds a dedicated long-lived Postgres connection that LISTENs on the
 * `sintezaur_notify` channel and pushes each fresh notification row to
 * the recipient's socket(s) via the gateway.
 *
 * We use a stand-alone `Client` rather than the pooled connection: the
 * pool reclaims idle connections and LISTEN bindings would die with
 * them. The dedicated client reconnects on error.
 */
@Injectable()
export class PgListenService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgListenService.name);
  private client: Client | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly config: ConfigService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.client) {
      await this.client.end().catch(() => undefined);
      this.client = null;
    }
  }

  private async connect(): Promise<void> {
    const client = new Client({
      connectionString: this.config.getOrThrow<string>('DATABASE_URL'),
    });
    client.on('error', (err) => {
      this.logger.warn(`pg listen client error: ${err.message}`);
      this.scheduleReconnect();
    });
    client.on('notification', (msg) => {
      if (msg.channel !== PG_NOTIFY_CHANNEL || !msg.payload) return;
      void this.dispatch(msg.payload);
    });
    try {
      await client.connect();
      await client.query(`LISTEN ${PG_NOTIFY_CHANNEL}`);
      this.client = client;
      this.logger.log(`LISTEN on ${PG_NOTIFY_CHANNEL}`);
    } catch (err) {
      this.logger.warn(
        `pg listen connect failed: ${(err as Error).message}`,
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, 3000);
  }

  /**
   * Hydrate the bare-id NOTIFY payload into the full notification row
   * and emit. Keeps NOTIFY messages tiny (Postgres caps them at 8 KB)
   * while letting the client get the full UI payload.
   */
  private async dispatch(rawPayload: string): Promise<void> {
    try {
      const { id, recipientId } = JSON.parse(rawPayload) as {
        id: string;
        recipientId: string;
      };
      const [row] = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);
      if (!row) return;
      this.gateway.emitToUser(recipientId, 'notification:new', row);
    } catch (err) {
      this.logger.warn(`dispatch failed: ${(err as Error).message}`);
    }
  }
}
