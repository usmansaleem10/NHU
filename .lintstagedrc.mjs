// Typed lint rules need the shared packages' dist/*.d.ts; turbo makes the build a cache hit.
const quote = (files) => files.map((f) => JSON.stringify(f)).join(' ');

export default {
  '*.{ts,tsx}': (files) => [
    'turbo run build --filter=./packages/* --output-logs=errors-only',
    `eslint --fix --max-warnings=0 --no-warn-ignored ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  '*.{js,mjs,cjs}': (files) => [
    `eslint --fix --max-warnings=0 --no-warn-ignored ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  '*.{json,yaml,yml,css}': (files) => `prettier --write ${quote(files)}`,
};
