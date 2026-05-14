/**
 * Mirrors `AuthUserPublic` on the API. Kept here as a literal type
 * (not imported from the backend) so the site bundle stays free of
 * server-only deps. When @sintezaur/shared lands DTOs (M2), this can
 * be re-exported from there.
 */
export type UserRole = 'user' | 'editor' | 'moderator' | 'admin';
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
  role: UserRole;
  trustLevel: TrustLevel;
  displayCurrency: DisplayCurrency;
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}
