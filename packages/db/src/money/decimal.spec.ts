import { describe, expect, it } from 'vitest';

import {
  Decimal,
  DecimalValueError,
  money,
  quantity,
  roundMoney,
  roundQuantity,
  toDecimal,
} from './decimal.js';
import { pgTable } from 'drizzle-orm/pg-core';

// The column mappers exactly as Drizzle calls them.
const t = pgTable('t', { amount: money('amount'), qty: quantity('qty') });
const toDb = (column: typeof t.amount | typeof t.qty, value: Decimal) =>
  column.mapToDriverValue(value);

describe('decimal arithmetic', () => {
  it('rounds half away from zero, like Postgres numeric', () => {
    expect(roundMoney('2.345').toFixed(2)).toBe('2.35');
    expect(roundMoney('-2.345').toFixed(2)).toBe('-2.35');
    expect(roundMoney('2.344').toFixed(2)).toBe('2.34');
    expect(roundQuantity('1.0005').toFixed(3)).toBe('1.001');
  });

  it('prices a line exactly: 1.5 units at Rs 33.33 = 49.995, billed 50.00', () => {
    const line = toDecimal('1.500').times('33.33');
    expect(line.toString()).toBe('49.995');
    expect(roundMoney(line).toFixed(2)).toBe('50.00');
  });

  it.each(['12abc', 'Infinity', 'NaN', '0x1f', '1e3', '-1.5E2', '1.', '.5', ' 1', '', '+1'])(
    'accepts only plain decimal strings: rejects %j',
    (input) => {
      expect(() => toDecimal(input)).toThrow(DecimalValueError);
    },
  );
});

describe('money / quantity columns', () => {
  it('write fixed-scale strings', () => {
    expect(toDb(t.amount, toDecimal('10'))).toBe('10.00');
    expect(toDb(t.qty, toDecimal('2.5'))).toBe('2.500');
  });

  it('refuse to let the database round silently', () => {
    expect(() => toDb(t.amount, toDecimal('49.995'))).toThrow(/round it first/);
    expect(() => toDb(t.qty, toDecimal('0.0001'))).toThrow(/round it first/);
  });

  it('refuse values that overflow numeric(14,2) / numeric(14,3)', () => {
    expect(toDb(t.amount, toDecimal('999999999999.99'))).toBe('999999999999.99');
    expect(() => toDb(t.amount, toDecimal('1000000000000'))).toThrow(/exceeds/);
    expect(() => toDb(t.qty, toDecimal('100000000000'))).toThrow(/exceeds/);
  });

  it.each(['NaN', 'Infinity', '-Infinity'])('refuse to read a non-finite numeric %j', (raw) => {
    expect(() => t.amount.mapFromDriverValue(raw)).toThrow(DecimalValueError);
  });

  it('read numeric strings without passing through float', () => {
    const read = t.amount.mapFromDriverValue('999999999999.99') as Decimal;
    expect(read).toBeInstanceOf(Decimal);
    expect(read.toFixed(2)).toBe('999999999999.99');
  });
});
