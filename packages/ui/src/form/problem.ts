/**
 * RFC 9457 problem+json as returned by the API for validation failures, and the mapping from its
 * `errors` extension onto form fields (F0-UI-04).
 *
 * The shape is structural so the ui kit does not depend on the contracts package; the generated
 * API client should throw `ProblemError` (or any object matching ProblemDetails) on 4xx.
 */
export interface ProblemFieldError {
  /** JSON pointer into the request body, e.g. "/address/city" or "#/code". */
  pointer?: string;
  /** Zod-style path, e.g. ["address", "city"] or "address.city". */
  path?: readonly (string | number)[] | string;
  /** Plain field name. */
  field?: string;
  message: string;
  code?: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Array form (preferred) or a { field: message | messages[] } map. */
  errors?: readonly ProblemFieldError[] | Readonly<Record<string, string | readonly string[]>>;
}

export class ProblemError extends Error {
  override readonly name = 'ProblemError';
  constructor(readonly problem: ProblemDetails) {
    super(problem.title ?? problem.detail ?? 'Request failed');
  }
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.status === 'number' ||
    typeof v.title === 'string' ||
    (typeof v.errors === 'object' && v.errors !== null)
  );
}

/** Extracts problem details from anything a mutation might throw. */
export function problemFrom(error: unknown): ProblemDetails | null {
  if (error instanceof ProblemError) return error.problem;
  return isProblemDetails(error) ? error : null;
}

function pointerToName(pointer: string): string {
  return pointer
    .replace(/^#/, '')
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .join('.');
}

function fieldName(e: ProblemFieldError): string {
  if (e.pointer !== undefined) return pointerToName(e.pointer);
  if (Array.isArray(e.path)) return e.path.join('.');
  if (typeof e.path === 'string') return e.path;
  return e.field ?? '';
}

export interface MappedProblem {
  /** First message per known field, keyed by dotted field name (react-hook-form path). */
  fieldErrors: Record<string, string>;
  /** Messages that don't belong to a field on this form (shown in the form-level alert). */
  formErrors: string[];
}

/**
 * Splits a problem into field errors and form-level errors. `isField` tells which names exist on
 * the current form; errors for unknown fields go to formErrors instead of being silently lost.
 */
export function mapProblemToFields(
  problem: ProblemDetails,
  isField: (name: string) => boolean,
): MappedProblem {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];

  const add = (name: string, message: string) => {
    if (name && isField(name)) {
      fieldErrors[name] ??= message;
    } else {
      formErrors.push(message);
    }
  };

  const { errors } = problem;
  if (Array.isArray(errors)) {
    for (const e of errors as readonly ProblemFieldError[]) add(fieldName(e), e.message);
  } else if (errors) {
    for (const [name, messages] of Object.entries(
      errors as Readonly<Record<string, string | readonly string[]>>,
    )) {
      const list: readonly string[] = typeof messages === 'string' ? [messages] : messages;
      for (const m of list)
        add(pointerToName(name.startsWith('/') ? name : `/${name.replace(/\./g, '/')}`), m);
    }
  }

  // A problem with no usable field errors still needs to tell the user something.
  if (Object.keys(fieldErrors).length === 0 && formErrors.length === 0) {
    const fallback = problem.detail ?? problem.title;
    if (fallback) formErrors.push(fallback);
  }
  return { fieldErrors, formErrors };
}
