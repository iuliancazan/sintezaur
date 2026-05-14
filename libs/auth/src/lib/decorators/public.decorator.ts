import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'sintezaur_is_public';

/**
 * Mark a handler (or controller) as public — JwtAuthGuard short-
 * circuits and lets the request through even when applied globally.
 *
 *   @Public()
 *   @Get('healthz')
 *   health() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
