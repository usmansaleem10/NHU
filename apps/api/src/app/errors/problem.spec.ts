import type { ProblemKind } from '@hims/contracts';
import { PROBLEM_KINDS } from '@hims/contracts';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { ValidationError as ContractValidationError } from '@orpc/contract';
import { ORPCError } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthenticatedError,
  ValidationError,
} from './domain-error';
import { toProblem } from './problem';

describe('toProblem: domain errors', () => {
  it.each([
    [new ValidationError('visit.date_in_future', 'Visit date is in the future'), 400, 'validation'],
    [new UnauthenticatedError('auth.session_expired', 'Session expired'), 401, 'unauthenticated'],
    [new ForbiddenError('billing.refund.forbidden', 'Cannot refund'), 403, 'forbidden'],
    [new NotFoundError('patient.not_found', 'Patient not found'), 404, 'not-found'],
    [new ConflictError('bed.occupied', 'Bed is already occupied'), 409, 'conflict'],
    [
      new BusinessRuleError('invoice.posted', 'Posted invoices are immutable'),
      422,
      'business-rule',
    ],
    [new ServiceUnavailableError('health.not_ready', 'Not ready'), 503, 'unavailable'],
  ] as const)('maps %o to %i', (error, status, kind: ProblemKind) => {
    expect(toProblem(error)).toEqual({
      type: `urn:hims:problem:${kind}`,
      title: PROBLEM_KINDS[kind].title,
      status,
      code: error.code,
      detail: error.message,
    });
  });

  it('includes field errors for validation failures', () => {
    const error = new ValidationError('patient.invalid', 'Patient is invalid', {
      errors: [{ path: 'cnic', message: 'CNIC must have 13 digits' }],
    });

    expect(toProblem(error)).toMatchObject({
      status: 400,
      errors: [{ path: 'cnic', message: 'CNIC must have 13 digits' }],
    });
  });

  it('adds extension members without letting them override standard members', () => {
    const error = new ConflictError('bed.occupied', 'Bed is already occupied', {
      extensions: { bedId: 'b-12', status: 200, type: 'spoofed', code: 'spoofed' },
    });

    expect(toProblem(error)).toMatchObject({
      bedId: 'b-12',
      status: 409,
      type: 'urn:hims:problem:conflict',
      code: 'bed.occupied',
    });
  });
});

describe('toProblem: framework and unknown errors', () => {
  it('maps a Nest HttpException using the RFC 9457 about:blank convention', () => {
    expect(toProblem(new NotFoundException('Cannot GET /api/v1/nope'))).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      code: 'http.404',
      detail: 'Cannot GET /api/v1/nope',
    });
  });

  it('keeps the status of Nest client errors raised with an object body', () => {
    expect(toProblem(new BadRequestException({ reason: 'x' }))).toMatchObject({
      status: 400,
      title: 'Bad Request',
    });
  });

  it('maps Fastify-style errors that carry a 4xx statusCode', () => {
    const fastifyError = Object.assign(new Error('Unsupported Media Type: text/csv'), {
      statusCode: 415,
      code: 'FST_ERR_CTP_INVALID_MEDIA_TYPE',
    });

    expect(toProblem(fastifyError)).toMatchObject({
      type: 'about:blank',
      status: 415,
      title: 'Unsupported Media Type',
      detail: 'Unsupported Media Type: text/csv',
    });
  });

  it.each([
    ['a plain Error', new Error('connect ECONNREFUSED 10.0.0.5:5432')],
    ['a 5xx HttpException', new HttpException('pool exhausted at db-primary', 502)],
    ['a thrown non-error value', { weird: true }],
  ])('hides internals of %s behind a generic 500', (_case, error) => {
    const problem = toProblem(error);

    expect(problem).toEqual({
      type: 'urn:hims:problem:internal',
      title: 'Internal server error',
      status: 500,
      code: 'internal',
    });
  });
});

describe('toProblem: contract (oRPC) errors', () => {
  it('unwraps a DomainError thrown inside a contract handler', () => {
    const error = new ORPCError('INTERNAL_SERVER_ERROR', {
      cause: new NotFoundError('patient.not_found', 'Patient not found'),
    });

    expect(toProblem(error)).toMatchObject({ status: 404, code: 'patient.not_found' });
  });

  it('maps contract input validation failures to a 400 with field errors', () => {
    const error = new ORPCError('BAD_REQUEST', {
      message: 'Input validation failed',
      cause: new ContractValidationError({
        message: 'Input validation failed',
        issues: [
          { message: 'Too big: expected number to be <=100', path: ['limit'] },
          { message: 'Invalid option', path: ['filter', { key: 'status' }] },
          { message: 'Required' },
        ],
        data: {},
      }),
    });

    expect(toProblem(error)).toEqual({
      type: 'urn:hims:problem:validation',
      title: 'Invalid request',
      status: 400,
      code: 'request.invalid',
      detail: 'Input validation failed',
      errors: [
        { path: 'limit', message: 'Too big: expected number to be <=100' },
        { path: 'filter.status', message: 'Invalid option' },
        { path: '', message: 'Required' },
      ],
    });
  });

  it('treats an invalid handler output as a server fault, not a client error', () => {
    const error = new ORPCError('INTERNAL_SERVER_ERROR', {
      cause: new ContractValidationError({
        message: 'Output validation failed',
        issues: [],
        data: {},
      }),
    });

    expect(toProblem(error)).toMatchObject({ status: 500, code: 'internal' });
  });

  it('keeps the status of other contract client errors', () => {
    expect(toProblem(new ORPCError('NOT_FOUND', { message: 'Not found' }))).toMatchObject({
      type: 'about:blank',
      status: 404,
    });
  });
});
