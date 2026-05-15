import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DATABASE,
  contentReports,
  forumPosts,
  forumThreads,
  users,
  type ContentReport,
  type ContentReportStatus,
  type ContentReportTarget,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { AuditLogService } from '../common/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForumPostsService } from './forum-posts.service';
import { ForumThreadsService } from './forum-threads.service';

export interface CreateReportInput {
  targetType: ContentReportTarget;
  targetId: string;
  reason: string;
}

export type ResolveResolution =
  | 'resolved_action_taken'
  | 'resolved_no_action'
  | 'duplicate';

export type ResolveAction =
  | 'none'
  | 'hide_post'
  | 'lock_thread'
  | 'delete_thread';

export interface ResolveReportInput {
  resolution: ResolveResolution;
  action?: ResolveAction;
  /** Required when action != 'none' — propagates as mod-action reason. */
  actionReason?: string;
  /** Free-text mod note stored on the report row. */
  resolutionNote?: string;
}

export interface ReportListItem {
  id: string;
  reporterId: string | null;
  reporterUsername: string | null;
  targetType: ContentReportTarget;
  targetId: string;
  reason: string;
  status: ContentReportStatus;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  /** Optional surface-specific snapshot (post title / thread title / etc.). */
  targetSnapshot: { kind: ContentReportTarget; title?: string; slug?: string; bodyExcerpt?: string } | null;
}

const REASON_MIN = 10;
const REASON_MAX = 1000;

const MOD_TARGETS: ContentReportTarget[] = ['forum_post', 'forum_thread'];

/**
 * Polymorphic abuse-report queue per spec §7.10 + §8.2. M5-G wires the
 * Forum surfaces (`forum_post`, `forum_thread`); Bazar / Tezaur surfaces
 * land when those features add report UIs.
 *
 * Resolve flow:
 *   - resolution = 'resolved_action_taken' usually paired with action
 *     (hide_post / lock_thread / delete_thread) — one-click combo from
 *     dashboard so the mod doesn't bounce between pages.
 *   - resolution = 'resolved_no_action' / 'duplicate' just closes the
 *     report; no action on target.
 *   - Reporter receives `forum_report_resolved` either way.
 *   - When action != 'none', the content author also receives the
 *     usual `forum_mod_action_on_my_content` notification.
 */
@Injectable()
export class ContentReportsService {
  private readonly logger = new Logger(ContentReportsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly forumPosts: ForumPostsService,
    private readonly forumThreads: ForumThreadsService,
  ) {}

  /* ============ user-facing ============ */

  async create(
    reporterId: string,
    input: CreateReportInput,
  ): Promise<ContentReport> {
    const reason = (input.reason ?? '').trim();
    if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
      throw new BadRequestException(
        `Motivul trebuie să aibă între ${REASON_MIN} și ${REASON_MAX} caractere.`,
      );
    }
    await this.verifyTarget(input.targetType, input.targetId, reporterId);

    try {
      const [row] = await this.db
        .insert(contentReports)
        .values({
          reporterId,
          targetType: input.targetType,
          targetId: input.targetId,
          reason,
        })
        .returning();
      return row;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('Ai raportat deja acest conținut.');
      }
      throw err;
    }
  }

  /* ============ mod-facing ============ */

  async list(opts: {
    status?: ContentReportStatus;
    targetType?: ContentReportTarget;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: ReportListItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(opts.pageSize ?? 25, 100);
    const conds = [];
    if (opts.status) conds.push(eq(contentReports.status, opts.status));
    if (opts.targetType)
      conds.push(eq(contentReports.targetType, opts.targetType));

    const rows = await this.db
      .select({
        id: contentReports.id,
        reporterId: contentReports.reporterId,
        reporterUsername: users.username,
        targetType: contentReports.targetType,
        targetId: contentReports.targetId,
        reason: contentReports.reason,
        status: contentReports.status,
        resolvedByUserId: contentReports.resolvedByUserId,
        resolutionNote: contentReports.resolutionNote,
        resolvedAt: contentReports.resolvedAt,
        createdAt: contentReports.createdAt,
      })
      .from(contentReports)
      .leftJoin(users, eq(users.id, contentReports.reporterId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(contentReports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentReports)
      .where(conds.length > 0 ? and(...conds) : undefined);

    const snapshots = await Promise.all(
      rows.map((r) => this.snapshot(r.targetType, r.targetId)),
    );

    return {
      items: rows.map((r, i) => ({ ...r, targetSnapshot: snapshots[i] })),
      totalCount: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async resolve(
    modId: string,
    reportId: string,
    input: ResolveReportInput,
    req?: Request,
  ): Promise<ContentReport> {
    const [report] = await this.db
      .select()
      .from(contentReports)
      .where(eq(contentReports.id, reportId))
      .limit(1);
    if (!report) throw new NotFoundException('Raportul nu există.');
    if (report.status !== 'open' && report.status !== 'reviewing') {
      throw new ConflictException('Raportul este deja rezolvat.');
    }

    const action = input.action ?? 'none';
    if (action !== 'none') {
      this.assertActionMatchesTarget(action, report.targetType);
      const reason = (input.actionReason ?? '').trim();
      if (action === 'hide_post' && reason.length < 2) {
        throw new BadRequestException(
          'Motivul ascunderii e necesar (min 2 caractere).',
        );
      }
      await this.applyAction(modId, report, action, reason, req);
    }

    const [updated] = await this.db
      .update(contentReports)
      .set({
        status: input.resolution,
        resolvedByUserId: modId,
        resolutionNote: input.resolutionNote ?? null,
        resolvedAt: new Date(),
      })
      .where(eq(contentReports.id, reportId))
      .returning();

    await this.audit.record({
      actorId: modId,
      action: 'resolve_content_report',
      targetType: 'content_report',
      targetId: reportId,
      details: {
        resolution: input.resolution,
        action,
        reportedTargetType: report.targetType,
        reportedTargetId: report.targetId,
      },
      req,
    });

    if (report.reporterId && report.reporterId !== modId) {
      await this.notifications.post({
        recipientId: report.reporterId,
        actorId: modId,
        kind: 'forum_report_resolved',
        dedupKey: `forum_report_resolved:${report.id}`,
        targetType: 'content_report',
        targetId: report.id,
        payload: {
          resolution: input.resolution,
          targetType: report.targetType,
          targetId: report.targetId,
        },
      });
    }

    return updated;
  }

  /* ============ internals ============ */

  private async verifyTarget(
    type: ContentReportTarget,
    id: string,
    reporterId: string,
  ): Promise<void> {
    if (type === 'forum_post') {
      const post = await this.forumPosts.findById(id).catch(() => null);
      if (!post) throw new NotFoundException('Postarea nu există.');
      if (post.authorId === reporterId) {
        throw new BadRequestException('Nu te poți raporta singur.');
      }
      return;
    }
    if (type === 'forum_thread') {
      const t = await this.forumThreads.findById(id).catch(() => null);
      if (!t) throw new NotFoundException('Thread-ul nu există.');
      if (t.authorId === reporterId) {
        throw new BadRequestException('Nu te poți raporta singur.');
      }
      return;
    }
    // Other target types are reportable via their own controllers (Bazar etc).
    throw new BadRequestException(
      `Tip de raport "${type}" nu e suportat de surface-ul forum.`,
    );
  }

  private async snapshot(
    type: ContentReportTarget,
    id: string,
  ): Promise<ReportListItem['targetSnapshot']> {
    if (type === 'forum_post') {
      const [row] = await this.db
        .select({
          bodyHtml: forumPosts.bodyHtml,
          threadSlug: forumThreads.slug,
          threadTitle: forumThreads.title,
        })
        .from(forumPosts)
        .innerJoin(forumThreads, eq(forumThreads.id, forumPosts.threadId))
        .where(eq(forumPosts.id, id))
        .limit(1);
      if (!row) return { kind: type };
      const excerpt = (row.bodyHtml ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 240);
      return {
        kind: type,
        title: row.threadTitle,
        slug: row.threadSlug,
        bodyExcerpt: excerpt,
      };
    }
    if (type === 'forum_thread') {
      const [row] = await this.db
        .select({ slug: forumThreads.slug, title: forumThreads.title })
        .from(forumThreads)
        .where(eq(forumThreads.id, id))
        .limit(1);
      if (!row) return { kind: type };
      return { kind: type, title: row.title, slug: row.slug };
    }
    return { kind: type };
  }

  private assertActionMatchesTarget(
    action: ResolveAction,
    target: ContentReportTarget,
  ): void {
    if (action === 'hide_post' && target !== 'forum_post') {
      throw new BadRequestException('hide_post se aplică doar la forum_post.');
    }
    if (
      (action === 'lock_thread' || action === 'delete_thread') &&
      target !== 'forum_thread'
    ) {
      throw new BadRequestException(
        `${action} se aplică doar la forum_thread.`,
      );
    }
    if (!MOD_TARGETS.includes(target)) {
      throw new ForbiddenException(
        'Această surface nu acceptă acțiuni mod combinate.',
      );
    }
  }

  private async applyAction(
    modId: string,
    report: ContentReport,
    action: Exclude<ResolveAction, 'none'>,
    reason: string,
    req?: Request,
  ): Promise<void> {
    if (action === 'hide_post') {
      await this.forumPosts.hide(modId, report.targetId, reason);
      const post = await this.forumPosts.findById(report.targetId);
      await this.audit.record({
        actorId: modId,
        action: 'hide_post',
        targetType: 'forum_post',
        targetId: report.targetId,
        details: { reason, viaReportId: report.id },
        req,
      });
      if (post.authorId && post.authorId !== modId) {
        await this.notifications.post({
          recipientId: post.authorId,
          actorId: modId,
          kind: 'forum_mod_action_on_my_content',
          dedupKey: `forum_mod:post_hide:${report.targetId}`,
          targetType: 'forum_post',
          targetId: report.targetId,
          payload: { action: 'hide_post', reason, threadId: post.threadId },
        });
      }
      return;
    }
    if (action === 'lock_thread') {
      await this.forumThreads.lock(report.targetId, true);
      await this.audit.record({
        actorId: modId,
        action: 'lock_thread',
        targetType: 'forum_thread',
        targetId: report.targetId,
        details: { viaReportId: report.id, reason },
        req,
      });
      return;
    }
    if (action === 'delete_thread') {
      const t = await this.forumThreads.findById(report.targetId);
      await this.forumThreads.modDelete(report.targetId);
      await this.audit.record({
        actorId: modId,
        action: 'delete_thread',
        targetType: 'forum_thread',
        targetId: report.targetId,
        details: { title: t.title, reason, viaReportId: report.id },
        req,
      });
      if (t.authorId && t.authorId !== modId) {
        await this.notifications.post({
          recipientId: t.authorId,
          actorId: modId,
          kind: 'forum_mod_action_on_my_content',
          dedupKey: `forum_mod:thread_delete:${report.targetId}`,
          targetType: 'forum_thread',
          targetId: report.targetId,
          payload: { action: 'delete_thread', threadTitle: t.title, reason },
        });
      }
    }
  }
}
