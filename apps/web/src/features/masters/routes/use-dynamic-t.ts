import { useTranslation } from 'react-i18next';

type DynamicT = (key: string, options?: Record<string, unknown>) => string;

/**
 * Lookup for keys built at runtime from metadata (masters.<id>.title). i18next's typed `t` only
 * accepts literal keys, so this narrow escape hatch is confined to the generator.
 */
export function useDynamicT() {
  const { i18n } = useTranslation();
  const t = i18n.t.bind(i18n) as unknown as DynamicT;
  return (key: string, fallback?: string, vars?: Record<string, unknown>) =>
    t(key, { ...vars, ...(fallback === undefined ? {} : { defaultValue: fallback }) });
}
