import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';

interface SpamFields {
  hp?: string | null;
  formStartedAt?: number | null;
}

interface Bucket {
  count: number;
  windowStart: number;
}

const MIN_FORM_MS = 3_000;
const MAX_FORM_MS = 6 * 60 * 60 * 1000;
const PER_MINUTE_LIMIT = 5;
const PER_HOUR_LIMIT = 30;
const BUCKET_TTL_MS = 60 * 60 * 1000;

/**
 * Anti-spam stack per spec §8.4 (M5-H — honeypot + time-on-form +
 * IP rate-limit; disposable-email blocklist deferred). Fail-closed:
 * any check that doesn't pass throws `BadRequestException` and the
 * write is rejected before it reaches the service layer.
 *
 * In-memory token buckets are sufficient for the single-instance MVP
 * API. When we go multi-instance, swap for Redis or pg-based limiter.
 */
@Injectable()
export class AntiSpamService {
  private readonly logger = new Logger(AntiSpamService.name);
  private readonly minute = new Map<string, Bucket>();
  private readonly hour = new Map<string, Bucket>();
  private lastSweep = Date.now();

  /**
   * Run before any user-content write (thread create / reply / report).
   * Order: honeypot → time-on-form → rate limit. Returns silently on
   * pass; throws on failure.
   */
  enforce(req: Request, fields: SpamFields = {}): void {
    if (fields.hp && fields.hp.length > 0) {
      this.logger.warn(`honeypot tripped from ${this.ipOf(req)}`);
      throw new BadRequestException('Cerere invalidă.');
    }

    if (fields.formStartedAt && fields.formStartedAt > 0) {
      const elapsed = Date.now() - fields.formStartedAt;
      if (elapsed < MIN_FORM_MS) {
        throw new BadRequestException(
          'Trimitere prea rapidă. Mai încearcă în câteva secunde.',
        );
      }
      if (elapsed > MAX_FORM_MS) {
        throw new BadRequestException(
          'Sesiune expirată. Reîncarcă pagina și reîncearcă.',
        );
      }
    }

    this.checkRate(this.ipOf(req));
  }

  private checkRate(ip: string): void {
    this.maybeSweep();
    const now = Date.now();

    const m = this.minute.get(ip) ?? { count: 0, windowStart: now };
    if (now - m.windowStart >= 60_000) {
      m.count = 0;
      m.windowStart = now;
    }
    m.count += 1;
    this.minute.set(ip, m);

    const h = this.hour.get(ip) ?? { count: 0, windowStart: now };
    if (now - h.windowStart >= 3_600_000) {
      h.count = 0;
      h.windowStart = now;
    }
    h.count += 1;
    this.hour.set(ip, h);

    if (m.count > PER_MINUTE_LIMIT || h.count > PER_HOUR_LIMIT) {
      throw new BadRequestException(
        'Prea multe acțiuni. Încearcă din nou peste câteva minute.',
      );
    }
  }

  private maybeSweep(): void {
    const now = Date.now();
    if (now - this.lastSweep < 5 * 60 * 1000) return;
    this.lastSweep = now;
    for (const [k, b] of this.minute) {
      if (now - b.windowStart > BUCKET_TTL_MS) this.minute.delete(k);
    }
    for (const [k, b] of this.hour) {
      if (now - b.windowStart > BUCKET_TTL_MS) this.hour.delete(k);
    }
  }

  private ipOf(req: Request): string {
    const xff = req.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';
    return req.ip ?? 'unknown';
  }
}
