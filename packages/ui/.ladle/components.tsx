import { useEffect, type ReactNode } from 'react';

import { applyColorScheme } from '../src/theme/theme-css.js';
import './ladle.css';

// Ladle's own GlobalProvider type doesn't resolve under NodeNext, so the used props are typed here.
interface ProviderProps {
  children: ReactNode;
  globalState: { theme: string };
}

// Mirrors Ladle's theme toggle onto our `.dark` class so stories show both token sets.
export const Provider = ({ children, globalState }: ProviderProps) => {
  const dark = globalState.theme === 'dark';
  useEffect(() => {
    applyColorScheme(dark ? 'dark' : 'light', false);
  }, [dark]);
  return <div className="min-h-dvh bg-background p-4 text-foreground">{children}</div>;
};
