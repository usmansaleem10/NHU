import type { ESLint } from 'eslint';

declare const plugin: ESLint.Plugin & {
  rules: Record<'no-raw-colours' | 'no-literal-ui-strings', import('eslint').Rule.RuleModule>;
};
export default plugin;
export declare function findRawColour(text: string): { what: string; match: string } | null;
