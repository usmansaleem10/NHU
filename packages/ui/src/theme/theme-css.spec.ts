import { describe, expect, it, vi } from 'vitest';

import { buildThemeCss, isSafeTokenValue } from './theme-css.js';

describe('buildThemeCss', () => {
  it('scopes light overrides to light mode and dark overrides to dark mode', () => {
    const css = buildThemeCss({
      light: { primary: '#0f766e', radius: '0.75rem' },
      dark: { primary: 'oklch(0.7 0.1 180)' },
    });
    expect(css).toBe(
      ':root:not(.dark) {\n  --primary: #0f766e;\n  --radius: 0.75rem;\n}\n:root.dark {\n  --primary: oklch(0.7 0.1 180);\n}',
    );
  });

  it('drops unknown tokens instead of emitting arbitrary custom properties', () => {
    const theme = JSON.parse('{"light":{"primary":"#123456","evil-token":"red"}}') as Parameters<
      typeof buildThemeCss
    >[0];
    expect(buildThemeCss(theme)).toBe(':root:not(.dark) {\n  --primary: #123456;\n}');
  });
});

describe('isSafeTokenValue', () => {
  it.each([
    ['primary', '#0f766e'],
    ['primary', '#0f766eaa'],
    ['primary', 'teal'],
    ['primary', 'rgb(15 118 110)'],
    ['primary', 'rgb(15 118 110 / 0.5)'],
    ['primary', 'hsl(174 77% 26%)'],
    ['primary', 'oklch(0.55 0.1 180)'],
    ['primary', 'color-mix(in oklch, teal 80%, white)'],
    ['primary', 'var(--accent)'],
    ['radius', '0.75rem'],
    ['radius', '6px'],
    ['radius', '0'],
    ['font-sans', "'Noto Nastaliq Urdu', system-ui, sans-serif"],
    ['font-sans', 'Inter, "Segoe UI", sans-serif'],
  ] as const)('accepts %s = %j', (token, value) => {
    expect(isSafeTokenValue(token, value)).toBe(true);
  });

  it.each([
    ['primary', 'rgb(', 'unterminated function'],
    ['primary', '"x', 'quote in a colour'],
    ['primary', "'red'", 'quoted colour'],
    ['primary', 'image-set(url(x.png) 1x)', 'function outside the allow-list'],
    ['primary', 'url(https://attacker.example/x.png)', 'external fetch'],
    ['primary', 'red\\;', 'backslash escape'],
    ['primary', 'red; } body { display: none', 'declaration break-out'],
    ['primary', '#fff</style><script>', 'markup'],
    ['primary', 'red /* c */', 'comment'],
    ['primary', 'expression(alert(1))', 'legacy IE expression'],
    ['radius', '1rem; color: red', 'radius break-out'],
    ['radius', 'calc(1px + 1px)', 'radius function'],
    ['font-sans', 'url(x), sans-serif', 'font with parentheses'],
    ['font-sans', 'Inter\\, x', 'font with backslash'],
    ['font-sans', '"Inter', 'unbalanced font quote'],
    ['primary', 'notacolor', 'unknown named colour'],
    ['primary', 'banana', 'unknown named colour'],
    ['primary', 'inherit', 'CSS-wide keyword'],
    ['primary', 'initial', 'CSS-wide keyword'],
    ['primary', 'unset', 'CSS-wide keyword'],
    ['primary', 'revert', 'CSS-wide keyword'],
    ['primary', 'revert-layer', 'CSS-wide keyword'],
    ['primary', 'currentColor', 'currentcolor (depends on context, not a brand colour)'],
    ['primary', 'var(--primary)', 'self-reference (invalid at computed time)'],
    ['primary', 'color-mix(in oklch, var(--primary) 80%, white)', 'nested self-reference'],
  ] as const)('rejects %s = %j (%s)', (token, value, why) => {
    expect(isSafeTokenValue(token, value), why).toBe(false);
    expect(buildThemeCss({ light: { [token]: value } })).toBe('');
  });

  it('defers to the browser engine for named colours when CSS.supports exists', () => {
    const supports = vi.fn<(p: string, v: string) => boolean>(() => false);
    vi.stubGlobal('CSS', { supports });
    try {
      expect(isSafeTokenValue('primary', 'teal')).toBe(false);
      expect(supports).toHaveBeenCalledWith('color', 'teal');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
