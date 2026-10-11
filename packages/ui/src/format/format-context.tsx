import { createContext, useContext, type ReactNode } from 'react';

import { createFormatters, type Formatters } from './formatters.js';

const FormatContext = createContext<Formatters | null>(null);

export function FormatProvider({ value, children }: { value: Formatters; children: ReactNode }) {
  return <FormatContext value={value}>{children}</FormatContext>;
}

// Used only when no provider is mounted (stories, isolated tests).
let fallback: Formatters | undefined;

export function useFormatters(): Formatters {
  const ctx = useContext(FormatContext);
  if (ctx) return ctx;
  fallback ??= createFormatters({ locale: 'en-PK', timeZone: 'Asia/Karachi', currency: 'PKR' });
  return fallback;
}
