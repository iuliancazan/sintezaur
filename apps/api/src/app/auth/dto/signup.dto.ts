import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /**
   * Password complexity rules per spec §M1: min 8 chars. We deliberately
   * keep the rule simple at the API edge (no required character classes)
   * — modern guidance favours length over forced classes. The bcrypt
   * cost factor is the real defense.
   */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  /**
   * Public handle. Slug-safe: lowercase alphanumeric + `_` + `-`.
   * Length 3–30. Stored as-typed but matched case-insensitively via
   * the lower() functional index.
   */
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, {
    message:
      'Username must be lowercase letters, digits, _ or -, between 3 and 30 characters.',
  })
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;
}
