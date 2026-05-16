import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type { Request } from 'express';
import { ContactService } from './contact.service';
import {
  CreateContactMessageDto,
  ListContactMessagesQueryDto,
  UpdateContactMessageDto,
  UpdateLegalPageDto,
} from './legal.dto';
import { LegalPagesService } from './legal-pages.service';

/**
 * Legal pages — public read + admin write. Static slugs (termeni,
 * confidentialitate, cookies, regulament-forum, despre, contact).
 *
 *   GET    /legal              — slug + title + updated_at (footer/sitemap)
 *   GET    /legal/:slug        — full body for public render
 *   GET    /admin/legal        — list with body for dashboard table
 *   PUT    /admin/legal/:slug  — upsert body / title / meta_description
 */
@Controller()
export class LegalPagesController {
  constructor(private readonly pages: LegalPagesService) {}

  @Get('legal')
  @Public()
  listSummary() {
    return this.pages.listSummary();
  }

  @Get('legal/:slug')
  @Public()
  getOne(
    @Param('slug') slug: string,
    @Query('locale') localeParam?: string,
  ) {
    const lang: 'ro' | 'en' = localeParam === 'en' ? 'en' : 'ro';
    return this.pages.getBySlug(slug, lang);
  }

  @Get('admin/legal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  listAdmin() {
    return this.pages.listAdmin();
  }

  @Put('admin/legal/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: UpdateLegalPageDto,
  ) {
    return this.pages.update(slug, dto, user.sub);
  }
}

/**
 * Contact form — public POST + admin queue. POST sits behind a tight
 * throttle (5/min/IP) on top of the global 60/min limit; honeypot +
 * time-on-form checks live inside the service.
 *
 *   POST   /contact                       — anonymous + auth (both OK)
 *   GET    /admin/contact-messages        — paged queue
 *   PATCH  /admin/contact-messages/:id    — mark read | archived
 *   GET    /admin/contact-messages/unread — count for sidebar badge
 */
@Controller()
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post('contact')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async submit(
    @Body() dto: CreateContactMessageDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<void> {
    const userId = req.user?.sub ?? null;
    await this.contact.submit(dto, req, userId);
  }

  @Get('admin/contact-messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  list(@Query() query: ListContactMessagesQueryDto) {
    return this.contact.list(query);
  }

  @Get('admin/contact-messages/unread')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  async unread() {
    return { count: await this.contact.unreadCount() };
  }

  @Patch('admin/contact-messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesAllowed('admin', 'superadmin')
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactMessageDto,
  ) {
    return this.contact.setStatus(id, dto.status, user.sub);
  }
}
