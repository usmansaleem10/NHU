import { UiI18nProvider, type UiTranslate } from '@hims/ui';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** i18next's typed `t` only accepts literal keys; these lookups are dynamic by design. */
type DynamicT = (key: string, options?: Record<string, unknown>) => string;

/**
 * Feeds the app's i18next instance to @hims/ui: the kit's own strings come from the `ui`
 * namespace, and messages from Zod schemas or the server (which are i18n keys or plain text)
 * resolve through the app catalogue, falling back to the text itself.
 */
export function UiBridge({ children }: { children: ReactNode }) {
  // Subscribing re-renders the tree (and so every kit string) on language change.
  const { i18n } = useTranslation();
  const language = i18n.language;
  const translate = i18n.t.bind(i18n) as unknown as DynamicT;

  const t = useCallback<UiTranslate>(
    (key, vars) => translate(key, { ...vars, ns: 'ui', lng: language }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `translate` is stable per i18n instance; language drives updates
    [language, i18n],
  );
  const resolveMessage = useCallback(
    (message: string) =>
      i18n.exists(message, { ns: 'app' })
        ? translate(message, { ns: 'app', lng: language })
        : message,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
    [language, i18n],
  );

  return (
    <UiI18nProvider t={t} resolveMessage={resolveMessage}>
      {children}
    </UiI18nProvider>
  );
}
