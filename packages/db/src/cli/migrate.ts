// `pnpm --filter @hims/db db:migrate`: apply pending migrations as the owner role.
// DATABASE_MIGRATION_URL must be the owner role (hims_owner) over a direct connection, e.g.
// postgres://hims_owner:hims_owner@localhost:5432/hims (dev). Never the PgBouncer URL.
import { runMigrations } from '../migrate.js';

const connectionString = process.env['DATABASE_MIGRATION_URL'];
if (!connectionString) {
  console.error('DATABASE_MIGRATION_URL is not set (hims_owner role, direct Postgres :5432).');
  process.exit(1);
}

await runMigrations({ connectionString });
console.log('Migrations applied.');
