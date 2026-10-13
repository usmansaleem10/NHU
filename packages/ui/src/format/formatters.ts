/**
 * Tenant-aware formatting (F0-UI-06). Settings come from tenant config (F0-TEN); the app builds one
 * Formatters object per tenant + language and provides it through <FormatProvider>.
 *
 * Money is a decimal STRING (or bigint) end to end (AGENTS.md rule 9: never JS number); Intl
 * formats the string directly, so no precision is lost. Instants are UTC ISO strings rendered in
 * the tenant time zone; date-only values ("2026-10-10") never shift across zones.
 *
 * Formatters run inside table cells and render paths, so they never throw: an invalid value
 * renders INVALID_PLACEHOLDER and is reported (one bad row must not take down a screen).
 */
export interface TenantFormatSettings {
  /** BCP-47 locale for numbers/dates, e.g. "en-PK" or "ur-PK". */
  locale: string;
  /** IANA time zone, e.g. "Asia/Karachi". */
  timeZone: string;
  /** ISO 4217 code, e.g. "PKR". */
  currency: string;
  dateStyle?: 'short' | 'medium' | 'long';
  hour12?: boolean;
  /**
   * Fraction digits for money. Defaults to 2 to match numeric(14,2): ICU's own default for PKR is
   * 0, which would silently round paisa away on invoices.
   */
  currencyDigits?: number;
  /** Receives invalid-value errors (observability hook). Defaults to console.warn. */
  report?: (error: FormatError) => void;
}

/** A decimal number as a string ("1234.50", "-0.5"), as money travels over the wire. */
export type DecimalString = string;

export interface Formatters {
  readonly settings: TenantFormatSettings;
  /** Decimal quantity (dose, weight, rate) from a decimal string or bigint. */
  number: (value: DecimalString | bigint, fractionDigits?: number) => string;
  /** Whole counts the UI computes itself: rows, pages, totals. */
  count: (value: number) => string;
  /** Money: decimal string or bigint only, never a JS float. */
  currency: (amount: DecimalString | bigint) => string;
  date: (value: string | Date) => string;
  dateTime: (value: string | Date) => string;
  time: (value: string | Date) => string;
}

export const INVALID_PLACEHOLDER = '—';

const DECIMAL = /^-?\d+(\.\d+)?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class FormatError extends Error {
  override readonly name = 'FormatError';
}

const isDecimal = (value: string): value is Intl.StringNumericLiteral => DECIMAL.test(value);

function toDate(value: string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function createFormatters(settings: TenantFormatSettings): Formatters {
  const {
    locale,
    timeZone,
    currency,
    dateStyle = 'medium',
    hour12,
    currencyDigits = 2,
    report = (error: FormatError) => {
      // The message names the kind of value only, never the value (it may be personal data).
      console.warn(error.message);
    },
  } = settings;
  const hourOpt = hour12 === undefined ? {} : { hour12 };

  const invalid = (kind: string): string => {
    report(new FormatError(`Cannot format invalid ${kind}`));
    return INVALID_PLACEHOLDER;
  };

  const currencyFmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currencyDigits,
    maximumFractionDigits: currencyDigits,
    // "-0.001" rounds to 0.00: show "Rs 0.00", never "-Rs 0.00".
    signDisplay: 'negative',
  });
  const countFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle, timeZone });
  // Date-only values are rendered in UTC so "2026-10-10" stays the 10th in every zone.
  const calendarDateFmt = new Intl.DateTimeFormat(locale, { dateStyle, timeZone: 'UTC' });
  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeStyle: 'short',
    timeZone,
    ...hourOpt,
  });
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone, ...hourOpt });
  const numberFmts = new Map<number | undefined, Intl.NumberFormat>();

  const formatDate = (fmt: Intl.DateTimeFormat, value: string | Date, kind: string) => {
    const d = toDate(value);
    return d ? fmt.format(d) : invalid(kind);
  };

  return {
    settings,
    number(value, fractionDigits) {
      let fmt = numberFmts.get(fractionDigits);
      if (!fmt) {
        fmt = new Intl.NumberFormat(
          locale,
          fractionDigits === undefined
            ? { signDisplay: 'negative' }
            : {
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits,
                signDisplay: 'negative',
              },
        );
        numberFmts.set(fractionDigits, fmt);
      }
      if (typeof value === 'bigint') return fmt.format(value);
      return isDecimal(value) ? fmt.format(value) : invalid('number');
    },
    count(value) {
      return Number.isFinite(value) ? countFmt.format(value) : invalid('count');
    },
    currency(amount) {
      if (typeof amount === 'bigint') return currencyFmt.format(amount);
      return isDecimal(amount) ? currencyFmt.format(amount) : invalid('amount');
    },
    date(value) {
      if (typeof value === 'string' && DATE_ONLY.test(value)) {
        return formatDate(calendarDateFmt, `${value}T00:00:00Z`, 'date');
      }
      return formatDate(dateFmt, value, 'date');
    },
    dateTime(value) {
      return formatDate(dateTimeFmt, value, 'date-time');
    },
    time(value) {
      return formatDate(timeFmt, value, 'time');
    },
  };
}
