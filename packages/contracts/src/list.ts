import { z } from 'zod';

/** Hard ceiling for any list endpoint (AGENTS.md: no unbounded SELECT). */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;
const MAX_SORT_TERMS = 3;
const MAX_CURSOR_LENGTH = 2048;

export type SortDirection = 'asc' | 'desc';

export interface SortTerm<F extends string = string> {
  field: F;
  direction: SortDirection;
}

/**
 * `sort` query parameter: comma-separated allow-listed fields, `-` prefix for descending,
 * e.g. `?sort=-createdAt,name`. Parses to `SortTerm[]`.
 */
export function sortParam<const F extends string>(sortable: readonly F[], defaultSort: string) {
  const allowed = new Set<string>(sortable);
  return z
    .string()
    .optional()
    .transform((raw, ctx): SortTerm<F>[] => {
      const segments = (raw ?? defaultSort).split(',');
      const terms: SortTerm<F>[] = [];
      for (const segment of segments) {
        const descending = segment.startsWith('-');
        const field = descending ? segment.slice(1) : segment;
        if (!allowed.has(field)) {
          ctx.addIssue({
            code: 'custom',
            message: `Cannot sort by "${field}"; allowed: ${sortable.join(', ')}`,
          });
          return z.NEVER;
        }
        if (terms.some((term) => term.field === field)) {
          ctx.addIssue({ code: 'custom', message: `Sort field "${field}" is repeated` });
          return z.NEVER;
        }
        terms.push({ field: field as F, direction: descending ? 'desc' : 'asc' });
      }
      if (terms.length > MAX_SORT_TERMS) {
        ctx.addIssue({ code: 'custom', message: `At most ${String(MAX_SORT_TERMS)} sort fields` });
        return z.NEVER;
      }
      return terms;
    });
}

/** Range filter on one field: `?filter[createdAt][gte]=...&filter[createdAt][lte]=...`. */
export function rangeFilter<T extends z.ZodType>(value: T) {
  return z.strictObject({ gte: value.optional(), lte: value.optional() });
}

export interface ListQueryOptions<F extends string, Filters extends z.ZodRawShape> {
  /** Allow-listed sort fields. Each must be a non-null, indexed column. */
  sortable: readonly F[];
  /** Sort applied when the client sends none, e.g. `-createdAt`. */
  defaultSort: string;
  /** Allow-listed filters, field -> value schema. Unknown filter fields are rejected. */
  filters: Filters;
  /** Lower the ceiling for heavy endpoints; never above {@link MAX_PAGE_SIZE}. */
  maxPageSize?: number;
}

/**
 * Query schema for a list endpoint: `limit`, opaque `cursor`, `sort` and `filter[...]`.
 * Anything outside the allow-lists, or `limit` above the maximum, is a 400.
 */
export function listQuery<const F extends string, Filters extends z.ZodRawShape>(
  options: ListQueryOptions<F, Filters>,
) {
  const maxPageSize = Math.min(options.maxPageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);
  return z.object({
    limit: z.coerce.number().int().min(1).max(maxPageSize).default(DEFAULT_PAGE_SIZE),
    cursor: z.string().min(1).max(MAX_CURSOR_LENGTH).optional(),
    sort: sortParam(options.sortable, options.defaultSort),
    filter: z.strictObject(options.filters).partial().optional(),
  });
}

export const pageInfoSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: z.string().nullable(),
});
export type PageInfo = z.infer<typeof pageInfoSchema>;

/** Standard list envelope: `{ items, page: { limit, hasMore, nextCursor } }`. */
export function listResponse<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), page: pageInfoSchema });
}

export interface ListResult<T> {
  items: T[];
  page: PageInfo;
}
