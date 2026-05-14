import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type SintezaurDb, auditLog } from '@sintezaur/db';
import type { Request } from 'express';

/**
 * App-side audit action vocabulary. Mirrors the values in the
 * `audit_log_action` Drizzle enum, narrowed to what's currently wired.
 * New actions land both here and in the DB enum (via a migration).
 */
export type AuditAction =
  // Tezaur
  | 'create_gear'
  | 'edit_gear'
  | 'soft_delete_gear'
  | 'restore_gear'
  | 'create_gear_family'
  | 'edit_gear_family'
  | 'set_canonical_thread'
  | 'hide_gear_review'
  // Bazar — listing moderation actions
  | 'remove_listing'
  | 'ban_user'
  | 'unban_user'
  | 'hide_transaction_review'
  | 'resolve_content_report';

interface RecordOptions {
  actorId: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  req?: Request;
}

/**
 * Append-only audit log for privileged admin/editor actions per spec §7.10.
 *
 * Never UPDATE / DELETE from app code — rows are permanent. The actor
 * pointer can null out on user deletion (legitimate-interest retention).
 */
@Injectable()
export class AuditLogService {
  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
  ) {}

  async record(opts: RecordOptions): Promise<void> {
    await this.db.insert(auditLog).values({
      actorId: opts.actorId,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      details: (opts.details ?? {}) as Record<string, unknown>,
      ipAddress: this.ipFromReq(opts.req),
      userAgent: opts.req?.get('user-agent') ?? null,
    });
  }

  private ipFromReq(req: Request | undefined): string | null {
    if (!req) return null;
    const xff = req.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() ?? null;
    return req.ip ?? null;
  }
}
