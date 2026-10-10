// @hims/ui — shared components and design tokens (AGENTS.md "rule of two").
// Styles: import '@hims/ui/styles.css' after '@import "tailwindcss"' in the app stylesheet.

export { cn } from './lib/cn.js';

// Theme + tokens (F0-REPO-10)
export * from './theme/tokens.js';
export * from './theme/theme-css.js';

// i18n plumbing for the kit's own strings (F0-UI-06)
export * from './i18n/messages.js';
export * from './i18n/context.js';

// Primitives
export * from './components/button.js';
export * from './components/inputs.js';
export * from './components/display.js';
export * from './components/overlays.js';
export * from './components/state-panel.js';
