// `pnpm --filter @hims/db db:rls <table> [--branch]`: print the RLS DDL for a tenant table,
// ready to paste at the end of the drizzle-kit migration that creates it.
import { tenantRlsSql } from '../tenancy/rls.js';

const args = process.argv.slice(2);
const table = args.find((a) => !a.startsWith('--'));
if (!table) {
  console.error('usage: db:rls <table> [--branch]');
  process.exit(1);
}

const statements = tenantRlsSql(table, { branchScoped: args.includes('--branch') });
console.log(statements.map((s) => `${s};`).join('\n--> statement-breakpoint\n'));
