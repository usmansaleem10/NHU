// HIMS UI lint rules (F0-REPO-10, F0-UI-06). Lives in packages/ui because these rules guard the
// UI layer; it is a candidate to move into @hims/config's shared preset (owned by tooling).
//
//   hims/no-raw-colours        hex/rgb/hsl/oklch/color-mix literals, named colours in style
//                              values and Tailwind palette/arbitrary classes. Use design tokens.
//   hims/no-literal-ui-strings user-facing text written straight into JSX. Use i18n keys.

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe';
const COLOUR_UTILITIES =
  'bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|shadow|inset-shadow|inset-ring|accent|caret|divide|placeholder';

// CSS named colours (CSS Color 4), minus keywords that are not colours of their own.
const NAMED_COLOURS =
  'aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen';
const NAMED_WORD = new RegExp(`(?:^|[\\s(,])(?:${NAMED_COLOURS})(?=$|[\\s),])`, 'i');

const RAW_COLOUR_PATTERNS = [
  { re: /(?:^|[^\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i, what: 'hex colour' },
  { re: /\b(?:rgba?|hsla?|hwb|oklab|oklch|lab|lch|color-mix|color)\(/i, what: 'colour function' },
  {
    re: new RegExp(
      `(?:^|[\\s:'"\`!-])(?:${COLOUR_UTILITIES})-(?:(?:${PALETTE})-(?:50|[1-9]00|950)|black|white)(?:\\/\\d+)?(?![\\w-])`,
    ),
    what: 'Tailwind palette class',
  },
  {
    re: new RegExp(`(?:${COLOUR_UTILITIES})-\\[(?:${NAMED_COLOURS})\\]`, 'i'),
    what: 'Tailwind arbitrary colour',
  },
];

/** @param {string} text */
function findRawColour(text) {
  for (const { re, what } of RAW_COLOUR_PATTERNS) {
    const m = re.exec(text);
    if (m) return { what, match: m[0].replace(/^[^#a-z0-9]+/i, '') };
  }
  return null;
}

/** Named colour inside a value that is known to be a colour (style prop / SVG paint attribute). */
/** @param {string} text */
function findNamedColour(text) {
  const m = NAMED_WORD.exec(text);
  return m ? { what: 'named colour', match: m[0].trim().replace(/^[(,]/, '') } : null;
}

// Style object keys and JSX attributes whose values are colours.
const COLOUR_PROPERTY = /^(?:color|background|fill|stroke|border|outline)$|colou?r$/i;
const COLOUR_ATTRIBUTES = new Set([
  'color',
  'fill',
  'stroke',
  'stopColor',
  'stop-color',
  'floodColor',
  'lightingColor',
]);

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
    /** @param {import('estree').Node} node @param {{what: string, match: string} | null} hit */
    const report = (node, hit) => {
      if (hit) context.report({ node, messageId: 'raw', data: hit });
    };
    /** @param {any} node */
    const stringOf = (node) => {
      if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
      if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked ?? '';
      }
      if (node?.type === 'JSXExpressionContainer') return stringOf(node.expression);
      return null;
    };
    return {
      /** @param {any} node */
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const hit = findRawColour(node.value);
        if (hit) return report(node, hit);
        // Named colours only count where the value IS a colour, so prose like "Red Crescent"
        // elsewhere is fine.
        const parent = node.parent;
        const inColourProp =
          parent?.type === 'Property' &&
          parent.value === node &&
          COLOUR_PROPERTY.test(parent.key?.name ?? parent.key?.value ?? '');
        if (inColourProp) report(node, findNamedColour(node.value));
      },
      /** @param {any} node */
      TemplateElement(node) {
        report(node, findRawColour(node.value.cooked ?? node.value.raw));
      },
      /** @param {any} node */
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : '';
        if (!COLOUR_ATTRIBUTES.has(name)) return;
        const value = stringOf(node.value);
        if (value !== null && !findRawColour(value)) report(node.value, findNamedColour(value));
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
  'caption',
  'description',
  'emptyText',
  'header',
  'label',
  'placeholder',
  'subtitle',
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
    /**
     * Reports string literals that would be rendered as text: directly, as either branch of a
     * conditional, as a fallback in `a || 'x'` / `a ?? 'x'` / `a && 'x'`, or in a template's
     * static parts. Function calls (t('key')) and other expressions are left alone.
     * @param {any} e
     */
    const checkRendered = (e) => {
      if (!e) return;
      if (e.type === 'Literal' && typeof e.value === 'string') report(e, e.value);
      else if (e.type === 'TemplateLiteral') {
        report(e, e.quasis.map((q) => q.value.cooked ?? '').join(' '));
      } else if (e.type === 'ConditionalExpression') {
        checkRendered(e.consequent);
        checkRendered(e.alternate);
      } else if (e.type === 'LogicalExpression') {
        checkRendered(e.left);
        checkRendered(e.right);
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
        if (parentIsElement) checkRendered(node.expression);
      },
      /** @param {any} node */
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : node.name.name.name;
        if (!TEXT_ATTRIBUTES.has(name) || !node.value) return;
        const v = node.value;
        if (v.type === 'Literal' && typeof v.value === 'string') report(v, v.value);
        if (v.type === 'JSXExpressionContainer') checkRendered(v.expression);
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
