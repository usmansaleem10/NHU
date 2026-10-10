import { describe, expect, it } from 'vitest';

import { buildThemeCss } from './theme-css.js';

describe('buildThemeCss', () => {
  it('overrides only the given tokens, light on :root and dark on .dark', () => {
    const css = buildThemeCss({
      light: { primary: '#0f766e', radius: '0.75rem' },
      dark: { primary: 'oklch(0.7 0.1 180)' },
    });
    expect(css).toBe(
      ':root {\n  --primary: #0f766e;\n  --radius: 0.75rem;\n}\n.dark {\n  --primary: oklch(0.7 0.1 180);\n}',
    );
  });

  it('drops unknown tokens instead of emitting arbitrary custom properties', () => {
    const theme = JSON.parse('{"light":{"primary":"#123456","evil-token":"red"}}') as Parameters<
      typeof buildThemeCss
    >[0];
    expect(buildThemeCss(theme)).toBe(':root {\n  --primary: #123456;\n}');
  });

  it.each([
    'red; } body { display: none',
    'url(https://attacker.example/x.png)',
    '#fff</style><script>',
    'red /* comment */',
  ])('rejects unsafe value %j coming from tenant config', (value) => {
    expect(buildThemeCss({ light: { primary: value } })).toBe('');
  });
});
