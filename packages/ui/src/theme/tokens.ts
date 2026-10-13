/**
 * Colour tokens a tenant theme may override. Mirrors the variables in styles/tokens.css; the
 * names are the CSS custom properties without the leading `--`.
 */
export const COLOR_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'border',
  'input',
  'ring',
  'overlay',
  'sidebar',
  'sidebar-foreground',
  'sidebar-muted-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

/** Non-colour tokens a tenant may override (shape and typography). */
export const SHAPE_TOKENS = ['radius', 'font-sans'] as const;
export type ShapeToken = (typeof SHAPE_TOKENS)[number];

export type ThemeToken = ColorToken | ShapeToken;
export type ThemeTokenValues = Partial<Record<ThemeToken, string>>;

/** A tenant theme: light values, optional dark values (falls back to the built-in dark set). */
export interface TenantTheme {
  light?: ThemeTokenValues;
  dark?: ThemeTokenValues;
}
