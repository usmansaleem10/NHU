/**
 * English app catalogue (source of truth for keys). Flat dotted keys; i18next runs with
 * `keySeparator: false`. Urdu lives in ur.ts and may lag: missing keys fall back to English.
 */
export const en = {
  'app.name': 'HIMS',
  'app.skipToContent': 'Skip to main content',
  'app.loadingScreen': 'Loading screen…',
  'app.notFoundTitle': 'Page not found',
  'app.notFoundBody': 'The page you opened does not exist or has moved.',
  'app.goHome': 'Go to home',
  'app.crashTitle': 'The application hit an unexpected error',
  'app.crashBody':
    'Reload the page. If it keeps happening, contact support with the time it occurred.',
  'app.reload': 'Reload',

  'shell.navLabel': 'Main navigation',
  'shell.openNav': 'Open navigation',
  'shell.branch': 'Branch',
  'shell.branchSwitcher': 'Branch: {{branch}}. Change branch',
  'shell.userMenu': 'Account menu',
  'shell.theme': 'Theme',
  'shell.themeLight': 'Light',
  'shell.themeDark': 'Dark',
  'shell.themeSystem': 'Match system',
  'shell.signOut': 'Sign out',

  'nav.group.general': 'General',
  'nav.home': 'Home',

  'home.title': 'Home',
  'home.welcome': 'Welcome, {{name}}',
  'home.subtitle': 'Your starting point for today’s work.',
  'home.foundationTitle': 'Frontend foundation',
  'home.foundationBody': 'Phase 0 building blocks. Each card opens a working reference screen.',
} as const;

export type AppMessageKey = keyof typeof en;
export type AppMessages = Record<AppMessageKey, string>;
