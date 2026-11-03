// Ladle component catalogue (F0-REPO-10). Chosen over Storybook: one dev dependency, Vite-native,
// React 19 compatible, builds a static catalogue in seconds. `pnpm --filter @hims/ui catalogue`.
/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'src/**/*.stories.tsx',
  viteConfig: '.ladle/vite.config.mjs',
  outDir: 'dist/catalogue',
};
