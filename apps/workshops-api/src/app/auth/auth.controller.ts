import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsNotEmpty, IsString } from 'class-validator';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { AuthService } from './auth.service';
import { SessionGuard, type AuthedRequest } from './session.guard';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  VISITOR_COOKIE,
  type SessionPayload,
} from './session';
import { EventsService } from '../events/events.service';
import { DbService } from '../db/db.service';
import { workshops } from '../../db/schema';

class WorkshopLoginDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly events: EventsService,
    private readonly dbService: DbService,
  ) {}

  private setSession(
    req: Request,
    res: Response,
    payload: SessionPayload,
  ): string {
    const secure = process.env.NODE_ENV === 'production';
    let visitorId = req.cookies?.[VISITOR_COOKIE] as string | undefined;
    if (!visitorId || !/^[0-9a-f-]{36}$/.test(visitorId)) {
      visitorId = randomUUID();
    }
    res.cookie(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: YEAR_MS,
      path: '/',
    });
    res.cookie(SESSION_COOKIE, this.auth.sign(payload), {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: SESSION_MAX_AGE_MS[payload.role],
      path: '/',
    });
    return visitorId;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: WorkshopLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { payload, workshop } = await this.auth.loginWorkshop(
      dto.slug,
      dto.username,
      dto.password,
    );
    const visitorId = this.setSession(req, res, payload);
    this.events.record({
      workshopId: workshop?.id,
      visitorId,
      role: payload.role,
      event: 'login',
    });
    return { role: payload.role, slug: workshop?.slug ?? dto.slug };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() req: AuthedRequest) {
    const session = req.session;
    if (session.role === 'superadmin') {
      return { role: 'superadmin' as const };
    }
    const rows = await this.dbService.db
      .select({
        slug: workshops.slug,
        titleEn: workshops.titleEn,
        titleRo: workshops.titleRo,
        subtitleEn: workshops.subtitleEn,
        subtitleRo: workshops.subtitleRo,
        eventDate: workshops.eventDate,
        venue: workshops.venue,
        published: workshops.published,
        guestSeesSlides: workshops.guestSeesSlides,
      })
      .from(workshops)
      .where(eq(workshops.id, session.workshopId ?? ''));
    const workshop = rows[0];
    return { role: session.role, workshop: workshop ?? null };
  }
}
