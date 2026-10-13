import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2023',
    // Maps are generated for error reporting but not referenced from the shipped JS.
    sourcemap: 'hidden',
    // The initial-JS budget (250 KB gz) is enforced by scripts/check-bundle-size.mjs.
    chunkSizeWarningLimit: 600,
  },
});
