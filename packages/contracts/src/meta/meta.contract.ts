import { oc } from '@orpc/contract';
import { z } from 'zod';

import { API_VERSION } from '../api-version.js';

export const apiVersionSchema = z.object({
  /** Route generation, e.g. `v1` in /api/v1. */
  apiVersion: z.literal(API_VERSION),
  /** Deployed release identifier (git SHA or tag); `dev` locally. */
  release: z.string(),
});
export type ApiVersionInfo = z.infer<typeof apiVersionSchema>;

export const metaContract = {
  version: oc
    .route({
      method: 'GET',
      path: '/meta/version',
      summary: 'API version and deployed release',
      tags: ['meta'],
    })
    .output(apiVersionSchema),
};
