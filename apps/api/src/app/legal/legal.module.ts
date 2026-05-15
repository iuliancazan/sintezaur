import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  ContactController,
  LegalPagesController,
} from './legal.controller';
import { ContactService } from './contact.service';
import { LegalPagesService } from './legal-pages.service';

/**
 * Legal (M6-A) — static legal/info pages + contact form.
 *
 * Imports AuthModule for EmailService (operator notification on new
 * contact submissions). Anti-spam is inline (honeypot + time-on-form)
 * in ContactService rather than reusing forum's AntiSpamService — the
 * shared rate-limit bucket isn't appropriate here (contact is a much
 * rarer flow, and the global ThrottlerGuard already covers per-IP
 * abuse).
 */
@Module({
  imports: [AuthModule],
  controllers: [LegalPagesController, ContactController],
  providers: [LegalPagesService, ContactService],
  exports: [LegalPagesService],
})
export class LegalModule {}
