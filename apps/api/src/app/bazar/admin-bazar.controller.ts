import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type { Request } from 'express';
import { ListingsService } from './listings.service';

@Controller('admin/bazar')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('moderator', 'admin', 'superadmin')
export class AdminBazarController {
  constructor(private readonly listings: ListingsService) {}

  @Post('listings/:id/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async modRemove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: Request,
  ) {
    await this.listings.modRemove(user.sub, id, reason ?? '', req);
  }
}
