/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" bundles the in-memory dev fixtures (dev server and E2E builds only). */
  readonly VITE_DEV_FIXTURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
