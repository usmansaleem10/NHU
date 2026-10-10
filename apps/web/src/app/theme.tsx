import { applyColorScheme, type ColorScheme } from '@hims/ui';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const KEY = 'hims.colorScheme';

function stored(): ColorScheme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

type Ctx = [ColorScheme, (s: ColorScheme) => void];
const ColorSchemeContext = createContext<Ctx | null>(null);

/** Light/dark/system preference, persisted per browser (a UI preference, not user data). */
export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<ColorScheme>(stored);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      applyColorScheme(scheme, media.matches);
    };
    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [scheme]);

  const set = (s: ColorScheme) => {
    setScheme(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {
      // storage blocked: preference lasts for this page only
    }
  };

  return <ColorSchemeContext value={[scheme, set]}>{children}</ColorSchemeContext>;
}

export function useColorScheme(): Ctx {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) throw new Error('useColorScheme() outside <ColorSchemeProvider>');
  return ctx;
}
