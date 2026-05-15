/**
 * Mirrors `AuthUserPublic` on the API. Kept here as a literal type
 * (not imported from the backend) so the site bundle stays free of
 * server-only deps. When @sintezaur/shared lands DTOs (M2), this can
 * be re-exported from there.
 */
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
  /** Multi-valued per spec §7.2. */
  roles: UserRole[];
  trustLevel: TrustLevel;
  displayCurrency: DisplayCurrency;
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  websiteUrl: string | null;
  socialInstagram: string | null;
  socialSoundcloud: string | null;
  socialBandcamp: string | null;
  collectionPublic: boolean;
}

/** Does this user hold at least one of the requested roles? */
export function hasAnyRole(
  user: Pick<AuthUser, 'roles'> | null | undefined,
  allowed: ReadonlyArray<UserRole>,
): boolean {
  if (!user) return false;
  return allowed.some((r) => user.roles.includes(r));
}
