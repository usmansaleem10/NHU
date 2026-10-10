import { STATUS_CODES } from 'node:http';

import type { ProblemDetails, ProblemKind } from '@hims/contracts';
import { PROBLEM_KINDS, problemType } from '@hims/contracts';
import { HttpException } from '@nestjs/common';
import { ValidationError as ContractValidationError } from '@orpc/contract';
import { ORPCError } from '@orpc/server';

import { DomainError, ValidationError } from './domain-error';

function kindProblem(kind: ProblemKind, code: string, detail?: string): ProblemDetails {
  const { status, title } = PROBLEM_KINDS[kind];
  return {
    type: problemType(kind),
    title,
    status,
    code,
    ...(detail === undefined ? {} : { detail }),
  };
}

const INTERNAL: ProblemDetails = kindProblem('internal', 'internal');

/** RFC 9457 `about:blank` problem for a plain HTTP status raised by the framework. */
function httpProblem(status: number, detail: string): ProblemDetails {
  return {
    type: 'about:blank',
    title: STATUS_CODES[status] ?? 'Error',
    status,
    code: `http.${String(status)}`,
    detail,
  };
}

function domainProblem(error: DomainError): ProblemDetails {
  if (PROBLEM_KINDS[error.kind].status >= 500 && !error.isPublic) {
    return kindProblem(error.kind, error.code);
  }
  const problem = kindProblem(error.kind, error.code, error.message);
  const errors = error instanceof ValidationError && error.errors.length > 0 ? error.errors : [];
  // Extensions go first so they can never override the standard members.
  return {
    ...error.extensions,
    ...problem,
    ...(errors.length > 0 ? { errors: [...errors] } : {}),
  };
}

type IssuePath = ContractValidationError['issues'][number]['path'];

function issuePath(path: IssuePath): string {
  return (path ?? [])
    .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
    .join('.');
}

/** Errors raised by the oRPC contract layer (input/output validation, handler failures). */
function contractProblem(
  error: Pick<Error, 'message' | 'cause'> & { status: number },
): ProblemDetails | undefined {
  const { cause } = error;
  if (cause instanceof DomainError) return domainProblem(cause);
  if (cause instanceof ContractValidationError && error.status === 400) {
    return {
      ...kindProblem('validation', 'request.invalid', error.message),
      errors: cause.issues.map((issue) => ({
        path: issuePath(issue.path),
        message: issue.message,
      })),
    };
  }
  return undefined;
}

function clientErrorStatus(error: unknown): number | undefined {
  if (error instanceof HttpException) return error.getStatus();
  if (error instanceof ORPCError) return error.status;
  // Fastify lifecycle errors (body parsing, content type, payload size) carry statusCode.
  if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  return undefined;
}

/**
 * Single mapping from anything thrown to RFC 9457 problem details (without `requestId`, which
 * the HTTP layer adds). 5xx details are never exposed: callers must log the original error.
 */
export function toProblem(error: unknown): ProblemDetails {
  if (error instanceof DomainError) return domainProblem(error);
  if (error instanceof ORPCError) {
    const problem = contractProblem(error);
    if (problem) return problem;
  }

  const status = clientErrorStatus(error);
  if (status !== undefined && status >= 400 && status < 500 && error instanceof Error) {
    // Framework messages may echo the request URL; never echo its query string.
    return httpProblem(status, error.message.replace(/\?\S*/g, ''));
  }
  return { ...INTERNAL };
}
