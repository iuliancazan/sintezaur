import {
  Body,
  Controller,
  Delete,
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
import type { UserRole } from '@sintezaur/db';
import type { Request } from 'express';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('admin', 'superadmin')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.users.list({
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  async grant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role: UserRole },
    @Req() req: Request,
  ) {
    await this.users.grantRole(
      user.sub,
      isSuperadmin(user),
      id,
      body.role,
      req,
    );
  }

  @Delete(':id/roles/:role')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: string,
    @Req() req: Request,
  ) {
    await this.users.revokeRole(
      user.sub,
      isSuperadmin(user),
      id,
      role as UserRole,
      req,
    );
  }
}

function isSuperadmin(user: AuthenticatedUser): boolean {
  return user.roles.includes('superadmin');
}
