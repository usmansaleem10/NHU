import { oc } from '@orpc/contract';
import { z } from 'zod';

export const livenessSchema = z.object({ status: z.literal('ok') });

export const checkResultSchema = z.object({
  status: z.enum(['up', 'down']),
  durationMs: z.number().nonnegative(),
});

/** Readiness report. On failure the same `checks` map is sent in a 503 problem+json body. */
export const readinessSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.record(z.string(), checkResultSchema),
});
export type ReadinessReport = z.infer<typeof readinessSchema>;

export const healthContract = {
  /** Liveness: the process is up and serving HTTP. No dependency checks. */
  liveness: oc
    .route({ method: 'GET', path: '/health', summary: 'Liveness probe', tags: ['health'] })
    .output(livenessSchema),
  /** Readiness: every registered dependency check passed; 503 problem+json otherwise. */
  readiness: oc
    .route({
      method: 'GET',
      path: '/health/ready',
      summary: 'Readiness probe (503 when a dependency is down)',
      tags: ['health'],
    })
    .output(readinessSchema),
};
