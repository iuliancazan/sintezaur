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

/** Roles allowed to enter the dashboard. `user` and `editor` are
 *  intentionally excluded — content authoring lives on the public
 *  site for editors; the dashboard is admin + moderator only. */
export const DASHBOARD_ROLES: ReadonlyArray<UserRole> = ['admin', 'moderator'];
