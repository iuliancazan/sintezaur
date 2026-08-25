import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionGuard, type AuthedRequest } from './session.guard';
import type { SessionRole } from './session';

const ROLES_KEY = 'ws_roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<SessionRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed || allowed.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.session || !allowed.includes(req.session.role)) {
      throw new ForbiddenException('forbidden_role');
    }
    return true;
  }
}

/** Session + role check in one decorator: @RequireRoles('admin', 'superadmin') */
export function RequireRoles(...roles: SessionRole[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(SessionGuard, RolesGuard),
  );
}
