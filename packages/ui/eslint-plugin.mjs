// HIMS UI lint rules (F0-REPO-10, F0-UI-06). Lives in packages/ui because these rules guard the
// UI layer; it is a candidate to move into @hims/config's shared preset (owned by tooling).
//
//   hims/no-raw-colours        hex/rgb/hsl/oklch literals and Tailwind palette classes
//                              (bg-blue-600, text-white...). Use design tokens instead.
//   hims/no-literal-ui-strings user-facing text written straight into JSX. Use i18n keys.

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe';
const COLOUR_UTILITIES =
  'bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|shadow|inset-shadow|inset-ring|accent|caret|divide|placeholder';

const RAW_COLOUR_PATTERNS = [
  { re: /(?:^|[^\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i, what: 'hex colour' },
  { re: /\b(?:rgba?|hsla?|hwb|oklab|oklch|lab|lch)\(/i, what: 'colour function' },
  {
    re: new RegExp(
      `(?:^|[\\s:'"\`!-])(?:${COLOUR_UTILITIES})-(?:(?:${PALETTE})-(?:50|[1-9]00|950)|black|white)(?:\\/\\d+)?(?![\\w-])`,
    ),
    what: 'Tailwind palette class',
  },
];

/** @param {string} text */
function findRawColour(text) {
  for (const { re, what } of RAW_COLOUR_PATTERNS) {
    const m = re.exec(text);
    if (m) return { what, match: m[0].trim() };
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const noRawColours = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow raw colour values; use design tokens (AGENTS.md "Shared UI")' },
    messages: {
      raw: 'Raw {{what}} "{{match}}" — use a design token utility (bg-primary, text-muted-foreground, ...) or a token in packages/ui/src/styles/tokens.css.',
    },
    schema: [],
  },
  create(context) {
    /** @param {import('estree').Node} node @param {string} text */
    const check = (node, text) => {
      const hit = findRawColour(text);
      if (hit) context.report({ node, messageId: 'raw', data: hit });
    };
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

const TEXT_ATTRIBUTES = new Set([
  'alt',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'label',
  'placeholder',
  'title',
]);
const HAS_LETTER = /\p{L}/u;

/** @type {import('eslint').Rule.RuleModule} */
const noLiteralUiStrings = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hard-coded user-facing strings in JSX; use i18n keys' },
    messages: {
      literal:
        'Hard-coded user-facing text "{{text}}" — use an i18n key (t(...)) so it can be translated (Urdu-ready).',
    },
    schema: [],
  },
  create(context) {
    /** @param {import('estree').Node} node @param {string} text */
    const report = (node, text) => {
      const trimmed = text.trim();
      if (trimmed && HAS_LETTER.test(trimmed)) {
        context.report({ node, messageId: 'literal', data: { text: trimmed.slice(0, 40) } });
      }
    };
    return {
      /** @param {any} node */
      JSXText(node) {
        report(node, node.value);
      },
      /** @param {any} node */
      JSXExpressionContainer(node) {
        const parentIsElement =
          node.parent?.type === 'JSXElement' || node.parent?.type === 'JSXFragment';
        if (!parentIsElement) return;
        const e = node.expression;
        if (e.type === 'Literal' && typeof e.value === 'string') report(e, e.value);
        if (e.type === 'TemplateLiteral' && e.expressions.length === 0) {
          report(e, e.quasis[0]?.value.cooked ?? '');
        }
      },
      /** @param {any} node */
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : node.name.name.name;
        if (!TEXT_ATTRIBUTES.has(name) || !node.value) return;
        const v = node.value;
        if (v.type === 'Literal' && typeof v.value === 'string') report(v, v.value);
        if (
          v.type === 'JSXExpressionContainer' &&
          v.expression.type === 'Literal' &&
          typeof v.expression.value === 'string'
        ) {
          report(v.expression, v.expression.value);
        }
      },
    };
  },
};

const plugin = {
  meta: { name: '@hims/ui/eslint-plugin', version: '0.0.0' },
  rules: { 'no-raw-colours': noRawColours, 'no-literal-ui-strings': noLiteralUiStrings },
};

export default plugin;
export { findRawColour };
