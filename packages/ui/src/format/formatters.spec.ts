import { describe, expect, it, vi } from 'vitest';

import { createFormatters, FormatError, INVALID_PLACEHOLDER } from './formatters.js';

const karachi = createFormatters({
  locale: 'en-PK',
  timeZone: 'Asia/Karachi',
  currency: 'PKR',
  report: () => undefined,
});
// Expected calendar day rendered by ICU for en-PK, independent of ICU's exact punctuation.
const oct10 = new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeZone: 'UTC' }).format(
  Date.UTC(2026, 9, 10),
);

describe('createFormatters', () => {
  it('formats PKR money from a decimal string without float rounding', () => {
    // 0.1 + 0.2 style drift or 2^53 truncation would corrupt the last digits.
    const out = karachi.currency('12345678901234.57');
    expect(out).toContain('12,345,678,901,234.57');
    expect(out).toMatch(/Rs|PKR/);
  });

  it('formats money held as bigint paisa-free whole amounts', () => {
    expect(karachi.currency(12_345n)).toMatch(/12,345\.00$/);
  });

  it('always shows paisa even though ICU defaults PKR to 0 decimals', () => {
    expect(karachi.currency('1500')).toMatch(/1,500\.00$/);
  });

  it('never shows a negative zero ("-Rs 0.00") for amounts that round to zero', () => {
    expect(karachi.currency('-0.001')).not.toContain('-');
    expect(karachi.currency('-0')).not.toContain('-');
    expect(karachi.currency('-1500.50')).toContain('-');
  });

  it('renders a placeholder and reports, instead of throwing, for a bad amount', () => {
    const report = vi.fn<(e: FormatError) => void>();
    const fmt = createFormatters({ locale: 'en-PK', timeZone: 'UTC', currency: 'PKR', report });
    // A table cell renderer must not crash the whole screen on one bad value.
    expect(fmt.currency('12,000')).toBe(INVALID_PLACEHOLDER);
    expect(fmt.currency('1e5')).toBe(INVALID_PLACEHOLDER);
    expect(fmt.dateTime('not-a-date')).toBe(INVALID_PLACEHOLDER);
    expect(report).toHaveBeenCalledTimes(3);
    expect(report.mock.calls[0]?.[0]).toBeInstanceOf(FormatError);
  });

  it('renders instants in the tenant time zone, not the browser zone', () => {
    // 20:30 UTC on the 9th is 01:30 on the 10th in Karachi (UTC+5).
    expect(karachi.date('2026-10-09T20:30:00Z')).toBe(oct10);
    expect(karachi.time('2026-10-09T20:30:00Z')).toMatch(/^0?1:30/);
  });

  it('keeps date-only values on their calendar day in every zone', () => {
    const honolulu = createFormatters({
      locale: 'en-PK',
      timeZone: 'Pacific/Honolulu',
      currency: 'PKR',
    });
    expect(honolulu.date('2026-10-10')).toBe(oct10);
    expect(karachi.date('2026-10-10')).toBe(oct10);
  });

  it('follows the tenant locale for digit grouping in decimals and counts', () => {
    const india = createFormatters({ locale: 'en-IN', timeZone: 'Asia/Kolkata', currency: 'INR' });
    expect(india.number('1234567')).toBe('12,34,567');
    expect(karachi.number('1234567.891', 2)).toBe('1,234,567.89');
    expect(india.count(10_000)).toBe('10,000');
    expect(karachi.count(1_000_000)).toBe('1,000,000');
  });
});
