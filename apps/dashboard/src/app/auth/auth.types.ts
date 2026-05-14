export type UserRole =
  | 'user'
  | 'contributor'
  | 'curator'
  | 'editor'
  | 'moderator'
  | 'admin'
  | 'superadmin';
export type TrustLevel =
  | 'unverified'
  | 'email_verified'
  | 'phone_verified'
  | 'id_verified'
  | 'trusted_seller';
export type DisplayCurrency = 'ron' | 'eur';
export type SubscriptionTier = 'free' | 'premium';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  /** Multi-valued per spec §7.2. May include any combination. */
  roles: UserRole[];
  trustLevel: TrustLevel;
  displayCurrency: DisplayCurrency;
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

/** Roles allowed to enter the dashboard per spec §7.2. Everyone else
 *  (contributor, curator, editor, moderator) does their privileged
 *  work inline on the public site, not here. */
export const DASHBOARD_ROLES: ReadonlyArray<UserRole> = ['admin', 'superadmin'];

/** Convenience: does this user hold at least one of the requested roles? */
export function hasAnyRole(
  user: Pick<AuthUser, 'roles'> | null | undefined,
  allowed: ReadonlyArray<UserRole>,
): boolean {
  if (!user) return false;
  return allowed.some((r) => user.roles.includes(r));
}
