import { oc } from '@orpc/contract';
import { z } from 'zod';

export const livenessSchema = z.object({ status: z.literal('ok') });

/**
 * Readiness: overall status only. Dependency names and timings are logged server-side, never
 * published; a failing probe is a 503 problem+json with code `health.not_ready`.
 */
export const readinessSchema = z.object({ status: z.literal('ok') });
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
