import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATABASE,
  userFeedback,
  users,
  type SintezaurDb,
  type UserFeedback,
  type UserFeedbackKind,
  type UserFeedbackStatus,
} from '@sintezaur/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { EmailService } from '../auth/email.service';
import type {
  CreateFeedbackDto,
  ListFeedbackQueryDto,
} from './feedback.dto';

const KIND_LABELS: Record<UserFeedbackKind, string> = {
  bug: 'Bug',
  sugestie: 'Sugestie',
  altele: 'Altele',
};

/**
 * In-app feedback (M6-D). Authenticated-only submit — we always know
 * who reported it, which short-circuits the "anonymous spam" problem
 * the contact form has. Mirror to operator email if configured (same
 * pattern as `contact.service.ts`).
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async submit(
    userId: string,
    dto: CreateFeedbackDto,
    req: Request,
  ): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(userFeedback)
      .values({
        userId,
        kind: dto.kind,
        body: dto.body.trim(),
        pageUrl: dto.pageUrl?.slice(0, 2000) ?? null,
        userAgent: req.get('user-agent') ?? null,
        ipAddress: ipOf(req),
      })
      .returning({ id: userFeedback.id });

    this.notifyOperator(row.id, userId, dto).catch((err) => {
      this.logger.error(
        `feedback email failed for ${row.id}: ${(err as Error).message}`,
      );
    });

    return { id: row.id };
  }

  async list(query: ListFeedbackQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const offset = (page - 1) * pageSize;

    const conds = [];
    if (query.status) conds.push(eq(userFeedback.status, query.status));
    if (query.kind) conds.push(eq(userFeedback.kind, query.kind));
    const where = conds.length > 0 ? and(...conds) : undefined;

    const rows = await this.db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        kind: userFeedback.kind,
        body: userFeedback.body,
        pageUrl: userFeedback.pageUrl,
        userAgent: userFeedback.userAgent,
        ipAddress: userFeedback.ipAddress,
        status: userFeedback.status,
        readByUserId: userFeedback.readByUserId,
        readAt: userFeedback.readAt,
        createdAt: userFeedback.createdAt,
        authorUsername: users.username,
        authorEmail: users.email,
        authorFullName: users.fullName,
      })
      .from(userFeedback)
      .leftJoin(users, eq(users.id, userFeedback.userId))
      .where(where)
      .orderBy(desc(userFeedback.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFeedback)
      .where(where);

    return {
      items: rows,
      page,
      pageSize,
      totalCount: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async setStatus(
    id: string,
    status: 'read' | 'archived',
    readerUserId: string,
  ) {
    const patch: Partial<{
      status: UserFeedbackStatus;
      readAt: Date | null;
      readByUserId: string | null;
    }> = { status };
    if (status === 'read' || status === 'archived') {
      patch.readAt = new Date();
      patch.readByUserId = readerUserId;
    }
    const [row] = await this.db
      .update(userFeedback)
      .set(patch)
      .where(eq(userFeedback.id, id))
      .returning({ id: userFeedback.id, status: userFeedback.status });
    if (!row) {
      throw new NotFoundException(`feedback ${id} not found`);
    }
    return row;
  }

  async unreadCount(): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFeedback)
      .where(eq(userFeedback.status, 'new'));
    return count;
  }

  private async notifyOperator(
    feedbackId: string,
    userId: string,
    dto: CreateFeedbackDto,
  ): Promise<void> {
    const operatorEmail = this.config.get<string>('CONTACT_OPERATOR_EMAIL');
    if (!operatorEmail) return;

    const [user] = await this.db
      .select({
        username: users.username,
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const who = user
      ? `${user.fullName || user.username} <${user.email}>`
      : `user ${userId}`;

    const kindLabel = KIND_LABELS[dto.kind] ?? dto.kind;
    const subject = `[Sintezaur · feedback · ${kindLabel}] #${feedbackId.slice(0, 8)}`;
    const text =
      `Feedback nou (#${feedbackId}).\n\n` +
      `De la:     ${who}\n` +
      `Categorie: ${kindLabel}\n` +
      `Pagină:    ${dto.pageUrl ?? '—'}\n\n` +
      `${dto.body}\n\n` +
      `---\n` +
      `Vezi coada în dashboard: /feedback\n`;
    const html =
      `<p>Feedback nou (#${feedbackId}).</p>` +
      `<p><strong>De la:</strong> ${escapeHtml(who)}<br>` +
      `<strong>Categorie:</strong> ${escapeHtml(kindLabel)}<br>` +
      `<strong>Pagină:</strong> ${escapeHtml(dto.pageUrl ?? '—')}</p>` +
      `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(
        dto.body,
      )}</pre>` +
      `<hr><p style="font-size:12px;color:#777">Vezi coada în dashboard: /feedback</p>`;

    await this.email.send(operatorEmail, { subject, html, text });
  }
}

function ipOf(req: Request): string {
  const xff = req.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';
  return req.ip ?? 'unknown';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type FeedbackRow = Awaited<
  ReturnType<FeedbackService['list']>
>['items'][number];
