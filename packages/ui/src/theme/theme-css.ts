import { COLOR_TOKENS, SHAPE_TOKENS, type TenantTheme, type ThemeTokenValues } from './tokens.js';

const KNOWN_TOKENS: ReadonlySet<string> = new Set([...COLOR_TOKENS, ...SHAPE_TOKENS]);

// Tenant config arrives as JSON from the API, so values are untrusted: allow only characters a
// colour, length or font list needs. No `;{}<>\` (breaking out of the declaration) and no url().
const SAFE_VALUE = /^[\w\s#%.,()/'"+-]{1,200}$/;
const FORBIDDEN_VALUE = /url\(|expression\(|\/\*/i;

export const TENANT_THEME_STYLE_ID = 'hims-tenant-theme';

function declarations(values: ThemeTokenValues | undefined): string[] {
  if (!values) return [];
  const out: string[] = [];
  for (const [token, value] of Object.entries(values)) {
    // Unknown keys and unsafe values are dropped: a bad tenant config must not break the app.
    if (!KNOWN_TOKENS.has(token) || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!SAFE_VALUE.test(trimmed) || FORBIDDEN_VALUE.test(trimmed)) continue;
    out.push(`  --${token}: ${trimmed};`);
  }
  return out;
}

/**
 * Builds the stylesheet that overrides the default tokens for one tenant. Light values go on
 * `:root`, dark values on `.dark`; anything not overridden keeps the built-in default.
 */
export function buildThemeCss(theme: TenantTheme): string {
  const blocks: string[] = [];
  const light = declarations(theme.light);
  const dark = declarations(theme.dark);
  if (light.length > 0) blocks.push(`:root {\n${light.join('\n')}\n}`);
  if (dark.length > 0) blocks.push(`.dark {\n${dark.join('\n')}\n}`);
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
