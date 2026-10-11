import type { ListResult, SortTerm } from '@hims/contracts';

import { ValidationError } from '../errors/domain-error';
import type { CursorBinding, CursorCodec, CursorScope, CursorValue } from './cursor';

export type { CursorValue } from './cursor';

/** Unique, immutable column appended to every sort so the order is total. */
export const TIEBREAKER = 'id';

export interface KeysetCondition<F extends string> {
  field: F;
  op: 'eq' | 'gt' | 'lt';
  value: CursorValue;
}

/**
 * DB-agnostic "rows after the cursor" filter: OR over groups, AND within a group.
 * For sort (a desc, b asc) after (A, B): `a < A OR (a = A AND b > B)`. A Drizzle repository
 * maps it with `or(...anyOf.map((g) => and(...g.map(toCondition))))`.
 */
export interface KeysetPredicate<F extends string> {
  anyOf: KeysetCondition<F>[][];
}

/** What a repository receives. Return at most `fetchLimit` rows, ordered by `sort`. */
export interface PageRequest<F extends string, Filter> {
  /** Client sort plus the tie-breaker; ORDER BY these terms, in order. */
  sort: SortTerm<F>[];
  /** Validated, allow-listed filters from the query. */
  filter: Filter | undefined;
  /** Keyset condition for the page start; undefined on the first page. */
  after: KeysetPredicate<F> | undefined;
  /** limit + 1: the extra row only signals that another page exists. */
  fetchLimit: number;
}

/** Implemented by feature repositories (e.g. with Drizzle) to serve keyset-paginated lists. */
export interface KeysetPageSource<Row, F extends string, Filter> {
  findPage(request: PageRequest<F, Filter>): Promise<Row[]>;
}

/** Parsed list query, as produced by `listQuery()` from @hims/contracts. */
export interface ListQueryInput<F extends string, Filter> {
  limit: number;
  sort: SortTerm<F>[];
  cursor?: string | undefined;
  filter?: Filter | undefined;
}

export function toKeysetSort<F extends string>(sort: readonly SortTerm<F>[]): SortTerm<F | 'id'>[] {
  if (sort.some((term) => term.field === TIEBREAKER)) return [...sort];
  return [...sort, { field: TIEBREAKER, direction: 'asc' }];
}

export function sortSignature(sort: readonly SortTerm[]): string {
  return sort.map(({ field, direction }) => (direction === 'desc' ? `-${field}` : field)).join(',');
}

export function keysetPredicate<F extends string>(
  sort: readonly SortTerm<F>[],
  after: readonly CursorValue[],
): KeysetPredicate<F> {
  if (after.length !== sort.length) {
    throw new ValidationError('list.cursor_invalid', 'The page cursor does not match the sort', {
      errors: [{ path: 'cursor', message: 'Invalid cursor' }],
    });
  }
  return {
    anyOf: sort.map((term, index) => [
      ...sort.slice(0, index).map((previous, i) => ({
        field: previous.field,
        op: 'eq' as const,
        value: after[i] as CursorValue,
      })),
      {
        field: term.field,
        op: term.direction === 'asc' ? ('gt' as const) : ('lt' as const),
        value: after[index] as CursorValue,
      },
    ]),
  };
}

/** Per-request context: the codec plus what every cursor of this listing is bound to. */
export interface ListContext {
  codec: CursorCodec;
  /** Listing identifier, e.g. `patients`. */
  resource: string;
  /** Tenant/user the cursor belongs to (from the session; never from the client). */
  scope: CursorScope;
}

/**
 * Returns a row's key values for `sort`, in order. Contract:
 * - every value must be non-null (sortable columns are NOT NULL);
 * - timestamps must be the database's own text for the column (select `col::text` alongside
 *   the row), never a JS Date: Postgres keeps microseconds, Date keeps milliseconds, and a
 *   truncated key repeats or skips rows that share a millisecond. Alternatively declare the
 *   column `timestamptz(3)`.
 */
export type KeyOf<Row, F extends string> = (
  sort: readonly SortTerm<F>[],
) => (row: Row) => CursorValue[];

function assertKeyValues(values: readonly unknown[], expected: number): CursorValue[] {
  if (values.length !== expected) {
    throw new Error(
      `keyOf returned ${String(values.length)} key values for ${String(expected)} sort terms`,
    );
  }
  for (const value of values) {
    const valid =
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value));
    if (!valid) {
      // A programming error in the repository (500), never a client error.
      throw new Error(
        'keyOf returned an invalid key value: use non-null columns and DB text for timestamps',
      );
    }
  }
  return values as CursorValue[];
}

/**
 * Runs one keyset page: decodes the cursor (bound to resource, scope, sort and filter), asks
 * the source for limit + 1 rows, and builds the standard list envelope.
 */
export async function listPage<Row, F extends string, Filter>(
  source: KeysetPageSource<Row, F | 'id', Filter>,
  query: ListQueryInput<F, Filter>,
  context: ListContext,
  keyOf: KeyOf<Row, F | 'id'>,
): Promise<ListResult<Row>> {
  const sort = toKeysetSort(query.sort);
  const binding: CursorBinding = {
    resource: context.resource,
    scope: context.scope,
    sort: sortSignature(sort),
    filter: query.filter ?? null,
  };
  const after =
    query.cursor === undefined
      ? undefined
      : keysetPredicate(sort, context.codec.decode(query.cursor, binding));

  const rows = await source.findPage({
    sort,
    filter: query.filter,
    after,
    fetchLimit: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;
  const last = items.at(-1);
  const nextCursor =
    hasMore && last !== undefined
      ? context.codec.encode(binding, assertKeyValues(keyOf(sort)(last), sort.length))
      : null;
  return { items, page: { limit: query.limit, hasMore, nextCursor } };
}
