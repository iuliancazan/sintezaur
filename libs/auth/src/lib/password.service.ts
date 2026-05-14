import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

/**
 * bcryptjs wrapper. Cost factor reads from BCRYPT_COST env (default 12,
 * spec §M1: 12 in prod, 10 in dev — env-driven, no per-NODE_ENV
 * branching here).
 */
@Injectable()
export class PasswordService {
  private readonly cost: number;

  constructor(config: ConfigService) {
    this.cost = Number.parseInt(config.get('BCRYPT_COST') ?? '12', 10);
  }

  hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.cost);
  }

  verify(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Generate a random password (alphanumeric, ambiguous-character free).
   * Used when an admin bootstraps an account: the user is then forced to
   * change on first login (`users.must_change_password = true`).
   */
  generateRandom(length = 12): string {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }
}
