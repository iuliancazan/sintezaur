import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ACCESS_COOKIE_NAME,
  type AccessTokenPayload,
} from '@sintezaur/auth';
import { Server, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';

/**
 * Socket.io gateway. Each socket authenticates via the
 * `sintezaur_access` cookie sent on the WebSocket handshake (the
 * browser includes cookies on same-origin / withCredentials upgrades).
 *
 * Rooms:
 *  - `user:<userId>` — every socket auto-joins; used for direct
 *    notification fan-out + chat broadcasts addressed to a user.
 *  - `thread:<threadId>` — client joins explicitly via the
 *    `chat:join` event after authorizing on the listing thread.
 *
 * Cross-process delivery uses Postgres LISTEN/NOTIFY (see
 * PgListenService) so multiple API replicas stay in sync without a
 * Redis adapter.
 */
@Injectable()
export class RealtimeGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeGateway.name);
  private server: Server | null = null;
  private readonly corsOrigins: string[];

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.corsOrigins = (this.config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  attach(http: HttpServer): void {
    const io = new Server(http, {
      path: '/api/socket.io',
      cors: {
        origin: this.corsOrigins.length > 0 ? this.corsOrigins : true,
        credentials: true,
      },
    });
    io.use((socket, next) => {
      try {
        const userId = this.authenticate(socket);
        if (!userId) return next(new Error('UNAUTHORIZED'));
        socket.data.userId = userId;
        next();
      } catch (err) {
        next(err as Error);
      }
    });
    io.on('connection', (socket) => {
      const userId = socket.data.userId as string;
      socket.join(`user:${userId}`);
      this.logger.debug(`socket ${socket.id} authed as ${userId}`);

      socket.on('chat:join', (threadId: unknown) => {
        if (typeof threadId === 'string')
          socket.join(`thread:${threadId}`);
      });
      socket.on('chat:leave', (threadId: unknown) => {
        if (typeof threadId === 'string')
          socket.leave(`thread:${threadId}`);
      });
    });
    this.server = io;
  }

  onModuleInit() {
    // attach() is called from main.ts after the HTTP server exists.
  }

  async onModuleDestroy() {
    if (this.server) await this.server.close();
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToThread(threadId: string, event: string, payload: unknown): void {
    this.server?.to(`thread:${threadId}`).emit(event, payload);
  }

  private authenticate(socket: Socket): string | null {
    const cookieHeader = socket.handshake.headers.cookie ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [name, ...rest] = c.trim().split('=');
        return [name, decodeURIComponent(rest.join('='))];
      }),
    );
    const token =
      cookies[ACCESS_COOKIE_NAME] ??
      (typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : null);
    if (!token) return null;
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      return payload.sub;
    } catch {
      return null;
    }
  }
}
