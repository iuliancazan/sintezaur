import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATABASE,
  contactMessages,
  type ContactMessage,
  type ContactMessageCategory,
  type ContactMessageStatus,
  type SintezaurDb,
} from '@sintezaur/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { EmailService } from '../auth/email.service';
import type {
  CreateContactMessageDto,
  ListContactMessagesQueryDto,
} from './legal.dto';

const MIN_FORM_MS = 3_000;
const MAX_FORM_MS = 6 * 60 * 60 * 1000;

const CATEGORY_LABELS: Record<ContactMessageCategory, string> = {
  cumparator: 'Cumpărător',
  vanzator: 'Vânzător',
  editor: 'Editor',
  juridic: 'Juridic',
  altele: 'Altele',
};

/**
 * Contact form per M6-A: anonymous submit + admin queue. Anti-spam is
 * minimal (honeypot + time-on-form gate); the public endpoint also
 * sits behind the global ThrottlerGuard (60/min/IP) — sufficient for
 * a low-volume form. The submission is mirrored as an SMTP email to
 * the operator address so a fresh report still pings even if no admin
 * opens the dashboard for a few days.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async submit(
    dto: CreateContactMessageDto,
    req: Request,
    userId: string | null,
  ): Promise<{ ok: true }> {
    if (dto.hp && dto.hp.length > 0) {
      this.logger.warn(`contact honeypot tripped from ${ipOf(req)}`);
      throw new BadRequestException('Cerere invalidă.');
    }
    if (dto.formStartedAt && dto.formStartedAt > 0) {
      const elapsed = Date.now() - dto.formStartedAt;
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

    const [row] = await this.db
      .insert(contactMessages)
      .values({
        userId: userId ?? null,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        category: dto.category,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        ipAddress: ipOf(req),
        userAgent: req.get('user-agent') ?? null,
      })
      .returning({ id: contactMessages.id });

    // Fire-and-forget operator notification — log on failure but don't
    // fail the submit (the row is persisted, admin will see it on the
    // dashboard queue regardless).
    this.notifyOperator(row.id, dto).catch((err) => {
      this.logger.error(
        `contact email notification failed for ${row.id}: ${
          (err as Error).message
        }`,
      );
    });

    return { ok: true };
  }

  async list(query: ListContactMessagesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const offset = (page - 1) * pageSize;

    const conds = [];
    if (query.status) conds.push(eq(contactMessages.status, query.status));
    if (query.category)
      conds.push(eq(contactMessages.category, query.category));
    const where = conds.length > 0 ? and(...conds) : undefined;

    const rows: ContactMessage[] = await this.db
      .select()
      .from(contactMessages)
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactMessages)
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
      status: ContactMessageStatus;
      readAt: Date | null;
      readByUserId: string | null;
    }> = { status };
    if (status === 'read' || status === 'archived') {
      patch.readAt = new Date();
      patch.readByUserId = readerUserId;
    }
    const [row] = await this.db
      .update(contactMessages)
      .set(patch)
      .where(eq(contactMessages.id, id))
      .returning({ id: contactMessages.id, status: contactMessages.status });
    if (!row) {
      throw new NotFoundException(`contact message ${id} not found`);
    }
    return row;
  }

  async unreadCount(): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactMessages)
      .where(eq(contactMessages.status, 'new'));
    return count;
  }

  private async notifyOperator(
    id: string,
    dto: CreateContactMessageDto,
  ): Promise<void> {
    const operatorEmail = this.config.get<string>('CONTACT_OPERATOR_EMAIL');
    if (!operatorEmail) {
      this.logger.warn(
        'CONTACT_OPERATOR_EMAIL not set — skipping operator notification.',
      );
      return;
    }
    const categoryLabel = CATEGORY_LABELS[dto.category] ?? dto.category;
    const subject = `[Sintezaur · ${categoryLabel}] ${dto.subject}`;
    const text =
      `Mesaj nou pe formularul Contact (#${id}).\n\n` +
      `De la:     ${dto.name} <${dto.email}>\n` +
      `Categorie: ${categoryLabel}\n` +
      `Subiect:   ${dto.subject}\n\n` +
      `${dto.body}\n\n` +
      `---\n` +
      `Vezi coada completă în dashboard: /contact-messages\n`;
    const html =
      `<p>Mesaj nou pe formularul Contact (#${id}).</p>` +
      `<p><strong>De la:</strong> ${escapeHtml(dto.name)} ` +
      `&lt;${escapeHtml(dto.email)}&gt;<br>` +
      `<strong>Categorie:</strong> ${escapeHtml(categoryLabel)}<br>` +
      `<strong>Subiect:</strong> ${escapeHtml(dto.subject)}</p>` +
      `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(
        dto.body,
      )}</pre>` +
      `<hr><p style="font-size:12px;color:#777">Vezi coada în dashboard: /contact-messages</p>`;

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
