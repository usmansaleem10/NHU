// drizzle-kit config for the whole database. One ordered migrations folder lives here, fed by
// infrastructure tables in this package and by feature tables in apps/api
// (apps/api/src/features/<feature>/<feature>.schema.ts, AGENTS.md repo layout).
// `db:generate` only diffs schema snapshots; it never connects to a database.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/schema/*.ts', '../../apps/api/src/features/*/*.schema.ts'],
  out: './migrations',
  strict: true,
  verbose: true,
});
