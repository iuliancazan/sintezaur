import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * Inject `req.user` (set by `JwtAuthGuard` → `JwtStrategy.validate`) into
 * a handler param.
 *
 *   @Get('me')
 *   me(@CurrentUser() user: AuthenticatedUser) { … }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return req.user;
  },
);
