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
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { BlocksService } from './blocks.service';

export class CreateBlockDto {
  @IsOptional()
  @IsUUID()
  blockedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  blockedUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/**
 * `/me/blocks` — current user's block list management. POST accepts
 * either UUID (id-based from chat / listing) or username (handle-based
 * from /autor/:username). DELETE always by user id.
 */
@Controller('me/blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.blocks.list(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlockDto,
  ) {
    return this.blocks.create(user.sub, dto);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.blocks.remove(user.sub, userId);
  }
}
