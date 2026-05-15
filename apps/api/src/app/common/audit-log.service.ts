import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE,
  auditLog,
  users,
  type AuditLogAction,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
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
  | 'resolve_content_report'
  // Auth — role management
  | 'promote_user'
  | 'demote_user'
  // Forum mod (M5-G)
  | 'hide_post'
  | 'unhide_post'
  | 'lock_thread'
  | 'unlock_thread'
  | 'delete_thread'
  | 'pin_thread'
  | 'unpin_thread'
  | 'first_post_approve'
  | 'first_post_reject'
  // Currency (M6-E3)
  | 'update_currency_rate';

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

  async list(opts: {
    action?: AuditLogAction;
    targetType?: string;
    actorId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: Array<{
      id: string;
      actorId: string | null;
      actorUsername: string | null;
      action: AuditLogAction;
      targetType: string | null;
      targetId: string | null;
      details: Record<string, unknown>;
      ipAddress: string | null;
      createdAt: Date;
    }>;
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(opts.pageSize ?? 50, 200);
    const conds = [];
    if (opts.action) conds.push(eq(auditLog.action, opts.action));
    if (opts.targetType) conds.push(eq(auditLog.targetType, opts.targetType));
    if (opts.actorId) conds.push(eq(auditLog.actorId, opts.actorId));
    if (opts.from) conds.push(gte(auditLog.createdAt, opts.from));
    if (opts.to) conds.push(lte(auditLog.createdAt, opts.to));
    const where = conds.length > 0 ? and(...conds) : undefined;

    const rows = await this.db
      .select({
        id: auditLog.id,
        actorId: auditLog.actorId,
        actorUsername: users.username,
        action: auditLog.action,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        details: auditLog.details,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where);

    return {
      items: rows.map((r) => ({
        ...r,
        details: (r.details ?? {}) as Record<string, unknown>,
      })),
      totalCount: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  private ipFromReq(req: Request | undefined): string | null {
    if (!req) return null;
    const xff = req.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() ?? null;
    return req.ip ?? null;
  }
}
