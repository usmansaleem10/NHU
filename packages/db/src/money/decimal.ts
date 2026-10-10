import { Decimal as DecimalJs } from 'decimal.js';
import { customType } from 'drizzle-orm/pg-core';

import { DbError } from '../errors.js';

/**
 * Exact decimal arithmetic for money and quantities (AGENTS.md rule 9: never JS number).
 *
 * decimal.js over big.js: it has configurable rounding modes per operation (tax, discounts and
 * pro-rata splits need explicit half-up and banker's rounding), plus division and
 * comparison helpers we would otherwise hand-roll. A private clone keeps the config away from
 * any other decimal.js user in the process. ROUND_HALF_UP rounds .5 away from zero, which is
 * what Postgres numeric does, so app and DB rounding agree.
 */
export const Decimal = DecimalJs.clone({
  precision: 40,
  rounding: DecimalJs.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
});
export type Decimal = DecimalJs;

/** Strings or Decimals only: a JS number may already carry binary floating-point error. */
export type DecimalInput = string | DecimalJs;

export const MONEY_SCALE = 2;
export const QUANTITY_SCALE = 3;
const PRECISION = 14; // numeric(14, s)

export class DecimalValueError extends DbError {
  readonly code = 'INVALID_DECIMAL';

  constructor(detail: string, options?: ErrorOptions) {
    super(`Invalid decimal: ${detail}`, options);
  }
}

export function toDecimal(value: DecimalInput): Decimal {
  let d: Decimal;
  try {
    d = new Decimal(value);
  } catch (error) {
    throw new DecimalValueError(String(value), { cause: error });
  }
  if (!d.isFinite()) throw new DecimalValueError('must be finite');
  return d;
}

/** Round to 2 places, half away from zero (same as Postgres numeric). */
export const roundMoney = (value: DecimalInput): Decimal =>
  toDecimal(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);

/** Round to 3 places, half away from zero. */
export const roundQuantity = (value: DecimalInput): Decimal =>
  toDecimal(value).toDecimalPlaces(QUANTITY_SCALE, Decimal.ROUND_HALF_UP);

/**
 * Value -> numeric(14, scale) literal. Rejects more decimal places than the column holds instead
 * of letting Postgres round silently: rounding money is a business decision, made explicitly
 * with roundMoney/roundQuantity. Also rejects values that would overflow the column.
 */
function toNumericString(value: DecimalInput, scale: number, kind: string): string {
  const d = toDecimal(value);
  if (d.decimalPlaces() > scale) {
    throw new DecimalValueError(
      `${kind} ${d.toString()} has more than ${String(scale)} decimal places; round it first`,
    );
  }
  if (d.abs().gte(new Decimal(10).pow(PRECISION - scale))) {
    throw new DecimalValueError(`${kind} ${d.toString()} exceeds numeric(14,${String(scale)})`);
  }
  return d.toFixed(scale);
}

const decimalColumn = (scale: number, kind: string) =>
  customType<{ data: Decimal; driverData: string }>({
    dataType: () => `numeric(${String(PRECISION)}, ${String(scale)})`,
    // node-postgres returns numeric as a string by default: exact, no float in between.
    fromDriver: (value) => new Decimal(value),
    toDriver: (value) => toNumericString(value, scale, kind),
  });

/** numeric(14,2) <-> Decimal. Use for every amount, price, tax, discount, balance. */
export const money = decimalColumn(MONEY_SCALE, 'Money');

/** numeric(14,3) <-> Decimal. Use for stock and dispensed quantities. */
export const quantity = decimalColumn(QUANTITY_SCALE, 'Quantity');

/** For raw/aggregate SQL results: sql<string>`sum(...)`.mapWith(decimalFromDb). */
export const decimalFromDb = (value: unknown): Decimal => toDecimal(String(value));
