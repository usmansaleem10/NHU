import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { interpolate, uiMessagesEn, type UiMessageKey } from './messages.js';

export type UiTranslate = (
  key: UiMessageKey,
  vars?: Readonly<Record<string, string | number>>,
) => string;

export interface UiI18n {
  /** Translates the ui package's own messages. */
  t: UiTranslate;
  /**
   * Resolves a message that came from elsewhere (a Zod schema message key, a server error code)
   * into display text. Apps pass their i18n lookup; the default returns the text unchanged.
   */
  resolveMessage: (message: string) => string;
}

const defaultI18n: UiI18n = {
  t: (key, vars) => interpolate(uiMessagesEn[key], vars),
  resolveMessage: (message) => message,
};

const UiI18nContext = createContext<UiI18n>(defaultI18n);

export function UiI18nProvider({
  t,
  resolveMessage,
  children,
}: {
  t: UiTranslate;
  resolveMessage?: (message: string) => string;
  children: ReactNode;
}) {
  const value = useMemo<UiI18n>(
    () => ({ t, resolveMessage: resolveMessage ?? defaultI18n.resolveMessage }),
    [t, resolveMessage],
  );
  return <UiI18nContext value={value}>{children}</UiI18nContext>;
}

export function useUiI18n(): UiI18n {
  return useContext(UiI18nContext);
}
