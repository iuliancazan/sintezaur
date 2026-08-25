import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { RequireRoles } from '../auth/roles';
import type { AuthedRequest } from '../auth/session.guard';
import { VISITOR_COOKIE } from '../auth/session';
import { EventsService } from './events.service';

class RecordEventDto {
  @IsIn(['view', 'download'])
  event!: 'view' | 'download';

  @IsString()
  @IsOptional()
  document?: string;

  @IsIn(['en', 'ro'])
  @IsOptional()
  lang?: 'en' | 'ro';
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @HttpCode(204)
  @RequireRoles('guest', 'admin', 'superadmin')
  record(@Body() dto: RecordEventDto, @Req() req: AuthedRequest) {
    this.events.record({
      workshopId: req.session.workshopId,
      visitorId: req.cookies?.[VISITOR_COOKIE],
      role: req.session.role,
      event: dto.event,
      document: dto.document,
      lang: dto.lang,
    });
  }
}
