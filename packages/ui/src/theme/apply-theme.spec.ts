// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { applyColorScheme, applyTenantTheme } from './theme-css.js';

// Minimal copy of the cascade in tokens.css: defaults on :root, dark set on .dark.
const BASE = ':root { --primary: #1e40af; } .dark { --primary: #60a5fa; }';

function primary(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
}

afterEach(() => {
  document.head.innerHTML = '';
  document.documentElement.className = '';
});

describe('applyTenantTheme', () => {
  it('overrides light mode without leaking the light value into dark mode', () => {
    const base = document.createElement('style');
    base.textContent = BASE;
    document.head.append(base);
    applyTenantTheme({ light: { primary: '#0f766e' } });

    applyColorScheme('light', false);
    expect(primary()).toBe('#0f766e');
    applyColorScheme('dark', false);
    expect(primary()).toBe('#60a5fa');
  });

  it('applies dark overrides only in dark mode and replaces the previous tenant', () => {
    const base = document.createElement('style');
    base.textContent = BASE;
    document.head.append(base);
    applyTenantTheme({ light: { primary: '#0f766e' }, dark: { primary: '#2dd4bf' } });
    applyTenantTheme({ dark: { primary: '#f472b6' } });

    applyColorScheme('dark', false);
    expect(primary()).toBe('#f472b6');
    applyColorScheme('light', false);
    expect(primary()).toBe('#1e40af');
  });
});
