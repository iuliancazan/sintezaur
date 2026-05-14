import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@sintezaur/db';

export const ROLES_KEY = 'sintezaur_roles';

/**
 * Allow-list of roles for a handler/controller. Used in tandem with
 * `RolesGuard`.
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @RolesAllowed('admin', 'moderator')
 *   @Patch(':id')
 *   update(...) { … }
 */
export const RolesAllowed = (...roles: UserRole[]) =>
  SetMetadata(ROLES_KEY, roles);
