import type { FieldError, ProblemKind } from '@hims/contracts';

export interface DomainErrorOptions {
  /** Extra RFC 9457 extension members safe to show the client (never PII). */
  extensions?: Readonly<Record<string, unknown>>;
  cause?: unknown;
}

/**
 * Base of every expected failure. Services throw (or return) these; the problem+json layer
 * maps `kind` to an HTTP status. Never throw strings or bare `Error`s for expected failures.
 */
export abstract class DomainError extends Error {
  abstract readonly kind: ProblemKind;
  readonly extensions: Readonly<Record<string, unknown>>;

  /**
   * @param code stable machine-readable code, `<area>.<rule>` (e.g. `patient.not_found`);
   *   the web maps it to an i18n message
   * @param message developer-facing detail; must not contain PII
   */
  constructor(
    readonly code: string,
    message: string,
    options: DomainErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.extensions = options.extensions ?? {};
  }
}

export class ValidationError extends DomainError {
  readonly kind = 'validation';
  readonly errors: readonly FieldError[];

  constructor(
    code: string,
    message: string,
    options: DomainErrorOptions & { errors?: readonly FieldError[] } = {},
  ) {
    super(code, message, options);
    this.errors = options.errors ?? [];
  }
}

export class UnauthenticatedError extends DomainError {
  readonly kind = 'unauthenticated';
}

export class ForbiddenError extends DomainError {
  readonly kind = 'forbidden';
}

export class NotFoundError extends DomainError {
  readonly kind = 'not-found';
}

export class ConflictError extends DomainError {
  readonly kind = 'conflict';
}

export class BusinessRuleError extends DomainError {
  readonly kind = 'business-rule';
}

export class ServiceUnavailableError extends DomainError {
  readonly kind = 'unavailable';
}
