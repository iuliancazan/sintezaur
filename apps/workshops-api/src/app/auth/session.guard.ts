import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, type SessionPayload } from './session';

export interface AuthedRequest extends Request {
  session: SessionPayload;
}

/** Requires a valid ws_session cookie; attaches the payload to req.session. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = req.cookies?.[SESSION_COOKIE];
    const payload = token ? this.auth.verify(token) : null;
    if (!payload) {
      throw new UnauthorizedException('no_session');
    }
    req.session = payload;
    return true;
  }
}
