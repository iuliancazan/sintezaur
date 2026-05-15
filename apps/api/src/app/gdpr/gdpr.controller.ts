import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Header,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { GdprService } from './gdpr.service';

/**
 * GDPR / RGPD endpoints per spec §11 foundation. Both auth-only.
 *
 *   GET    /auth/me/export   — JSON dump of user's data (Article 15)
 *   DELETE /auth/me/account  — soft-delete + PII redaction (Article 17)
 */
@Controller('auth/me')
@UseGuards(JwtAuthGuard)
export class GdprController {
  constructor(
    private readonly gdpr: GdprService,
    private readonly config: ConfigService,
  ) {}

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="sintezaur-export.json"',
  )
  async export(@CurrentUser() user: AuthenticatedUser): Promise<unknown> {
    return this.gdpr.exportForUser(user.sub);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.gdpr.deleteAccount(user.sub);
    // Drop cookies — token rotation revokes are already done inside
    // the service via cascade-style delete on refresh_tokens. Clear
    // the browser side too so the SPA goes anonymous immediately.
    clearAuthCookies(res, this.config);
    res.clearCookie(REFRESH_COOKIE_NAME);
  }
}
