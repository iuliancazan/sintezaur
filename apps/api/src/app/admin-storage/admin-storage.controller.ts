import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  RolesAllowed,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AdminStorageService } from './admin-storage.service';

class UpdateLimitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024 * 1024) // hard ceiling 10 GiB — sanity guard
  maxBytes!: number;
}

class FoldersQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['tezaur', 'bazar', 'revista', 'forum', 'avatar'])
  module?: 'tezaur' | 'bazar' | 'revista' | 'forum' | 'avatar';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

class TrendsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['day', 'week', 'month'])
  granularity?: 'day' | 'week' | 'month';

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

class TopUsersQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * `/admin/storage/*` — admin-only read endpoints + the single
 * `PUT /admin/storage/limits/:id` editor + `POST /admin/storage/reconcile`
 * trigger. Every endpoint hits Postgres only (never R2 directly), so
 * the dashboard stays cheap and snappy.
 */
@Controller('admin/storage')
@RolesAllowed('admin', 'superadmin')
export class AdminStorageController {
  constructor(private readonly admin: AdminStorageService) {}

  @Get('limits')
  listLimits() {
    return this.admin.listLimits();
  }

  @Put('limits/:id')
  updateLimit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLimitDto,
  ) {
    return this.admin.updateLimit(id, dto.maxBytes, user.sub);
  }

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('folders')
  folders(@Query() q: FoldersQueryDto) {
    return this.admin.folders({ module: q.module, limit: q.limit });
  }

  @Get('trends')
  trends(@Query() q: TrendsQueryDto) {
    return this.admin.trends({
      granularity: q.granularity ?? 'day',
      from: q.from,
      to: q.to,
    });
  }

  @Get('users')
  users(@Query() q: TopUsersQueryDto) {
    return this.admin.topUsers({
      from: q.from,
      to: q.to,
      limit: q.limit,
    });
  }

  @Post('reconcile')
  reconcile() {
    return this.admin.triggerReconcile();
  }

  @Get('users/:id/quota')
  userQuota(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getUserQuota(id);
  }
}
