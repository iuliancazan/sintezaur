export const SESSION_COOKIE = 'ws_session';
export const VISITOR_COOKIE = 'ws_visitor';

export type SessionRole = 'guest' | 'admin' | 'superadmin';

export interface SessionPayload {
  role: SessionRole;
  /** Present for guest/admin sessions; superadmin spans all workshops. */
  workshopId?: string;
  slug?: string;
}

/** Session lifetimes in seconds (workshops-spec.md §4.1). */
export const SESSION_TTL_S: Record<SessionRole, number> = {
  guest: 30 * 24 * 60 * 60,
  admin: 30 * 24 * 60 * 60,
  superadmin: 7 * 24 * 60 * 60,
};

export const SESSION_MAX_AGE_MS: Record<SessionRole, number> = {
  guest: 30 * 24 * 60 * 60 * 1000,
  admin: 30 * 24 * 60 * 60 * 1000,
  superadmin: 7 * 24 * 60 * 60 * 1000,
};
