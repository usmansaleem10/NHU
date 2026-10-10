/** Version prefix for every API route: /api/v1/<resource>. */
export const API_VERSION = 'v1' as const;
export type ApiVersion = typeof API_VERSION;

export * from './problem.js';
