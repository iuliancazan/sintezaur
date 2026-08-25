import bcrypt from 'bcryptjs';

// Prints the bcrypt hash for the workshops superadmin password, base64-
// encoded for safe transport through env files and PaaS env UIs (raw
// bcrypt hashes contain `$`, which dotenv-expand mangles).
// Usage: pnpm tsx tools/scripts/workshops-hash-password.ts <password>
const password = process.argv[2];
if (!password) {
  console.error(
    'Usage: pnpm tsx tools/scripts/workshops-hash-password.ts <password>',
  );
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log('Set this in .env / Coolify:');
console.log(
  `WORKSHOPS_SUPERADMIN_PASSWORD_HASH=${Buffer.from(hash, 'utf8').toString('base64')}`,
);
