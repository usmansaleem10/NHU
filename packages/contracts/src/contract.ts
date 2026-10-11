import { healthContract } from './health/health.contract.js';
import { metaContract } from './meta/meta.contract.js';

/**
 * The whole HTTP API as one oRPC contract router. Paths are relative to /api/<API_VERSION>.
 * Each feature adds its `<feature>.contract.ts` here; the API implements it with
 * `@Implement(contract.<feature>.<procedure>)` and the web calls it through `createApiClient`.
 */
export const contract = {
  health: healthContract,
  meta: metaContract,
};

export type Contract = typeof contract;
