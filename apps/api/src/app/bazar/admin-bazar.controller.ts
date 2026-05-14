import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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

  @Get('listings')
  list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('sellerUsername') sellerUsername?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.listings.listForAdmin({
      status,
      q,
      sellerUsername,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

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

  @Post('listings/:id/unremove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async modUnremove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.listings.modUnremove(user.sub, id, req);
  }
}
