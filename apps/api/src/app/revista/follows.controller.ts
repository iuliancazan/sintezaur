import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { RevistaFollowsService } from './follows.service';

/**
 * Per-user follow toggle for Revista categories (spec §7.5).
 * Auth required; any logged-in user can follow.
 */
@Controller('me/revista/follows')
@UseGuards(JwtAuthGuard)
export class RevistaFollowsController {
  constructor(private readonly follows: RevistaFollowsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.follows.listForUser(user.sub);
  }

  @Post(':category')
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('category') category: string,
  ) {
    if (!this.follows.isValidCategory(category)) {
      throw new BadRequestException(`unknown revista category: ${category}`);
    }
    await this.follows.follow(user.sub, category);
  }

  @Delete(':category')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('category') category: string,
  ) {
    if (!this.follows.isValidCategory(category)) {
      throw new BadRequestException(`unknown revista category: ${category}`);
    }
    await this.follows.unfollow(user.sub, category);
  }
}
