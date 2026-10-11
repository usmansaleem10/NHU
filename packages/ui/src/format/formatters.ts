/**
 * Tenant-aware formatting (F0-UI-06). Settings come from tenant config (F0-TEN); the app builds one
 * Formatters object per tenant + language and provides it through <FormatProvider>.
 *
 * Money is a decimal STRING end to end (AGENTS.md rule 9: never JS number); Intl formats the
 * string directly, so no precision is lost. Instants are UTC ISO strings rendered in the tenant
 * time zone; date-only values ("2026-10-10") are calendar dates and never shift across zones.
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
}

export interface Formatters {
  readonly settings: TenantFormatSettings;
  number: (value: number | DecimalString, fractionDigits?: number) => string;
  currency: (amount: DecimalString) => string;
  date: (value: string | Date) => string;
  dateTime: (value: string | Date) => string;
  time: (value: string | Date) => string;
}

/** A decimal number as a string ("1234.50", "-0.5"), as money travels over the wire. */
export type DecimalString = string;

const DECIMAL = /^-?\d+(\.\d+)?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class FormatError extends Error {
  override readonly name = 'FormatError';
}

function assertDecimal(value: string): asserts value is Intl.StringNumericLiteral {
  if (!DECIMAL.test(value)) throw new FormatError(`Not a decimal string: ${value}`);
}

function toDate(value: string | Date): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new FormatError(`Invalid date: ${String(value)}`);
  return d;
}

export function createFormatters(settings: TenantFormatSettings): Formatters {
  const { locale, timeZone, currency, dateStyle = 'medium', hour12, currencyDigits = 2 } = settings;
  const hourOpt = hour12 === undefined ? {} : { hour12 };

  const currencyFmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currencyDigits,
    maximumFractionDigits: currencyDigits,
  });
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

  return {
    settings,
    number(value, fractionDigits) {
      let fmt = numberFmts.get(fractionDigits);
      if (!fmt) {
        fmt = new Intl.NumberFormat(
          locale,
          fractionDigits === undefined
            ? {}
            : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits },
        );
        numberFmts.set(fractionDigits, fmt);
      }
      if (typeof value === 'number') return fmt.format(value);
      assertDecimal(value);
      return fmt.format(value);
    },
    currency(amount) {
      assertDecimal(amount);
      return currencyFmt.format(amount);
    },
    date(value) {
      if (typeof value === 'string' && DATE_ONLY.test(value)) {
        return calendarDateFmt.format(toDate(`${value}T00:00:00Z`));
      }
      return dateFmt.format(toDate(value));
    },
    dateTime(value) {
      return dateTimeFmt.format(toDate(value));
    },
    time(value) {
      return timeFmt.format(toDate(value));
    },
  };
}
