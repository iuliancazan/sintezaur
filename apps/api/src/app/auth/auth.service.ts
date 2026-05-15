import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATABASE,
  emailVerificationTokens,
  passwordResetTokens,
  userEmailHistory,
  userRoles,
  users,
  type SintezaurDb,
  type User,
  type UserRole,
} from '@sintezaur/db';
import {
  PasswordService,
  TokenService,
  type IssuedTokens,
} from '@sintezaur/auth';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { EmailService } from './email.service';
import {
  emailChangeVerificationEmail,
  passwordResetEmail,
  verificationEmail,
} from './email-templates';
import { StorageService } from '../common/storage.service';

/**
 * User shape returned to the frontend (no PII like password hash, no
 * verification dates we don't surface yet). Matches `AuthMeResponse`
 * that the site / dashboard `AuthService` types against.
 */
export interface AuthUserPublic {
  id: string;
  email: string;
  username: string;
  fullName: string;
  /** Multi-valued per spec §7.2. Empty array = a `user`-only client
   *  (no extra capabilities). `guest` is never serialized — guests
   *  don't have an `AuthUserPublic` at all. */
  roles: UserRole[];
  trustLevel: User['trustLevel'];
  displayCurrency: User['displayCurrency'];
  subscriptionTier: User['subscriptionTier'];
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
}

export interface UpdateProfileInput {
  fullName?: string;
  bio?: string | null;
  location?: string | null;
  displayCurrency?: User['displayCurrency'];
  websiteUrl?: string | null;
  socialInstagram?: string | null;
  socialSoundcloud?: string | null;
  socialBandcamp?: string | null;
}

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1_000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1_000; // 1h
const ACCOUNT_LOCK_THRESHOLD = 10; // failed logins before lockout
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1_000; // 15min cooldown

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
    private readonly storage: StorageService,
  ) {}

  // ────────────────────────────────────────────────────────────────────
  // Signup → verification email
  // ────────────────────────────────────────────────────────────────────

  async signup(input: {
    email: string;
    password: string;
    username: string;
    fullName: string;
  }): Promise<{ userId: string }> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const fullName = input.fullName.trim();

    // Case-insensitive uniqueness check (matches the lower() partial
    // indexes from 9001_users_case_insensitive_indexes.sql). The DB
    // index is the source of truth — this pre-check just lets us
    // return a friendly error instead of a 500 on the INSERT race.
    const [conflict] = await this.db
      .select({
        id: users.id,
        emailMatch: sql<boolean>`lower(${users.email}) = ${email}`,
        usernameMatch: sql<boolean>`lower(${users.username}) = ${username}`,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`(lower(${users.email}) = ${email} OR lower(${users.username}) = ${username})`,
        ),
      )
      .limit(1);
    if (conflict) {
      throw new ConflictException(
        conflict.emailMatch
          ? 'Există deja un cont cu această adresă de email.'
          : 'Acest username este deja folosit.',
      );
    }

    const passwordHash = await this.passwords.hash(input.password);
    const [created] = await this.db
      .insert(users)
      .values({
        email,
        username,
        fullName,
        passwordHash,
        emailVerified: false,
        trustLevel: 'unverified',
      })
      .returning({ id: users.id });

    await this.issueVerificationEmail(created.id, email, fullName);
    this.logger.log(`signup ok id=${created.id} email=${email}`);
    return { userId: created.id };
  }

  async verifyEmail(rawToken: string): Promise<{ verified: boolean }> {
    const tokenHash = sha256(rawToken);
    const now = new Date();
    const [row] = await this.db
      .select({
        id: emailVerificationTokens.id,
        userId: emailVerificationTokens.userId,
        email: emailVerificationTokens.email,
        expiresAt: emailVerificationTokens.expiresAt,
        usedAt: emailVerificationTokens.usedAt,
      })
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.usedAt || row.expiresAt <= now) {
      throw new BadRequestException(
        'Linkul de verificare este invalid sau a expirat.',
      );
    }

    await this.db.transaction(async (tx) => {
      // Capture old email for audit trail BEFORE the update so we can
      // log to `user_email_history` per spec §9. Initial signup
      // verifications (row.email == current users.email) skip the
      // history row — nothing changed.
      const [current] = await tx
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, row.userId))
        .limit(1);
      const isEmailChange =
        current && current.email.toLowerCase() !== row.email.toLowerCase();

      await tx
        .update(users)
        .set({
          email: row.email,
          emailVerified: true,
          trustLevel: 'email_verified',
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.userId));
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, row.id));

      if (isEmailChange && current) {
        await tx.insert(userEmailHistory).values({
          userId: row.userId,
          oldEmail: current.email,
          newEmail: row.email,
        });
      }
    });

    return { verified: true };
  }

  // ────────────────────────────────────────────────────────────────────
  // Login / logout / refresh
  // ────────────────────────────────────────────────────────────────────

  async login(
    inputEmail: string,
    plaintextPassword: string,
    meta?: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ tokens: IssuedTokens; user: AuthUserPublic }> {
    const email = inputEmail.trim().toLowerCase();
    const row = await this.findByEmailLower(email);

    // Generic 401 — don't leak whether email exists.
    const denyGeneric = (): never => {
      throw new UnauthorizedException('Email sau parolă invalidă.');
    };

    if (!row || !row.passwordHash) {
      // Constant-time-ish: do a dummy hash compare so timing leaks are
      // attenuated. Not perfect (string equality on email-found path
      // differs) but cheap.
      await this.passwords.verify(plaintextPassword, dummyHash());
      return denyGeneric();
    }
    if (row.deletedAt) return denyGeneric();

    if (row.lockedUntil && row.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Contul este blocat temporar din cauza prea multor încercări eșuate. Reîncearcă peste câteva minute.',
      );
    }

    const ok = await this.passwords.verify(plaintextPassword, row.passwordHash);
    if (!ok) {
      const nextCount = (row.failedLoginCount ?? 0) + 1;
      const lockedUntil =
        nextCount >= ACCOUNT_LOCK_THRESHOLD
          ? new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS)
          : row.lockedUntil ?? null;
      await this.db
        .update(users)
        .set({
          failedLoginCount: nextCount,
          lockedUntil,
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.id));
      return denyGeneric();
    }

    if (!row.emailVerified) {
      throw new UnauthorizedException(
        'Adresa de email nu este confirmată. Verifică inbox-ul pentru linkul de confirmare.',
      );
    }

    await this.db
      .update(users)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.id));

    const roles = await this.fetchRoles(row.id);
    const tokens = await this.tokens.issueTokens(row.id, roles, meta);
    return { tokens, user: toPublic(row, roles) };
  }

  async refresh(
    presentedToken: string,
    meta?: { ip?: string | null; userAgent?: string | null },
  ): Promise<{ tokens: IssuedTokens; user: AuthUserPublic }> {
    const found = await this.tokens.findActiveRefreshToken(presentedToken);
    if (!found) throw new UnauthorizedException();

    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, found.userId), isNull(users.deletedAt)))
      .limit(1);
    if (!row) throw new UnauthorizedException();

    const roles = await this.fetchRoles(row.id);
    const issued = await this.tokens.issueTokens(row.id, roles, meta);
    await this.tokens.revokeById(found.id, issued.refreshTokenId);
    return { tokens: issued, user: toPublic(row, roles) };
  }

  async logout(presentedToken: string | undefined): Promise<void> {
    if (!presentedToken) return;
    await this.tokens.revokeByPlaintext(presentedToken);
  }

  // ────────────────────────────────────────────────────────────────────
  // Password reset
  // ────────────────────────────────────────────────────────────────────

  /**
   * Idempotent: always returns {sent:true} regardless of whether the
   * email exists in the DB. Prevents enumeration.
   */
  async requestPasswordReset(inputEmail: string): Promise<{ sent: boolean }> {
    const email = inputEmail.trim().toLowerCase();
    const row = await this.findByEmailLower(email);
    if (!row || row.deletedAt) return { sent: true };

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.db.insert(passwordResetTokens).values({
      userId: row.id,
      tokenHash,
      expiresAt,
    });

    const siteBase = (
      this.config.get<string>('SITE_BASE_URL') ?? 'http://localhost:4200'
    ).replace(/\/$/, '');
    const resetUrl = `${siteBase}/reset-password?token=${rawToken}`;
    await this.email.send(
      row.email,
      passwordResetEmail({ fullName: row.fullName, resetUrl }),
    );
    return { sent: true };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ reset: boolean }> {
    const tokenHash = sha256(rawToken);
    const now = new Date();
    const [row] = await this.db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!row) {
      throw new BadRequestException(
        'Linkul de resetare este invalid sau a expirat.',
      );
    }

    const passwordHash = await this.passwords.hash(newPassword);
    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
    });
    // Invalidate any active sessions — force re-login with new password.
    await this.tokens.revokeAllForUser(row.userId);
    return { reset: true };
  }

  // ────────────────────────────────────────────────────────────────────
  // Authenticated profile actions
  // ────────────────────────────────────────────────────────────────────

  async getById(userId: string): Promise<AuthUserPublic> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException();
    const roles = await this.fetchRoles(row.id);
    return toPublic(row, roles);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<AuthUserPublic> {
    const patch: Partial<User> = { updatedAt: new Date() };
    if (input.fullName !== undefined) {
      const fullName = input.fullName.trim();
      if (fullName.length < 2 || fullName.length > 80) {
        throw new BadRequestException(
          'Numele trebuie să aibă între 2 și 80 de caractere.',
        );
      }
      patch.fullName = fullName;
    }
    if (input.bio !== undefined) {
      patch.bio = sanitizeOptionalText(input.bio, 600);
    }
    if (input.location !== undefined) {
      patch.location = sanitizeOptionalText(input.location, 120);
    }
    if (input.displayCurrency !== undefined) {
      patch.displayCurrency = input.displayCurrency;
    }
    if (input.websiteUrl !== undefined) {
      patch.websiteUrl = sanitizeOptionalUrl(input.websiteUrl);
    }
    if (input.socialInstagram !== undefined) {
      patch.socialInstagram = sanitizeOptionalText(input.socialInstagram, 80);
    }
    if (input.socialSoundcloud !== undefined) {
      patch.socialSoundcloud = sanitizeOptionalText(input.socialSoundcloud, 80);
    }
    if (input.socialBandcamp !== undefined) {
      patch.socialBandcamp = sanitizeOptionalText(input.socialBandcamp, 80);
    }

    await this.db.update(users).set(patch).where(eq(users.id, userId));
    return this.getById(userId);
  }

  async setAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<AuthUserPublic> {
    if (!file) throw new BadRequestException('Lipsește fișierul.');
    const { relativePath } = await this.storage.processAvatar(userId, file);
    await this.db
      .update(users)
      .set({ avatarUrl: relativePath, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return this.getById(userId);
  }

  async removeAvatar(userId: string): Promise<AuthUserPublic> {
    await this.storage.deleteAvatar(userId);
    await this.db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return this.getById(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthUserPublic> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!row || !row.passwordHash) throw new UnauthorizedException();

    const ok = await this.passwords.verify(currentPassword, row.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Parola curentă este incorectă.');
    }

    const newHash = await this.passwords.hash(newPassword);
    await this.db
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.id));
    await this.tokens.revokeAllForUser(row.id);
    const roles = await this.fetchRoles(row.id);
    return toPublic({ ...row, passwordHash: newHash }, roles);
  }

  /**
   * Email change is two-phase: we DON'T flip `users.email` here. We
   * store the new address on a verification token row, send the
   * confirmation mail to the NEW address, and only swap the column
   * once the user clicks through (in `verifyEmail`).
   *
   * This means until verification, the account still logs in with
   * the old email and `users.email_verified` stays true.
   */
  async requestEmailChange(
    userId: string,
    currentPassword: string,
    newEmailInput: string,
  ): Promise<{ sent: boolean }> {
    const newEmail = newEmailInput.trim().toLowerCase();

    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!row || !row.passwordHash) throw new UnauthorizedException();

    const ok = await this.passwords.verify(currentPassword, row.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Parola curentă este incorectă.');
    }

    if (newEmail === row.email.toLowerCase()) {
      throw new BadRequestException(
        'Noua adresă este identică cu cea curentă.',
      );
    }

    const [conflict] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`lower(${users.email}) = ${newEmail}`,
        ),
      )
      .limit(1);
    if (conflict) {
      throw new ConflictException(
        'Există deja un cont cu această adresă de email.',
      );
    }

    await this.issueVerificationEmail(row.id, newEmail, row.fullName, {
      kind: 'change',
    });
    return { sent: true };
  }

  // ────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────

  private async fetchRoles(userId: string): Promise<UserRole[]> {
    const rows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    return rows.map((r) => r.role);
  }

  private async findByEmailLower(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    return row ?? null;
  }

  private async issueVerificationEmail(
    userId: string,
    email: string,
    fullName: string,
    opts?: { kind?: 'signup' | 'change' },
  ): Promise<void> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await this.db.insert(emailVerificationTokens).values({
      userId,
      tokenHash,
      email,
      expiresAt,
    });

    const siteBase = (
      this.config.get<string>('SITE_BASE_URL') ?? 'http://localhost:4200'
    ).replace(/\/$/, '');
    const verifyUrl = `${siteBase}/verify-email?token=${rawToken}`;
    const message =
      opts?.kind === 'change'
        ? emailChangeVerificationEmail({ fullName, verifyUrl, newEmail: email })
        : verificationEmail({ fullName, verifyUrl });
    await this.email.send(email, message);
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function sanitizeOptionalText(value: string | null, maxLen: number): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLen) {
    throw new BadRequestException(
      `Câmpul depășește ${maxLen} caractere.`,
    );
  }
  return trimmed;
}

function sanitizeOptionalUrl(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 200) {
    throw new BadRequestException('Adresa URL este prea lungă.');
  }
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('protocol');
    }
    return parsed.toString();
  } catch {
    throw new BadRequestException('Adresa URL nu este validă.');
  }
}

/** Reused for timing-attenuation on login when email doesn't exist. */
function dummyHash(): string {
  return '$2a$12$0000000000000000000000.0000000000000000000000000000000000';
}

function toPublic(row: User, roles: UserRole[]): AuthUserPublic {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.fullName,
    roles,
    trustLevel: row.trustLevel,
    displayCurrency: row.displayCurrency,
    subscriptionTier: row.subscriptionTier,
    emailVerified: row.emailVerified,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt.toISOString(),
    bio: row.bio,
    location: row.location,
    avatarUrl: row.avatarUrl,
    websiteUrl: row.websiteUrl,
    socialInstagram: row.socialInstagram,
    socialSoundcloud: row.socialSoundcloud,
    socialBandcamp: row.socialBandcamp,
  };
}
