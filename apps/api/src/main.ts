import { bootstrap } from './app/bootstrap';

// Fail fast: an invalid environment or a failed boot exits non-zero before serving traffic.
bootstrap(process.env).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
