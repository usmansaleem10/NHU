import { createORPCClient, ORPCError } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';

import { API_VERSION } from './api-version.js';
import type { Contract } from './contract.js';
import { contract } from './contract.js';
import type { ProblemDetails } from './problem.js';
import { PROBLEM_CONTENT_TYPE, problemDetailsSchema } from './problem.js';

/** Fully typed client: one async function per contract procedure. */
export type ApiClient = ContractRouterClient<Contract>;

export interface ApiClientOptions {
  /** Absolute origin (plus optional path prefix) of the API; in the browser `location.origin`. */
  baseUrl: string | URL;
  /** Custom fetch (tests, SSR). Defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Error thrown by the client for every non-2xx response. `problem` holds the parsed
 * RFC 9457 body; switch on `problem.code` and map it to an i18n message.
 */
export class ApiProblemError extends ORPCError<string, ProblemDetails> {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.code, {
      status: problem.status,
      message: problem.detail ?? problem.title,
      data: problem,
    });
    this.problem = problem;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const url = new URL(`api/${API_VERSION}`, toDirectoryUrl(options.baseUrl));
  const baseFetch = options.fetch;
  const link = new OpenAPILink(contract, {
    url,
    fetch: async (request: Request, init: RequestInit) =>
      asJsonProblem(await (baseFetch ?? globalThis.fetch)(request, init)),
    customErrorResponseBodyDecoder: (body) => {
      const parsed = problemDetailsSchema.safeParse(body);
      return parsed.success ? new ApiProblemError(parsed.data) : null;
    },
  });
  return createORPCClient<ApiClient>(link);
}

/** oRPC only parses `application/json` bodies; problem+json is JSON too. */
function asJsonProblem(response: Response): Response {
  if (!response.headers.get('content-type')?.startsWith(PROBLEM_CONTENT_TYPE)) return response;
  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function toDirectoryUrl(base: string | URL): URL {
  const absolute = new URL(base);
  if (!absolute.pathname.endsWith('/')) absolute.pathname += '/';
  return absolute;
}
