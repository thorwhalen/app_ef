/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the app_ef backend (qh-over-EfService). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
