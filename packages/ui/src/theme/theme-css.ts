import { CSS_NAMED_COLOURS } from './named-colours.js';
import { COLOR_TOKENS, type TenantTheme, type ThemeTokenValues } from './tokens.js';

const COLOR_SET: ReadonlySet<string> = new Set(COLOR_TOKENS);

/*
 * Tenant config arrives as JSON from the API, so every value is untrusted. Each token type has
 * its own strict grammar; anything else is dropped (a bad tenant config must not break the app,
 * fetch remote resources, or escape the declaration).
 */
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FUNCTIONS: ReadonlySet<string> = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color-mix',
  'var',
]);
// No quotes, backslashes, ; { } < > — nothing that can end the declaration or the <style>.
const COLOR_CHARS = /^[\w\s#%.,()/+-]{1,200}$/;
const LENGTH = /^(?:0|\d{1,3}(?:\.\d{1,3})?(?:px|rem|em|%))$/;
const FONT_FAMILY = /^(?:[a-z][\w -]{0,40}|'[\w -]{1,40}'|"[\w -]{1,40}")$/i;

function balanced(value: string): boolean {
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

type CssSupports = (property: string, value: string) => boolean;

function engineSupports(): CssSupports | null {
  const css = (globalThis as { CSS?: { supports?: CssSupports } }).CSS;
  return css?.supports ? css.supports.bind(css) : null;
}

function isSafeColor(token: string, value: string): boolean {
  if (HEX.test(value)) return true;
  const supports = engineSupports();
  // Named colours: the real list (CSS-wide keywords like inherit/unset and currentcolor are not
  // in it, and CSS.supports would accept them), confirmed by the engine when there is one.
  if (/^[a-z]+$/i.test(value)) {
    return CSS_NAMED_COLOURS.has(value.toLowerCase()) && (supports?.('color', value) ?? true);
  }
  if (!COLOR_CHARS.test(value) || !balanced(value) || value.includes('/*')) return false;
  if (!/^[a-z-]+\(.*\)$/i.test(value)) return false;
  // Every function used, at any depth, must be a colour function (no url(), image-set(), ...).
  for (const match of value.matchAll(/([a-z-]+)\s*\(/gi)) {
    if (!COLOR_FUNCTIONS.has((match[1] ?? '').toLowerCase())) return false;
  }
  // A token referring to itself is invalid at computed-value time (and wipes the default).
  for (const match of value.matchAll(/var\(\s*--([\w-]+)/gi)) {
    if (match[1] === token) return false;
  }
  if (supports && !value.includes('var(')) return supports('color', value);
  return true;
}

function isSafeFontList(value: string): boolean {
  return value.length <= 200 && value.split(',').every((part) => FONT_FAMILY.test(part.trim()));
}

/** Validates one tenant token value against the grammar for that token's type. */
export function isSafeTokenValue(token: string, value: string): boolean {
  const v = value.trim();
  if (COLOR_SET.has(token)) return isSafeColor(token, v);
  if (token === 'radius') return LENGTH.test(v);
  if (token === 'font-sans') return isSafeFontList(v);
  return false; // unknown token
}

export const TENANT_THEME_STYLE_ID = 'hims-tenant-theme';

function declarations(values: ThemeTokenValues | undefined): string[] {
  if (!values) return [];
  const out: string[] = [];
  for (const [token, value] of Object.entries(values)) {
    if (typeof value !== 'string' || !isSafeTokenValue(token, value)) continue;
    out.push(`  --${token}: ${value.trim()};`);
  }
  return out;
}

/**
 * Builds the stylesheet that overrides the default tokens for one tenant. Light values apply
 * only in light mode (`:root:not(.dark)`) and dark values only in dark mode (`:root.dark`), so a
 * tenant that brands light mode never leaks its light colours into dark mode. Both selectors
 * outrank the defaults in tokens.css; anything not overridden keeps the built-in value.
 */
export function buildThemeCss(theme: TenantTheme): string {
  const blocks: string[] = [];
  const light = declarations(theme.light);
  const dark = declarations(theme.dark);
  if (light.length > 0) blocks.push(`:root:not(.dark) {\n${light.join('\n')}\n}`);
  if (dark.length > 0) blocks.push(`:root.dark {\n${dark.join('\n')}\n}`);
  return blocks.join('\n');
}

/** Injects (or replaces) the tenant theme stylesheet. Call again on tenant switch. */
export function applyTenantTheme(theme: TenantTheme, doc: Document = document): void {
  let style = doc.getElementById(TENANT_THEME_STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = TENANT_THEME_STYLE_ID;
    doc.head.append(style);
  }
  style.textContent = buildThemeCss(theme);
}

export type ColorScheme = 'light' | 'dark' | 'system';

/** Resolves and applies the colour scheme by toggling the `dark` class on <html>. */
export function applyColorScheme(
  scheme: ColorScheme,
  prefersDark: boolean,
  root: HTMLElement = document.documentElement,
): 'light' | 'dark' {
  const resolved = scheme === 'system' ? (prefersDark ? 'dark' : 'light') : scheme;
  root.classList.toggle('dark', resolved === 'dark');
  return resolved;
}
