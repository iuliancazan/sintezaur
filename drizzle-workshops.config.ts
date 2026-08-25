import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Workshops section uses its own database (workshops-spec.md §2/§11) so it
// stays fully deletable. Run with:
//   pnpm migrate:workshops:generate   (diff schema → new migration)
//   pnpm migrate:workshops            (apply)
const databaseUrl = process.env.WORKSHOPS_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'WORKSHOPS_DATABASE_URL is not set. Copy .env.example to .env and fill it in.',
  );
}

export default defineConfig({
  schema: './apps/workshops-api/src/db/schema.ts',
  out: './apps/workshops-api/src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
