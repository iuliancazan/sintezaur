import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailMessage } from './email-templates';

/**
 * Thin Nodemailer wrapper used for transactional auth emails. SMTP
 * config is Brevo by default (host=smtp-relay.brevo.com), but any
 * SMTP-compatible relay works — only the SMTP_* env vars matter.
 *
 * The transporter is built lazily on first send so the API can boot
 * cleanly even if SMTP creds are missing in dev — the actual send
 * call is the one that fails loud, with a clear "set SMTP_USER /
 * SMTP_PASS in .env" hint.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number.parseInt(
      this.config.get<string>('SMTP_PORT') ?? '587',
      10,
    );
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      throw new Error(
        'SMTP_HOST / SMTP_USER / SMTP_PASS not set. Configure your Brevo (or any SMTP) credentials in .env before sending mail.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      // STARTTLS on 587 (Brevo standard); SMTPS on 465.
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  async send(to: string, message: EmailMessage): Promise<void> {
    const fromName = this.config.get<string>('SMTP_FROM_NAME') ?? 'Sintezaur';
    const fromEmail =
      this.config.get<string>('SMTP_FROM_EMAIL') ?? 'noreply@sintezaur.ro';
    const from = `${fromName} <${fromEmail}>`;

    const info = await this.getTransporter().sendMail({
      from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    this.logger.log(
      `mail sent to=${to} subject="${message.subject}" messageId=${info.messageId}`,
    );
  }
}
